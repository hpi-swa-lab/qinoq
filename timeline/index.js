import { pt } from 'lively.graphics';
import { VerticalLayout, Label, Morph } from 'lively.morphic';
import { TimelineCursor } from './cursor.js';
import { connect, disconnect } from 'lively.bindings';
import { TimelineSequence } from './sequence.js';
import { GlobalTimelineLayer, PropertyTimelineLayer, OverviewTimelineLayer } from './layer.js';
import { CONSTANTS } from './constants.js';
import { TimelineLayerInfo, SequenceTimelineLayerInfo, GlobalTimelineLayerInfo } from './layer-info.js';
import { COLOR_SCHEME } from '../colors.js';
import { arr } from 'lively.lang';
import { singleSelectKeyPressed, zoomKeyPressed } from '../keys.js';
import { Sequence, Keyframe } from '../index.js';
import { EasingSelection } from '../components/easing-selection.js';
import { QinoqMorph } from '../qinoq-morph.js';
import index from 'https://jspm.dev/npm:fs@0.0.2!cjs';

export class Timeline extends QinoqMorph {
  static get properties () {
    return {
      ui: {
        initialize () {
          this.ui = {};
        }
      },
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
          this.setProperty('zoomFactor', Math.round(zoomFactor * 100) / 100);
          if (this._deserializing || !this.interactive) return;
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
      },
      extent: {
        set (extent) {
          this.setProperty('extent', extent);
          if (!this._deserializing && this.editor && this.editor.ui.window) this.relayout(this.editor.ui.window.extent);
        }
      }
    };
  }

  get isDisplayed () {
    return this === this.editor.displayedTimeline;
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

  getNewTimelineLayer () {
    throw new Error('Subclass resposibility');
  }

  get timelineLayers () {
    return this.withAllSubmorphsSelect(submorph => submorph.isTimelineLayer);
  }

  // Is automatically called by editor setter
  initialize () {
    this.ui.scrollableContainer = new QinoqMorph(
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

  initializeScrollBar () {
    this.ui.scrollBar = new QinoqMorph({
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
    this.ui.scroller = this.ui.scrollBar.addMorph(new QinoqMorph({
      name: 'scroller',
      fill: COLOR_SCHEME.BACKGROUND_VARIANT,
      position: pt(CONSTANTS.SCROLLBAR_MARGIN, CONSTANTS.SCROLLBAR_MARGIN),
      extent: pt(0, CONSTANTS.VERTICAL_SCROLLBAR_HEIGHT - (2 * CONSTANTS.SCROLLBAR_MARGIN)),
      borderRadius: 10,
      draggable: true
    }));

    connect(this.ui.scroller, 'onDrag', this, 'ensureValidScrollerPosition');
  }

  initializeScrollbarCursorIndicator () {
    this.ui.scrollbarCursor = this.ui.scrollBar.addMorph(new QinoqMorph({
      name: 'scrollbar cursor',
      fill: COLOR_SCHEME.SECONDARY,
      position: pt(0, 0),
      extent: pt(10, CONSTANTS.VERTICAL_SCROLLBAR_HEIGHT - (2 * CONSTANTS.SCROLLBAR_MARGIN)),
      borderRadius: 10
    }));

    connect(this.editor, 'onScrollChange', this.ui.scrollbarCursor, 'position', {
      converter: `(scrollPosition) => {
      return pt(
        (source.displayedTimeline.getPositionFromScroll(scrollPosition) - initialXOffset) * (scrollbar.width - (2 * scrollbarMargin + target.extent.x)) / source.displayedTimeline._activeAreaWidth + scrollbarMargin, 
        scrollbarMargin)
    }`,
      varMapping: { pt: pt, scrollbar: this.ui.scrollBar, scrollbarMargin: CONSTANTS.SCROLLBAR_MARGIN, initialXOffset: CONSTANTS.SEQUENCE_INITIAL_X_OFFSET }
    });
  }

  initializeCursor () {
    this.ui.cursor = new TimelineCursor({ displayValue: 0, timeline: this });
    this.ui.layerContainer.addMorph(this.ui.cursor);
    this.ui.cursor.location = this.getPositionFromScroll(0);
    this.ui.cursor.height = this.ui.layerContainer.height;
  }

  initializeLayerContainer () {
    this.ui.layerContainer = new QinoqMorph({
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

    this.ui.scrollableContainer.addMorph(this.ui.layerContainer);
  }

  initializeLayerInfoContainer () {
    this.ui.layerInfoContainer = new QinoqMorph({
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

  addTimelineLayer (timelineLayer, index = 0, name) {
    this.ui.layerContainer.addMorphAt(timelineLayer, index);
    this.addLayerInfoFor(timelineLayer, name, index);
    return timelineLayer;
  }

  addLayerInfoFor (timelineLayer, name, index) {
    throw new Error('Subclass resposibility');
  }

  loadContent (content) {
    if (this.submorphs.length !== 0) {
      this.submorphs.forEach(submorph => submorph.remove());
      this.initialize();
    }
    this._createOverviewLayers = true;
    this.onLoadContent(content);
    this.initializeCursor();
    this.onScrollChange(this.interactive.scrollPosition);

    connect(content, 'name', this, 'name', { converter: newName => `${newName.toLowerCase()} timeline` }).update(content.name);
    this._createOverviewLayers = false;
  }

  onLoadContent (content) {
    throw new Error('Subclass resposibility');
  }

  deselectAllItems () {
    throw new Error('Subclass resposibility');
  }

  selectAllItems () {
    throw new Error('Subclass resposibility');
  }

  deleteSelectedItems () {
    throw new Error('Subclass resposibility');
  }

  renameSelection (newName) {
    throw new Error('Subclass responsibility');
  }

  zoomToFit () {
    throw new Error('Subclass responsibility');
  }

  arrangeLayerInfos () {
    this.ui.layerInfoContainer.removeAllMorphs();
    const layerInfos = new Array(this.timelineLayers.length);
    this.timelineLayers.forEach(timelineLayer => {
      layerInfos[timelineLayer.index] = timelineLayer.layerInfo;
    });
    this.ui.layerInfoContainer.submorphs = layerInfos;
  }

  onActiveAreaWidthChange () {
    this.timelineLayers.forEach(timelineLayer => {
      timelineLayer.activeArea.width = this._activeAreaWidth;
    });

    this.updateScrollerExtent();
  }

  onScrollChange (scrollPosition) {
    this.ui.cursor.displayValue = this.getDisplayValueFromScroll(scrollPosition);
    this.ui.cursor.location = this.getPositionFromScroll(scrollPosition);
  }

  onMouseWheel (event) {
    if (singleSelectKeyPressed(event)) {
      const layerContainerNode = this.ui.scrollableContainer.env.renderer.getNodeForMorph(this.ui.layerContainer);
      layerContainerNode.scrollLeft = layerContainerNode.scrollLeft + event.domEvt.deltaY;
      this.ui.layerContainer.setProperty('scroll', pt(layerContainerNode.scrollLeft, layerContainerNode.scrollTop));
      this.updateScrollerPosition();
      event.stop();
    }
    if (zoomKeyPressed(event)) {
      event.domEvt.preventDefault();

      const zoomDelta = event.domEvt.deltaY * CONSTANTS.MOUSE_WHEEL_FACTOR_FOR_ZOOM;
      const layerContainerNode = this.ui.scrollableContainer.env.renderer.getNodeForMorph(this.ui.layerContainer);

      const cursorPosition = this.ui.layerContainer.localize(event.hand.position).x;
      const offset = cursorPosition - CONSTANTS.SEQUENCE_INITIAL_X_OFFSET;

      const normalizedOffset = offset / this.zoomFactor;

      this.editor.updateZoomInputNumber(this.zoomFactor + zoomDelta);

      const newOffset = normalizedOffset * this.zoomFactor;
      const scrollDifference = newOffset - offset;

      layerContainerNode.scrollLeft = layerContainerNode.scrollLeft + scrollDifference;
      this.ui.layerContainer.setProperty('scroll', pt(layerContainerNode.scrollLeft, layerContainerNode.scrollTop));
      this.updateScrollerPosition();
    }
  }

  ensureValidScrollerPosition () {
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
  }

  updateScrollerPosition () {
    const relative = (this.ui.scrollBar.extent.x - this.ui.scroller.extent.x - (2 * CONSTANTS.SCROLLBAR_MARGIN)) / (this.ui.layerContainer.scrollExtent.x - this.ui.layerContainer.extent.x - this.ui.layerContainer.scrollbarOffset.x);
    this.ui.scroller.position = pt(this.ui.layerContainer.scroll.x * relative + CONSTANTS.SCROLLBAR_MARGIN, CONSTANTS.SCROLLBAR_MARGIN);
  }

  relayout (newWindowExtent) {
    // Ensure UI has been created
    if (!this.ui.scrollableContainer || !this.ui.scrollBar || !this.ui.layerContainer || !this.owner) return;

    this.ui.scrollableContainer.extent = pt(newWindowExtent.x, this.owner.extent.y - CONSTANTS.VERTICAL_SCROLLBAR_HEIGHT);
    this.ui.layerContainer.extent = pt(newWindowExtent.x - this.scrollbarOffset.x - CONSTANTS.LAYER_INFO_WIDTH, this.owner.extent.y - CONSTANTS.VERTICAL_SCROLLBAR_HEIGHT);
    this.ui.scrollBar.extent = pt(newWindowExtent.x - this.scrollbarOffset.x - CONSTANTS.LAYER_INFO_WIDTH, this.ui.scrollBar.extent.y);
    this.ui.scrollBar.position = this.ui.layerContainer.bottomLeft;
    this.updateScrollerExtent();
  }

  updateScrollerExtent () {
    const scrollbarWidth = this.ui.scrollBar.extent.x;
    const visiblePortion = scrollbarWidth / (this.ui.layerContainer.scrollExtent.x - this.ui.layerContainer.scrollbarOffset.x);
    // keep margin at both left and right end of the scrollbar
    this.ui.scroller.extent = pt((visiblePortion * scrollbarWidth) - (2 * CONSTANTS.SCROLLBAR_MARGIN), this.ui.scroller.extent.y);
    this.updateScrollerPosition();
  }

  redraw () {
    this.ui.cursor.location = this.getPositionFromScroll(this.interactive.scrollPosition);
  }

  abandonTimelineLayer (timelineLayer) {
    timelineLayer.layerInfo.abandon();
    timelineLayer.abandon();
  }

  abandon (bool) {
    super.abandon(bool);
    disconnect(this.editor, 'onScrollChange', this, 'onScrollChange');
    if (this.interactive) disconnect(this.interactive, 'name', this, 'name');
  }
}

export class GlobalTimeline extends Timeline {
  get isGlobalTimeline () {
    return true;
  }

  getTimelineLayerFor (layer) {
    return this.timelineLayers.find(timelineLayer => timelineLayer.layer === layer);
  }

  getNewTimelineLayer (props) {
    return new GlobalTimelineLayer(props);
  }

  get timelineSequences () {
    return this.timelineLayers.flatMap(timelineLayer => timelineLayer.timelineSequences);
  }

  get selectedTimelineSequences () {
    return this.timelineSequences.filter(timelineSequence => timelineSequence.isSelected);
  }

  getSelectedTimelineSequences (filter = () => true) {
    return this.selectedTimelineSequences.filter(filter);
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

  createTimelineSequence (sequence) {
    const timelineSequence = new TimelineSequence({
      _editor: this.editor,
      sequence,
      timelineLayer: this.getTimelineLayerFor(sequence.layer)
    });
    return timelineSequence;
  }

  createTimelineSequenceInHand (sequence) {
    const newTimelineSequence = this.createTimelineSequence(sequence);
    const hand = $world.firstHand;
    hand.grab(newTimelineSequence);
    newTimelineSequence.onGrabStart(hand);
    newTimelineSequence.center = pt(0, 0);
  }

  createGlobalLayer (layer) {
    const timelineLayer = new GlobalTimelineLayer({
      timeline: this,
      _editor: this.editor,
      container: this.ui.layerContainer,
      layer
    });

    return this.addTimelineLayer(timelineLayer);
  }

  addLayerInfoFor (timelineLayer, name, index) {
    const layerInfo = new GlobalTimelineLayerInfo({ timelineLayer, name });
    timelineLayer.layerInfo = layerInfo;
    this.ui.layerInfoContainer.addMorphAt(layerInfo, index);
  }

  onLoadContent (interactive) {
    this.interactive.layers.sort((a, b) => a.zIndex - b.zIndex).forEach(layer => this.createGlobalLayer(layer));
    connect(this.interactive, 'onLengthChange', this, '_activeAreaWidth', { converter: '(length) => target.getWidthFromDuration(length)' }).update(this.interactive.length);
    this.interactive.sequences.forEach(sequence => {
      this.createTimelineSequence(sequence);
    });
    this.updateLayerPositions();
  }

  toggleVisbilityForSelection () {
    const undo = this.undoStart('sequence-visibility');
    this.selectedTimelineSequences.forEach(timelineSequence => {
      undo.addTarget(timelineSequence);
      timelineSequence.isHidden = !timelineSequence.isHidden;
    });
    this.undoStop('sequence-visibility');
  }

  deleteSelectedItems () {
    arr.invoke(this.selectedTimelineSequences, 'delete');
  }

  deselectAllItems (filter) {
    let allSequences = this.timelineSequences;
    if (filter) {
      allSequences = allSequences.filter(filter);
    }
    allSequences.forEach(sequence => sequence.isSelected = false);
  }

  deselectAllSequencesExcept (timelineSequence) {
    this.deselectAllItems();
    timelineSequence.isSelected = true;
  }

  selectAllItems (filter, deselectIfAllAreSelected = true) {
    let allSequences = this.timelineSequences;
    if (filter) {
      allSequences = allSequences.filter(filter);
    }
    if (deselectIfAllAreSelected && arr.equals(allSequences, this.getSelectedTimelineSequences(filter))) {
      this.deselectAllItems();
    } else {
      allSequences.forEach(sequence => sequence.isSelected = true);
    }
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

      // check if the sequence is less than scrollStepSize and more than 0 units away from the left timeline bounds
      // if so move it to 0
      if (timelineSequence.sequence.start > 0 && timelineSequence.sequence.start + scrollStepSize < 0) {
        scrollStepSize = -timelineSequence.sequence.start;
      }

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

  zoomToFit () {
    const widthToFit = this.interactive.length + CONSTANTS.SEQUENCE_INITIAL_X_OFFSET + CONSTANTS.INACTIVE_AREA_WIDTH;
    const widthAvailable = this.ui.layerContainer.width;
    const factor = widthAvailable / widthToFit;
    this.zoomFactor = factor;
    this.editor.updateZoomInputNumber(this.zoomFactor);
  }

  async promptRenameForSelection () {
    const newName = this.selectedTimelineSequences.length > 1
      ? await $world.prompt(`Name for the ${this.selectedTimelineSequences.length} selected Sequences`)
      : await $world.prompt('Sequence name:', { input: this.selectedTimelineSequences[0].sequence.name });

    if (newName) {
      this.renameSelection(newName);
    } else {
      $world.setStatusMessage('Name not set', COLOR_SCHEME.ERROR);
    }
  }

  renameSelection (newName) {
    const undo = this.undoStart('rename-sequence');
    this.selectedTimelineSequences.forEach(timelineSequence => {
      undo.addTarget(timelineSequence);
      timelineSequence.caption = newName;
    });
    this.undoStop('rename-sequence');
  }

  async promptDurationForSelection () {
    const newDuration = !(this.selectedTimelineSequences.length > 1)
      ? Number(await $world.prompt('Duration:', { input: `${this.selectedTimelineSequences[0].sequence.duration}` }))
      : Number(await $world.prompt(`Duration of the ${this.selectedTimelineSequences.length} selected Sequences:`));

    if (isNaN(newDuration) || typeof newDuration === 'undefined' || newDuration == 0) {
      $world.setStatusMessage('Enter a positive number', COLOR_SCHEME.ERROR);
      return;
    }

    const invalidDuration = this.selectedTimelineSequences.some(timelineSequence => !this.interactive.validSequenceDuration(timelineSequence.sequence, newDuration));
    if (!invalidDuration) {
      this.setDurationForSelection(newDuration);
    } else {
      if (newDuration < 1) $world.setStatusMessage('Duration too short (< 1)', COLOR_SCHEME.ERROR);
      else $world.setStatusMessage('Would overlap a sequence', COLOR_SCHEME.ERROR);
    }
  }

  setDurationForSelection (newDuration) {
    const undo = this.undoStart('sequence-duration');
    this.selectedTimelineSequences.forEach(timelineSequence => {
      undo.addTarget(timelineSequence);
      timelineSequence.sequence.duration = newDuration;
      timelineSequence.width = this.getWidthFromDuration(newDuration);
    });
    this.undoStop('sequence-duration');
  }

  async promptStartForSelection () {
    const newStart = !(this.selectedTimelineSequences.length > 1)
      ? Number(await $world.prompt('Start:', { input: `${this.selectedTimelineSequences[0].sequence.start}` }))
      : Number(await $world.prompt(`Start of the ${this.selectedTimelineSequences.length} selected Sequences:`));

    const invalidStart = this.selectedTimelineSequences.some(timelineSequence => !this.interactive.validSequenceStart(timelineSequence.sequence, newStart));
    if (!invalidStart) {
      this.setStartForSelection(newStart);
    } else {
      $world.setStatusMessage('Start not set', COLOR_SCHEME.ERROR);
    }
  }

  setStartForSelection (newStart) {
    const undo = this.undoStart();
    const newPositionX = this.getPositionFromScroll(newStart);
    this.selectedTimelineSequences.forEach(timelineSequence => {
      undo.addTarget(timelineSequence);
      timelineSequence.position = pt(newPositionX, CONSTANTS.SEQUENCE_LAYER_Y_OFFSET);
    });
    this.undoStop();
  }

  redraw () {
    super.redraw();
    this.timelineSequences.forEach(timelineSequence => {
      timelineSequence._lockModelUpdate = true;
      timelineSequence.setWidthAndUpdateResizers(this.getWidthFromDuration(timelineSequence.sequence.duration));
      timelineSequence.position = pt(this.getPositionFromScroll(timelineSequence.sequence.start), timelineSequence.position.y);
      timelineSequence._lockModelUpdate = false;
    });
    this._activeAreaWidth = this.getWidthFromDuration(this.interactive.length);
  }

  updateLayerPositions () {
    this.interactive.layers.forEach(layer => {
      const timelineLayer = this.getTimelineLayerFor(layer);
      timelineLayer.position = pt(timelineLayer.position.x, -layer.zIndex);
    });
    this.arrangeLayerInfos();
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
    this.interactive.redraw();
  }

  clear () {
    this.timelineLayers.flatMap(timelineLayer => timelineLayer.timelineSequences).forEach(timelineSequence => timelineSequence.disbandInteractiveConnections());
    this.ui.layerInfoContainer.submorphs = [];
    this.ui.layerContainer.submorphs = [];
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

  get overviewLayers () {
    return this.timelineLayers.filter(timelineLayer => timelineLayer.isOverviewLayer);
  }

  get keyframes () {
    return this.timelineLayers.flatMap(timelineLayer => timelineLayer.keyframes).filter(Boolean);
  }

  getTimelineKeyframe (keyframe) {
    return this.keyframes.find(timelineKeyframe => timelineKeyframe.keyframe.equals(keyframe));
  }

  get isSequenceTimeline () {
    return true;
  }

  getNewTimelineLayer (props) {
    return this._createOverviewLayers ? new OverviewTimelineLayer(props) : new PropertyTimelineLayer(props);
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

  createOverviewTimelineLayer (morph) {
    const timelineLayer = new OverviewTimelineLayer({
      timeline: this,
      _editor: this.editor,
      morph,
      container: this.ui.layerContainer
    });
    this.addTimelineLayer(timelineLayer);
    timelineLayer.layerInfo.addCollapseToggle();

    timelineLayer.addTimelineKeyframes();
    return timelineLayer;
  }

  onLoadContent (sequence) {
    this._sequence = sequence;
    !this.sequence.isEmpty
      ? this.sequence.submorphs.forEach(morph => this.createOverviewTimelineLayer(morph))
      : this.addPlaceholder();
  }

  addPlaceholder () {
    const placeholder = new Morph({
      name: 'placeholder',
      fill: COLOR_SCHEME.BACKGROUND_VARIANT,
      opacity: 0.5,
      height: CONSTANTS.LAYER_HEIGHT,
      layout: new VerticalLayout({
        align: 'center',
        direction: 'centered',
        autoResize: false
      })
    });
    const label = new Label({
      textString: 'Create content here by dragging a Morph into the Preview, creating a new one in the Preview or pasting it from the clipboard.',
      fontWeight: 'bold',
      fontSize: 15
    });
    placeholder.addMorph(label);
    this.ui.layerContainer.addMorphAt(placeholder, 0);
    this.ui.scrollableContainer.clipMode = 'hidden';
  }

  removePlaceholder () {
    const placeholder = this.get('placeholder');
    if (placeholder) placeholder.remove();
    this.ui.scrollableContainer.clipMode = 'auto';
  }

  addLayerInfoFor (timelineLayer, name, index) {
    const layerInfo = new SequenceTimelineLayerInfo({ timelineLayer, name });
    timelineLayer.layerInfo = layerInfo;
    this.ui.layerInfoContainer.addMorphAt(layerInfo, index);
  }

  deselectAllTimelineKeyframesExcept (timelineKeyframe) {
    this.selectedTimelineKeyframes.forEach(keyframe => keyframe.isSelected = false);
    timelineKeyframe.isSelected = true;
  }

  deselectAllItems () {
    this.selectedTimelineKeyframes.forEach(keyframe => keyframe.isSelected = false);
  }

  deleteSelectedItems () {
    arr.invoke(this.selectedTimelineKeyframes, 'delete');
  }

  async scrollToKeyframe (keyframe, animation) {
    const overviewLayer = this.overviewLayers.find(overviewLayer => overviewLayer.morph === animation.target);
    if (!overviewLayer.isExpanded) overviewLayer.isExpanded = true;
    const timelineKeyframe = this.getTimelineKeyframe(keyframe);

    // Make sure that the layout is applied, thus layer positions are set
    if (!this.ui.layerContainer.layout.active) this.ui.layerContainer.layout.apply();

    this.scrollToTimelineKeyframe(timelineKeyframe);

    // If this line is removed, the scroll does not happen (Race issue)
    await new Promise(r => setTimeout(r, 30));

    timelineKeyframe.show();
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
    this.editor.updateZoomInputNumber(this.zoomFactor);
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
      ? await $world.prompt(`Name for the ${this.selectedTimelineKeyframes.length} selected Keyframes:`)
      : await $world.prompt('Keyframe name:', { input: this.selectedTimelineKeyframes[0].name });

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
      if (newPosition >= 0 && newPosition <= this.interactive.length && newRelativePosition >= 0 && newRelativePosition <= 1) {
        this.changeKeyframePositionForSelection(newRelativePosition);
      } else {
        await $world.inform('Enter a valid scroll position inside this sequence.');
        await this.promptUserForNewAbsolutePositionForSelection(multipleKeyframesSelected);
      }
    }
  }

  menuItems () {
    const menuItems = [];
    if (this.editor.clipboard.containsMorph) menuItems.push(['✏️ Paste Morph', () => this.editor.pasteMorphFromClipboard()]);
    return menuItems;
  }

  redraw () {
    super.redraw();
    this._activeAreaWidth = CONSTANTS.IN_EDIT_MODE_SEQUENCE_WIDTH * this.zoomFactor;
    this.timelineLayers.forEach(timelineLayer => timelineLayer.redraw());
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

  updateAnimationLayer (animation) {
    this.withAllSubmorphsDo(submorph => {
      if (submorph.isTimelineLayer && submorph.morph == animation.target) {
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

  abandon (bool) {
    disconnect(this.sequence, 'name', this, 'name');
    super.abandon(bool);
  }
}
