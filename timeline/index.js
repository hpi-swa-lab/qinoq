import { pt } from 'lively.graphics';
import { VerticalLayout, Morph } from 'lively.morphic';
import { TimelineCursor } from './cursor.js';
import { connect, disconnect } from 'lively.bindings';
import { TimelineSequence } from './sequence.js';
import { GlobalTimelineLayer, OverviewSequenceTimelineLayer, SequenceTimelineLayer } from './layer.js';
import { TimelineKeyframe, KeyframeLine } from './keyframe.js';
import { CONSTANTS } from './constants.js';
import { TimelineLayerInfo } from './layer-info.js';
import { COLOR_SCHEME } from '../colors.js';
import { arr } from 'lively.lang';

import { singleSelectKeyPressed, zoomKeyPressed } from '../keys.js';
import { Sequence, Keyframe } from '../index.js';
import { getColorForProperty } from '../properties.js';
import { EasingSelection } from '../components/easing-selection.js';
import { QinoqMorph } from '../qinoq-morph.js';

export class Timeline extends QinoqMorph {
  static get properties () {
    return {
      ui: {
        initialize () {
          this.ui = {};
        }
      },
      interactive: {},
      _editor: {
        after: ['ui'],
        set (editor) {
          this.setProperty('_editor', editor);
          if (this._deserializing) return;
          this.initialize();
        }
      },
      clipMode: {
        defaultValue: 'hidden'
      },
      zoomFactor: {
        defaultValue: 1,
        type: 'Number',
        isFloat: true,
        min: 0,
        set (zoomFactor) {
          if (zoomFactor <= 0) return;
          // when a connection is removed, it is triggered one last time
          // this happens when grabbing the interactive out of the editor
          // at this time another undo (for the grab) is also recorded
          // this needs to be catched here, otherwise an error will be triggered
          if (!this._deserializing && !this.undoStart('interactive-editor-change-zoom')) return;
          this.setProperty('zoomFactor', zoomFactor);
          if (this._deserializing) return;
          this.undoStop('interactive-editor-change-zoom');
          if (!this.editor.interactive) return;
          this.redraw();
        }
      },
      _activeAreaWidth: {
        defaultValue: CONSTANTS.IN_EDIT_MODE_SEQUENCE_WIDTH,
        set (width) {
          this.setProperty('_activeAreaWidth', width);
          if (this._deserializing) return;
          this.onActiveAreaWidthChange();
        }
      }
    };
  }

  get editor () {
    return this._editor;
  }

  // Is automatically called by editor setter
  initialize () {
    this.ui.scrollableContainer = new Morph(
      {
        name: 'scrollable container',
        extent: pt(this.extent.x, this.extent.y - CONSTANTS.VERTICAL_SCROLLBAR_HEIGHT),
        clipMode: 'auto'
      });
    this.addMorph(this.ui.scrollableContainer);
    this.initializeLayerInfoContainer();

    this.initializeLayerContainer();
    connect(this.ui.layerContainer, 'extent', this.ui.scrollableContainer, 'height', { converter: ' (extent) => extent.y > timeline.height - scrollbarHeight ? timeline.height - scrollbarHeight : extent.y', varMapping: { timeline: this, scrollbarHeight: CONSTANTS.VERTICAL_SCROLLBAR_HEIGHT } }).update(this.ui.layerContainer.extent);
    this.initializeScrollBar();
  }

  relayout (newWindowExtent) {
    this.ui.scrollableContainer.extent = pt(newWindowExtent.x, this.owner.extent.y - CONSTANTS.VERTICAL_SCROLLBAR_HEIGHT);
    this.ui.layerContainer.extent = pt(newWindowExtent.x - this.scrollbarOffset.x - CONSTANTS.LAYER_INFO_WIDTH, this.owner.extent.y - CONSTANTS.VERTICAL_SCROLLBAR_HEIGHT);
    this.ui.scrollBar.extent = pt(newWindowExtent.x - this.scrollbarOffset.x - CONSTANTS.LAYER_INFO_WIDTH, this.ui.scrollBar.extent.y);
    this.ui.scrollBar.position = this.ui.layerContainer.bottomLeft;
  }

  initializeScrollBar () {
    this.ui.scrollBar = new Morph({
      name: 'scrollbar',
      position: pt(CONSTANTS.LAYER_INFO_WIDTH, this.height - CONSTANTS.VERTICAL_SCROLLBAR_HEIGHT),
      extent: pt(this.width - CONSTANTS.LAYER_INFO_WIDTH - this.scrollbarOffset.x, CONSTANTS.VERTICAL_SCROLLBAR_HEIGHT),
      fill: COLOR_SCHEME.TRANSPARENT,
      borderColor: COLOR_SCHEME.BACKGROUND_VARIANT,
      borderWidth: 1,
      borderRadius: 10
    });
    this.initializeScrollbarScroller();
    this.initializeScrollbarCursorIndicator();
    this.addMorph(this.ui.scrollBar);
  }

  initializeScrollbarScroller () {
    this.ui.scroller = this.ui.scrollBar.addMorph(new Morph({
      name: 'scroller',
      fill: COLOR_SCHEME.BACKGROUND_VARIANT,
      position: pt(CONSTANTS.SCROLLBAR_MARGIN, CONSTANTS.SCROLLBAR_MARGIN),
      extent: pt(0, CONSTANTS.VERTICAL_SCROLLBAR_HEIGHT - (2 * CONSTANTS.SCROLLBAR_MARGIN)),
      borderRadius: 10,
      draggable: true
    }));

    this.ui.scroller.ensureValidPosition = () => {
      let positionX = this.ui.scroller.position.x;
      if (this.ui.scroller.position.x < CONSTANTS.SCROLLBAR_MARGIN) {
        positionX = CONSTANTS.SCROLLBAR_MARGIN;
      }
      if (this.ui.scroller.extent.x + this.ui.scroller.position.x + CONSTANTS.SCROLLBAR_MARGIN > this.ui.scrollBar.extent.x) {
        positionX = this.ui.scrollBar.extent.x - CONSTANTS.SCROLLBAR_MARGIN - this.ui.scroller.extent.x;
      }
      this.ui.scroller.position = pt(positionX, CONSTANTS.SCROLLBAR_MARGIN);

      const relative = (this.ui.layerContainer.scrollExtent.x - this.ui.layerContainer.extent.x - this.ui.layerContainer.scrollbarOffset.x) / (this.ui.scrollBar.extent.x - this.ui.scroller.extent.x - (2 * CONSTANTS.SCROLLBAR_MARGIN));
      const layerContainerNode = this.ui.layerContainer.env.renderer.getNodeForMorph(this.ui.layerContainer);
      layerContainerNode.scrollLeft = this.ui.scroller.position.x * relative + CONSTANTS.SCROLLBAR_MARGIN;
      this.ui.layerContainer.setProperty('scroll', pt(layerContainerNode.scrollLeft, layerContainerNode.scrollTop));
    };

    connect(this.ui.scroller, 'onDrag', this.ui.scroller, 'ensureValidPosition');
  }

  initializeScrollbarCursorIndicator () {
    this.ui.scrollbarCursor = this.ui.scrollBar.addMorph(new Morph({
      name: 'scrollbar cursor',
      fill: COLOR_SCHEME.SECONDARY,
      position: pt(0, 0),
      extent: pt(10, CONSTANTS.VERTICAL_SCROLLBAR_HEIGHT - (2 * CONSTANTS.SCROLLBAR_MARGIN)),
      borderRadius: 10
    }));

    connect(this.editor, 'interactiveScrollPosition', this.ui.scrollbarCursor, 'position', {
      converter: `(scrollPosition) => {
      return pt(
        (source.displayedTimeline.getPositionFromScroll(scrollPosition) - initialXOffset) * (scrollbar.width - (2 * scrollbarMargin + target.extent.x)) / source.displayedTimeline._activeAreaWidth + scrollbarMargin, 
        scrollbarMargin)
    }`,
      varMapping: { pt: pt, scrollbar: this.ui.scrollBar, scrollbarMargin: CONSTANTS.SCROLLBAR_MARGIN, initialXOffset: CONSTANTS.SEQUENCE_INITIAL_X_OFFSET }
    });
  }

  initializeCursor () {
    this.ui.cursor = new TimelineCursor({ displayValue: 0 });
    this.ui.layerContainer.addMorph(this.ui.cursor);
    this.ui.cursor.location = this.getPositionFromScroll(0);
    this.ui.cursor.height = this.ui.layerContainer.height;
  }

  initializeLayerContainer () {
    this.ui.layerContainer = new Morph({
      name: 'layer container',
      clipMode: 'hidden',
      position: pt(CONSTANTS.LAYER_INFO_WIDTH, 0),
      extent: pt(this.width - CONSTANTS.LAYER_INFO_WIDTH - this.scrollbarOffset.x, this.height - CONSTANTS.VERTICAL_SCROLLBAR_HEIGHT),
      layout: new VerticalLayout({
        spacing: 2,
        resizeSubmorphs: true,
        autoResize: true,
        orderByIndex: true
      })
    });

    this.ui.layerContainer.onMouseWheel = (event) => {
      const updateScrollerPosition = () => {
        const relative = (this.ui.scrollBar.extent.x - this.ui.scroller.extent.x - (2 * CONSTANTS.SCROLLBAR_MARGIN)) / (this.ui.layerContainer.scrollExtent.x - this.ui.layerContainer.extent.x - this.ui.layerContainer.scrollbarOffset.x);
        this.ui.scroller.position = pt(this.ui.layerContainer.scroll.x * relative + CONSTANTS.SCROLLBAR_MARGIN, CONSTANTS.SCROLLBAR_MARGIN);
      };
      if (singleSelectKeyPressed(event)) {
        const layerContainerNode = this.ui.scrollableContainer.env.renderer.getNodeForMorph(this.ui.layerContainer);
        layerContainerNode.scrollLeft = layerContainerNode.scrollLeft + event.domEvt.deltaY;
        this.ui.layerContainer.setProperty('scroll', pt(layerContainerNode.scrollLeft, layerContainerNode.scrollTop));
        updateScrollerPosition();
        event.stop();
      }
      if (zoomKeyPressed(event)) {
        event.domEvt.preventDefault();

        const zoomDelta = event.domEvt.deltaY * CONSTANTS.MOUSE_WHEEL_FACTOR_FOR_ZOOM;
        const layerContainerNode = this.ui.scrollableContainer.env.renderer.getNodeForMorph(this.ui.layerContainer);

        const cursorPosition = this.ui.layerContainer.localize(event.hand.position).x;
        const offset = cursorPosition - CONSTANTS.SEQUENCE_INITIAL_X_OFFSET;

        const normalizedOffset = offset / this.zoomFactor;

        this.zoomFactor += zoomDelta;

        const newOffset = normalizedOffset * this.zoomFactor;
        const scrollDifference = newOffset - offset;

        layerContainerNode.scrollLeft = layerContainerNode.scrollLeft + scrollDifference;
        this.ui.layerContainer.setProperty('scroll', pt(layerContainerNode.scrollLeft, layerContainerNode.scrollTop));
        updateScrollerPosition();
      }
    };

    this.ui.scrollableContainer.addMorph(this.ui.layerContainer);
  }

  initializeLayerInfoContainer () {
    this.ui.layerInfoContainer = new Morph({
      name: 'layer info container',
      position: pt(0, 0),
      extent: pt(CONSTANTS.LAYER_INFO_WIDTH, this.height - CONSTANTS.VERTICAL_SCROLLBAR_HEIGHT),
      layout: new VerticalLayout({
        spacing: 2,
        resizeSubmorphs: true,
        autoResize: true,
        orderByIndex: true
      })
    });
    this.ui.scrollableContainer.addMorph(this.ui.layerInfoContainer);
  }

  getNewTimelineLayer () {
    throw new Error('Subclass resposibility');
  }

  deleteSelectedItems () {
    throw new Error('Subclass resposibility');
  }

  createTimelineLayer (layer, index = 0, name = undefined) {
    const props = layer.constructor.name == 'Layer' ? { layer: layer } : { morph: layer };
    const timelineLayer = this.getNewTimelineLayer({ _editor: this.editor, container: this.ui.layerContainer, ...props });
    this.ui.layerContainer.addMorphAt(timelineLayer, index);

    const layerInfo = new TimelineLayerInfo({ timelineLayer, name });
    timelineLayer.layerInfo = layerInfo;
    this.ui.layerInfoContainer.addMorphAt(layerInfo, index);
    return timelineLayer;
  }

  abandonTimelineLayer (timelineLayer) {
    timelineLayer.layerInfo.abandon();
    timelineLayer.abandon();
  }

  arrangeLayerInfos () {
    this.ui.layerInfoContainer.removeAllMorphs();
    const layerInfos = new Array(this.timelineLayers.length);
    this.timelineLayers.forEach(timelineLayer => {
      layerInfos[timelineLayer.index] = timelineLayer.layerInfo;
    });
    this.ui.layerInfoContainer.submorphs = layerInfos;
  }

  redraw () {
    this.editor.triggerInteractiveScrollPositionConnections();
  }

  get timelineLayers () {
    return this.withAllSubmorphsSelect(submorph => submorph.isTimelineLayer);
  }

  loadContent (content) {
    if (this.submorphs.length !== 0) {
      this.submorphs.forEach(submorph => submorph.remove());
      this.initialize();
    }
    this._createOverviewLayers = true;
    this.onLoadContent(content);
    this.initializeCursor();
    connect(this.editor, 'interactiveScrollPosition', this, 'onScrollChange', {
      updater: '($update, scrollPosition) => { if (target.isDisplayed) $update(scrollPosition); }'
    }).update(this.editor.interactiveScrollPosition);
    connect(content, 'name', this, 'name', { converter: newName => `${newName.toLowerCase()} timeline` }).update(content.name);
    this._createOverviewLayers = false;
  }

  onLoadContent (content) {
    throw new Error('Subclass resposibility');
  }

  onActiveAreaWidthChange () {
    this.timelineLayers.forEach(timelineLayer => {
      timelineLayer.activeArea.width = this._activeAreaWidth;
    });

    const scrollbarWidth = this.ui.scrollBar.extent.x;
    const visiblePortion = scrollbarWidth / (this.ui.layerContainer.scrollExtent.x - this.ui.layerContainer.scrollbarOffset.x);
    // keep margin at both left and right end of the scrollbar
    this.ui.scroller.extent = pt((visiblePortion * scrollbarWidth) - (2 * CONSTANTS.SCROLLBAR_MARGIN), this.ui.scroller.extent.y);
  }

  get isDisplayed () {
    return this === this.editor.displayedTimeline;
  }

  onScrollChange (scrollPosition) {
    this.ui.cursor.displayValue = this.getDisplayValueFromScroll(scrollPosition);
    this.ui.cursor.location = this.getPositionFromScroll(scrollPosition);
  }

  getDisplayValueFromScroll (scrollPosition) {
    throw new Error('Subclass resposibility');
  }

  getPositionFromScroll (scrollPosition) {
    throw new Error('Subclass resposibility');
  }

  getScrollFromPosition (positionPosition) {
    throw new Error('Subclass resposibility');
  }

  abandon () {
    super.abandon();
    disconnect(this.editor, 'interactiveScrollPosition', this, 'onScrollChange');
    if (this.editor.interactive) {disconnect(this.editor.interactive, 'name', this, 'name'); }
  }
  
  renameSelection (newName) {
    throw new Error('Subclass responsibility');
  }

  zoomToFit () {
    throw new Error('Subclass responsibility');
  }
}

export class GlobalTimeline extends Timeline {
  createTimelineSequence (sequence) {
    const timelineSequence = new TimelineSequence({
      _editor: this.editor,
      sequence,
      timelineLayer: this.getTimelineLayerFor(sequence.layer)
    });
    connect(sequence, 'name', timelineSequence, 'caption');
    return timelineSequence;
  }

  createTimelineSequenceInHand (sequence) {
    const newTimelineSequence = this.createTimelineSequence(sequence);
    const hand = $world.firstHand;
    hand.grab(newTimelineSequence);
    newTimelineSequence.onGrabStart(hand);
    newTimelineSequence.center = pt(0, 0);
  }

  getNewTimelineLayer (props) {
    return new GlobalTimelineLayer(props);
  }

  onLoadContent (interactive) {
    this.editor.interactive.layers.sort((a, b) => a.zIndex - b.zIndex).forEach(layer => this.createTimelineLayer(layer));
    connect(this.editor.interactive, 'onLengthChange', this, '_activeAreaWidth', { converter: '(length) => target.getWidthFromDuration(length)' }).update(this.editor.interactive.length);
    this.editor.interactive.sequences.forEach(sequence => {
      this.createTimelineSequence(sequence);
    });
    this.updateLayerPositions();
  }

  redraw () {
    super.redraw();
    this.timelineSequences.forEach(timelineSequence => {
      timelineSequence._lockModelUpdate = true;
      timelineSequence.setWidthAndUpdateResizers(this.getWidthFromDuration(timelineSequence.sequence.duration));
      timelineSequence.position = pt(this.getPositionFromScroll(timelineSequence.sequence.start), timelineSequence.position.y);
      timelineSequence._lockModelUpdate = false;
    });
    this._activeAreaWidth = this.getWidthFromDuration(this.editor.interactive.length);
  }

  updateLayerPositions () {
    this.editor.interactive.layers.forEach(layer => {
      const timelineLayer = this.getTimelineLayerFor(layer);
      timelineLayer.position = pt(timelineLayer.position.x, -layer.zIndex);
    });
    this.arrangeLayerInfos();
  }

  getTimelineLayerFor (layer) {
    return this.timelineLayers.find(timelineLayer => timelineLayer.layer === layer);
  }

  get timelineSequences () {
    return this.timelineLayers.flatMap(timelineLayer => timelineLayer.timelineSequences);
  }

  getDisplayValueFromScroll (scrollPosition) {
    return Math.round(scrollPosition);
  }

  getPositionFromScroll (scrollPosition) {
    return (scrollPosition * this.zoomFactor) + CONSTANTS.SEQUENCE_INITIAL_X_OFFSET;
  }

  getScrollFromPosition (position) {
    return (position - CONSTANTS.SEQUENCE_INITIAL_X_OFFSET) / this.zoomFactor;
  }

  getWidthFromDuration (duration) {
    return duration * this.zoomFactor;
  }

  getDurationFromWidth (width) {
    return width / this.zoomFactor;
  }

  updateZIndicesFromTimelineLayerPositions () {
    const layerPositions = this.timelineLayers.map(timelineLayer =>
      ({
        layer: timelineLayer.layer,
        y: timelineLayer.index
      }));
    layerPositions.sort((a, b) => b.y - a.y);
    layerPositions.forEach((layerPositionObject, index) => {
      layerPositionObject.layer.zIndex = index * 10;
    });
    this.editor.interactive.redraw();
  }

  deselectAllSequences (filter) {
    let allSequences = this.sequences;
    if (filter) {
      allSequences = allSequences.filter(filter);
    }
    allSequences.forEach(sequence => sequence.isSelected = false);
  }

  deselectAllSequencesExcept (timelineSequence) {
    this.deselectAllSequences();
    timelineSequence.isSelected = true;
  }

  get sequences () {
    return this.timelineLayers.flatMap(timelineLayer => timelineLayer.timelineSequences);
  }

  get selectedSequences () {
    return this.sequences.filter(sequence => sequence.isSelected);
  }

  getSelectedSequences (filter) {
    if (filter) {
      return this.selectedSequences.filter(filter);
    }
    return this.selectedSequences;
  }

  selectAllSequences (filter, deselectIfAllAreSelected = true) {
    let allSequences = this.sequences;
    if (filter) {
      allSequences = allSequences.filter(filter);
    }
    if (deselectIfAllAreSelected && arr.equals(allSequences, this.getSelectedSequences(filter))) {
      this.deselectAllSequences();
    } else {
      allSequences.forEach(sequence => sequence.isSelected = true);
    }
  }

  get isGlobalTimeline () {
    return true;
  }

  moveTimelineSequencesBy (timelineSequences, scrollStepSize) {
    this.undoStart('timeline-sequence-move');

    const faultyTimelineSequences = [];
    const timelineSequenceStates = [];
    timelineSequences.forEach(timelineSequence => {
      timelineSequenceStates.push({
        timelineSequence: timelineSequence,
        previousPosition: timelineSequence.position,
        previousWidth: timelineSequence.width,
        previousTimelineLayer: timelineSequence.timelineLayer,
        isMove: true
      });

      timelineSequence.position = pt(timelineSequence.position.x + timelineSequence.timeline.getWidthFromDuration(scrollStepSize),
        timelineSequence.position.y);
      timelineSequence.updateSequenceAfterArrangement();

      const forbiddenMovement = timelineSequence.isOverlappingOtherSequence() || timelineSequence.sequence.start < 0;

      if (forbiddenMovement) {
        faultyTimelineSequences.push(timelineSequence);
      }
    });

    this.undoStop('timeline-sequence-move');

    if (faultyTimelineSequences.length > 0) this.env.undoManager.undo();
    faultyTimelineSequences.forEach(timelineSequence => {
      if (scrollStepSize < 0) {
        timelineSequence.showWarning('left', CONSTANTS.FULL_WARNING_OPACITY_AT_DRAG_DELTA, true);
        timelineSequence.hideWarning('left');
      } else {
        timelineSequence.showWarning('right', CONSTANTS.FULL_WARNING_OPACITY_AT_DRAG_DELTA, true);
        timelineSequence.hideWarning('right');
      }
    });
  }

  clear () {
    this.timelineLayers.flatMap(timelineLayer => timelineLayer.timelineSequences).forEach(timelineSequence => timelineSequence.disbandInteractiveConnections());
    this.ui.layerInfoContainer.submorphs = [];
    this.ui.layerContainer.submorphs = [];
  }

  deleteSelectedItems () {
    arr.invoke(this.selectedSequences, 'delete');
  }

  toggleVisbilityForSelection () {
    const undo = this.undoStart('sequence-visibility');
    this.selectedSequences.forEach(timelineSequence => {
      undo.addTarget(timelineSequence);
      timelineSequence.isHidden = !timelineSequence.isHidden;
    });
    this.undoStop('sequence-visibility');
  }

  async promptRenameForSelection () {
    const newName = !(this.selectedSequences.length > 1)
      ? await $world.prompt('Sequence name:', { input: this.selectedSequences[0].sequence.name })
      : await $world.prompt(`Name for the ${this.selectedSequences.length} selected Sequences`);

    if (newName) {
      this.renameSelection(newName);
    } else {
      $world.setStatusMessage('Name not set', COLOR_SCHEME.ERROR);
    }
  }

  renameSelection (newName) {
    const undo = this.undoStart('rename-sequence');
    this.selectedSequences.forEach(timelineSequence => {
      undo.addTarget(timelineSequence);
      timelineSequence.caption = newName;
    });
    this.undoStop('rename-sequence');
  }

  async promptDurationForSelection () {
    const newDuration = !(this.selectedSequences.length > 1)
      ? Number(await $world.prompt('Duration:', { input: `${this.selectedSequences[0].sequence.duration}` }))
      : Number(await $world.prompt(`Duration of the ${this.selectedSequences.length} selected Sequences:`));

    const invalidDuration = this.selectedSequences.some(timelineSequence => !this.editor.interactive.validSequenceDuration(timelineSequence.sequence, newDuration));
    if (!invalidDuration) {
      this.setDurationForSelection(newDuration);
    } else {
      $world.setStatusMessage('Duration not set', COLOR_SCHEME.ERROR);
    }
  }

  setDurationForSelection (newDuration) {
    const undo = this.undoStart('sequence-duration');
    this.selectedSequences.forEach(timelineSequence => {
      undo.addTarget(timelineSequence);
      timelineSequence.sequence.duration = newDuration;
      timelineSequence.width = this.getWidthFromDuration(newDuration);
    });
    this.undoStop('sequence-duration');
  }

  async promptStartForSelection () {
    const newStart = !(this.selectedSequences.length > 1)
      ? Number(await $world.prompt('Start:', { input: `${this.selectedSequences[0].sequence.start}` }))
      : Number(await $world.prompt(`Start of the ${this.selectedSequences.length} selected Sequences:`));

    const invalidStart = this.selectedSequences.some(timelineSequence => !this.editor.interactive.validSequenceStart(timelineSequence.sequence, newStart));
    if (!invalidStart) {
      this.setStartForSelection(newStart);
    } else {
      $world.setStatusMessage('Start not set', COLOR_SCHEME.ERROR);
    }
  }

  setStartForSelection (newStart) {
    const undo = this.undoStart();
    const newPositionX = this.getPositionFromScroll(newStart);
    this.selectedSequences.forEach(timelineSequence => {
      undo.addTarget(timelineSequence);
      timelineSequence.position = pt(newPositionX, CONSTANTS.SEQUENCE_LAYER_Y_OFFSET);
    });
    this.undoStop();
  }

  zoomToFit () {
    const widthToFit = this.editor.interactive.length + CONSTANTS.SEQUENCE_INITIAL_X_OFFSET + CONSTANTS.INACTIVE_AREA_WIDTH;
    const widthAvailable = this.ui.layerContainer.width;
    const factor = widthAvailable / widthToFit;
    this.zoomFactor = factor;
  }
}

export class SequenceTimeline extends Timeline {
  static get properties () {
    return {
      _sequence: {
        defaultValue: {}
      }
    };
  }

  get selectedTimelineKeyframes () {
    return this.keyframes.filter(keyframe => keyframe.isSelected);
  }

  get sequence () {
    return this._sequence;
  }

  isSequenceTimeline () {
    return true;
  }

  createOverviewTimelineLayer (morph) {
    const timelineLayer = super.createTimelineLayer(morph);
    timelineLayer.layerInfo.addCollapseToggle();
    return timelineLayer;
  }

  createTimelineLayer (morph, index = 0, name = undefined) {
    const timelineLayer = super.createTimelineLayer(morph, index, name);
    this.ui.layerInfoContainer.submorphs[timelineLayer.index].onMouseUp = () => {
      if (morph.world()) morph.show();
      this.editor.inspector.targetMorph = morph;
    };
    return timelineLayer;
  }

  onLoadContent (sequence) {
    this._sequence = sequence;
    this.sequence.submorphs.forEach(morph => {
      const timelineLayer = this.createOverviewTimelineLayer(morph);
      timelineLayer.addTimelineKeyframes();
    });
  }

  redraw () {
    super.redraw();
    this._activeAreaWidth = CONSTANTS.IN_EDIT_MODE_SEQUENCE_WIDTH * this.zoomFactor;
    this.timelineLayers.forEach(timelineLayer => timelineLayer.redraw());
  }

  get keyframes () {
    return this.timelineLayers.flatMap(timelineLayer => timelineLayer.keyframes);
  }

  getTimelineKeyframe (keyframe) {
    return this.keyframes.find(timelineKeyframe => timelineKeyframe.keyframe === keyframe);
  }

  updateLayers () {
    this.withAllSubmorphsDo(submorph => {
      if (submorph.isTimelineLayer) {
        if (submorph.isOverviewLayer) {
          if (!submorph.isExpanded) {
            submorph.updateTimelineKeyframes();
          } else {
            submorph.removePropertyLayers();
            submorph.createPropertyLayers();
          }
        }
      }
    });
  }

  getNewTimelineLayer (props) {
    return this._createOverviewLayers ? new OverviewSequenceTimelineLayer(props) : new SequenceTimelineLayer(props);
  }

  getPositionFromScroll (scrollPosition) {
    if (scrollPosition < this.sequence.start) {
      return CONSTANTS.SEQUENCE_INITIAL_X_OFFSET;
    }
    if (scrollPosition >= this.sequence.end) {
      return this._activeAreaWidth + CONSTANTS.SEQUENCE_INITIAL_X_OFFSET;
    }
    return (CONSTANTS.IN_EDIT_MODE_SEQUENCE_WIDTH * this.sequence.getRelativePositionFor(scrollPosition) * this.zoomFactor) + CONSTANTS.SEQUENCE_INITIAL_X_OFFSET;
  }

  getScrollDeltaFromDistance (distance) {
    return (this.sequence.duration * distance) * this.zoomFactor;
  }

  getScrollFromPosition (position) {
    return (position.x - CONSTANTS.SEQUENCE_INITIAL_X_OFFSET) / (CONSTANTS.IN_EDIT_MODE_SEQUENCE_WIDTH * this.zoomFactor);
  }

  getScrollFromKeyframe (keyframe) {
    return this.sequence.getAbsolutePositionFor(keyframe);
  }

  getPositionFromKeyframe (keyframe) {
    return this.getPositionFromScroll(this.getScrollFromKeyframe(keyframe));
  }

  getDisplayValueFromScroll (scrollPosition) {
    return this.sequence.progress.toFixed(2);
  }

  deselectAllTimelineKeyframesExcept (timelineKeyframe) {
    this.selectedTimelineKeyframes.forEach(keyframe => keyframe.isSelected = false);
    timelineKeyframe.isSelected = true;
  }

  deselectAllTimelineKeyframes () {
    this.selectedTimelineKeyframes.forEach(keyframe => keyframe.isSelected = false);
  }

  deleteSelectedItems () {
    arr.invoke(this.selectedTimelineKeyframes, 'delete');
  }

  async promptEasingForSelection (multipleKeyframesSelected) {
    const easingSelection = EasingSelection.init({ label: `Set Easing for the ${this.selectedTimelineKeyframes.length} selected Keyframe(s)` });
    if (!multipleKeyframesSelected) {
      const preselectIndex = Keyframe.possibleEasings.indexOf(this.selectedTimelineKeyframes[0].keyframe.easingName);
      easingSelection.morph.selectByIndex(preselectIndex);
    }
    const result = await easingSelection.promise;
    if (result) {
      this.setEasingForSelection(result);
    }
  }

  setEasingForSelection (easing) {
    const undo = this.undoStart('set-keyframe-easing');
    this.selectedTimelineKeyframes.forEach(timelineKeyframe => {
      undo.addTarget(timelineKeyframe);
      timelineKeyframe.easing = easing;
      timelineKeyframe.layer.redraw();
    });
    this.undoStop('set-keyframe-easing');
  }

  async promptRenameForSelection (multipleKeyframesSelected) {
    const newName = multipleKeyframesSelected
      ? await $world.prompt('Keyframe name:', { input: this.selectedTimelineKeyframes[0].name })
      : await $world.prompt(`Name for the ${this.selectedTimelineKeyframes.length} selected Keyframes:`);

    if (newName) {
      this.renameSelection(newName);
    } else {
      $world.setStatusMessage('Name not set', COLOR_SCHEME.ERROR);
    }
  }

  renameSelection (newName) {
    const undo = this.undoStart('rename-keyframe');
    this.selectedTimelineKeyframes.forEach(timelineKeyframe => {
      undo.addTarget(timelineKeyframe);
      timelineKeyframe.name = newName;
    });
    this.undoStop('rename-keyframe');
  }

  async promptUserForNewRelativePositionForSelection (multipleKeyframesSelected) {
    const newPosition = !multipleKeyframesSelected
      ? await $world.prompt('Keyframe position:', { input: `${this.selectedTimelineKeyframes[0].keyframe.position}` })
      : await $world.prompt(`Set the ${this.selectedTimelineKeyframes.length} selected Keyframes to relative position:`);

    if (newPosition) {
      if (newPosition >= 0 && newPosition <= 1) {
        this.changeKeyframePositionForSelection(newPosition);
      } else {
        await $world.inform('Enter a value between 0 and 1.');
        await this.promptUserForNewRelativePositionForSelection(multipleKeyframesSelected);
      }
    }
  }

  changeKeyframePositionForSelection (newPosition) {
    const undo = this.undoStart('move-keyframe');
    this.selectedTimelineKeyframes.forEach(timelineKeyframe => {
      undo.addTarget(timelineKeyframe);
      timelineKeyframe.changeKeyframePosition(newPosition, false);
    });
    this.undoStop('move-keyframe');
  }

  async promptUserForNewAbsolutePositionForSelection (multipleKeyframesSelected) {
    const sequence = Sequence.getSequenceOfMorph(this.selectedTimelineKeyframes[0].animation.target);
    const newPosition = !multipleKeyframesSelected
      ? await $world.prompt('Keyframe position:', { input: `${sequence.getAbsolutePositionFor(this.selectedTimelineKeyframes[0].keyframe)}` })
      : await $world.prompt(`Set the ${this.selectedTimelineKeyframes.length} selected Keyframes to absolute position:`);

    if (newPosition) {
      const newRelativePosition = sequence.getRelativePositionFor(newPosition);
      if (newPosition >= 0 && newPosition <= this.editor.interactive.length && newRelativePosition >= 0 && newRelativePosition <= 1) {
        this.changeKeyframePositionForSelection(newRelativePosition);
      } else {
        await $world.inform('Enter a valid scroll position inside this sequence.');
        await this.promptUserForNewAbsolutePositionForSelection(multipleKeyframesSelected);
      }
    }
  }

  scrollToTimelineKeyframe (timelineKeyframe) {
    const scrollToX = timelineKeyframe.position.x - this.ui.layerContainer.extent.x / 2;
    this.scrollHorizontallyTo(scrollToX);

    const scrollToY = timelineKeyframe.layer.position.y;
    this.scrollVerticallyTo(scrollToY);
  }

  scrollHorizontallyTo (scrollLeft) {
    const layerContainerNode = this.ui.scrollableContainer.env.renderer.getNodeForMorph(this.ui.layerContainer);
    if (!layerContainerNode) return;
    layerContainerNode.scrollLeft = scrollLeft;
    this.ui.layerContainer.setProperty('scroll', pt(layerContainerNode.scrollLeft, layerContainerNode.scrollTop));
    const relative = (this.ui.scrollBar.extent.x - this.ui.scroller.extent.x - (2 * CONSTANTS.SCROLLBAR_MARGIN)) / (this.ui.layerContainer.scrollExtent.x - this.ui.layerContainer.extent.x - this.ui.layerContainer.scrollbarOffset.x);
    this.ui.scroller.position = pt(this.ui.layerContainer.scroll.x * relative + CONSTANTS.SCROLLBAR_MARGIN, CONSTANTS.SCROLLBAR_MARGIN);
  }

  scrollVerticallyTo (scrollTop) {
    const maxScroll = this.ui.scrollableContainer.scrollExtent.y - this.ui.scrollableContainer.extent.y - this.ui.scrollableContainer.scrollbarOffset.y;
    scrollTop = scrollTop > maxScroll ? maxScroll : scrollTop;

    const scrollableContainerNode = this.ui.scrollableContainer.env.renderer.getNodeForMorph(this.ui.scrollableContainer);
    if (!scrollableContainerNode) return;
    scrollableContainerNode.scrollTop = scrollTop;
    this.ui.scrollableContainer.setProperty('scroll', pt(0, scrollTop));
  }

  zoomToFit () {
    this.zoomFactor = 1;
  }
}
