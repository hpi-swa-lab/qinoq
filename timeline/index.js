import { pt } from 'lively.graphics';
import { Morph, VerticalLayout } from 'lively.morphic';
import { TimelineCursor } from './cursor.js';
import { connect, disconnect } from 'lively.bindings';
import { TimelineSequence } from './sequence.js';
import { GlobalTimelineLayer, OverviewSequenceTimelineLayer, SequenceTimelineLayer } from './layer.js';
import { TimelineKeyframe } from './keyframe.js';
import { CONSTANTS } from './constants.js';
import { TimelineLayerInfo } from './layer-info.js';
import { COLOR_SCHEME } from '../colors.js';
import { arr } from 'lively.lang';
import { ListPrompt } from 'lively.components/prompts.js';
import { Keyframe, Sequence } from 'qinoq';

export class Timeline extends Morph {
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
          this.undoStart('interactive-editor-change-zoom');
          this.setProperty('zoomFactor', zoomFactor);
          this.undoStop('interactive-editor-change-zoom');
          if (!this.editor.interactive) return;
          this.redraw();
        }
      },
      _activeAreaWidth: {
        defaultValue: CONSTANTS.IN_EDIT_MODE_SEQUENCE_WIDTH,
        set (width) {
          this.setProperty('_activeAreaWidth', width);
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
    this.addScrollbarSubmorphs();
    this.addMorph(this.ui.scrollBar);
  }

  addScrollbarSubmorphs () {
    this.ui.scroller = this.ui.scrollBar.addMorph(new Morph({
      name: 'scroller',
      fill: COLOR_SCHEME.BACKGROUND_VARIANT,
      position: pt(CONSTANTS.SCROLLBAR_MARGIN, CONSTANTS.SCROLLBAR_MARGIN),
      extent: pt(0, CONSTANTS.VERTICAL_SCROLLBAR_HEIGHT - (2 * CONSTANTS.SCROLLBAR_MARGIN)),
      borderRadius: 10
    }));

    this.ui.scrollbarCursor = this.ui.scrollBar.addMorph(new Morph({
      name: 'scrollbar cursor',
      fill: COLOR_SCHEME.SECONDARY,
      position: pt(0, 0),
      extent: pt(10, CONSTANTS.VERTICAL_SCROLLBAR_HEIGHT - (2 * CONSTANTS.SCROLLBAR_MARGIN)),
      borderRadius: 10
    }));
    connect(this.editor, 'interactiveScrollPosition', this.ui.scrollbarCursor, 'position', {
      converter: `(scrollPosition) => {
      const relative = (scrollBar.extent.x - target.extent.x) / source.interactive.length;
      return pt((relative * scrollPosition), scrollbarMargin)
    }`,
      varMapping: { pt: pt, scrollBar: this.ui.scrollBar, scrollbarMargin: CONSTANTS.SCROLLBAR_MARGIN }
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

    this.ui.layerContainer.onMouseWheel = (evt) => {
      if (evt.domEvt.metaKey) {
        this.zoomFactor = evt.domEvt.deltaY > 0 ? this.zoomFactor + 0.1 : this.zoomFactor - 0.1;
        evt.stop();
      }
      if (evt.domEvt.altKey) {
        const layerContainerNode = this.ui.scrollableContainer.env.renderer.getNodeForMorph(this.ui.layerContainer);
        layerContainerNode.scrollLeft = layerContainerNode.scrollLeft + evt.domEvt.deltaY;
        this.ui.layerContainer.setProperty('scroll', pt(layerContainerNode.scrollLeft, layerContainerNode.scrollTop));
        const relative = (this.ui.scrollBar.extent.x - this.ui.scroller.extent.x - (2 * CONSTANTS.SCROLLBAR_MARGIN)) / (this.ui.layerContainer.scrollExtent.x - this.ui.layerContainer.extent.x - this.ui.layerContainer.scrollbarOffset.x);
        this.ui.scroller.position = pt(this.ui.layerContainer.scroll.x * relative + CONSTANTS.SCROLLBAR_MARGIN, CONSTANTS.SCROLLBAR_MARGIN);
        evt.stop();
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
    this._inInitialConstruction = true;
    this.onLoadContent(content);
    this.initializeCursor();
    connect(this.editor, 'interactiveScrollPosition', this, 'onScrollChange', {
      updater: '($update, scrollPosition) => { if (target.isDisplayed) $update(scrollPosition); }'
    }).update(this.editor.interactiveScrollPosition);
    connect(content, 'name', this, 'name', { converter: newName => `${newName.toLowerCase()} timeline` }).update(content.name);
    this._inInitialConstruction = false;
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

  get activeArea () {
    return this.getSubmorphNamed('active area');
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
    disconnect(this.editor, 'interactiveScrollPosition', this, 'onScrollChange');
    disconnect(this.editor.interactive, 'name', this, 'name');
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
    allSequences.forEach(sequence => sequence.selected = false);
  }

  get sequences () {
    return this.timelineLayers.flatMap(timelineLayer => timelineLayer.timelineSequences);
  }

  get selectedSequences () {
    return this.sequences.filter(sequence => sequence.selected);
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
      allSequences.forEach(sequence => sequence.selected = true);
    }
  }

  get isGlobalTimeline () {
    return true;
  }

  moveTimelineSequencesBy (timelineSequences, scrollStepSize) {
    this.undoStart('timeline-sequence-move');

    let faultyTimelineSequence;
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
        faultyTimelineSequence = timelineSequence;
        if (scrollStepSize > 0) {
          timelineSequence.showWarningRight(CONSTANTS.FULL_WARNING_OPACITY_AT_DRAG_DELTA, true);
          timelineSequence.hideWarningRight();
        } else {
          timelineSequence.showWarningLeft(CONSTANTS.FULL_WARNING_OPACITY_AT_DRAG_DELTA, true);
          timelineSequence.hideWarningLeft();
        }
      }
    });

    this.undoStop('timeline-sequence-move');

    if (faultyTimelineSequence) faultyTimelineSequence.undoLatestMovement(timelineSequenceStates);
  }

  clear () {
    this.timelineLayers.flatMap(timelineLayer => timelineLayer.timelineSequences).forEach(timelineSequence => timelineSequence.disbandInteractiveConnections());
  }

  deleteSelectedItems () {
    arr.invoke(this.selectedSequences, 'abandon');
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
    const sequenceTimelineLayer = this.ui.layerContainer.submorphs.filter(submorph => submorph.isTimelineLayer);
    return sequenceTimelineLayer.flatMap(layer => layer.submorphs.filter(submorph => submorph.isTimelineKeyframe && submorph.isSelected));
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

  createTimelineLayer (morph) {
    const timelineLayer = super.createTimelineLayer(morph);
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
      this.addTimelineKeyframesForLayer(timelineLayer);
    });
  }

  addTimelineKeyframesForLayer (timelineLayer) {
    this.sequence.getAnimationsForMorph(timelineLayer.morph).forEach(animation => {
      this.addKeyframesForAnimation(animation, timelineLayer);
    });
    timelineLayer.redraw();
  }

  addKeyframesForAnimation (animation, timelineLayer) {
    animation.keyframes.forEach(keyframe => {
      const timelineKeyframe = timelineLayer.addMorph(new TimelineKeyframe({ _editor: this.editor, _keyframe: keyframe, animation }));
      timelineKeyframe.updatePosition();
    });
  }

  redraw () {
    super.redraw();
    this.keyframes.forEach(keyframe => {
      keyframe._lockModelUpdate = true;
      keyframe.position = pt(this.getPositionFromKeyframe(keyframe), keyframe.position.y);
      keyframe._lockModelUpdate = false;
    });
    this._activeAreaWidth = CONSTANTS.IN_EDIT_MODE_SEQUENCE_WIDTH * this.zoomFactor;
    this.timelineLayers.forEach(timelineLayer => timelineLayer.redraw());
  }

  get keyframes () {
    return this.timelineLayers.flatMap(timelineLayer => timelineLayer.keyframes);
  }

  getTimelineKeyframe (keyframe) {
    return this.keyframes.find(timelineKeyframe => timelineKeyframe.keyframe == keyframe);
  }

  updateLayers () {
    this.withAllSubmorphsDo(submorph => {
      if (submorph.isTimelineLayer) {
        if (submorph.isOverviewLayer) {
          if (!submorph.isExpanded) {
            submorph.updateTimelineKeyframes();
          } else {
            this.removePropertyLayers(submorph);
            this.createPropertyLayers(submorph);
          }
        }
      }
    });
  }

  createPropertyLayers (timelineLayer) {
    const morph = timelineLayer.morph;
    const indexInLayerContainer = timelineLayer.index;
    this.sequence.getAnimationsForMorph(morph).forEach(animation => {
      // we assume that each sequence only holds one animation per morph per property
      const animationLayer = super.createTimelineLayer(morph, indexInLayerContainer + 1, animation.property);
      animationLayer.animation = animation;
      this.addKeyframesForAnimation(animation, animationLayer);
    });
    this.onActiveAreaWidthChange();
  }

  removePropertyLayers (timelineLayer) {
    const morph = timelineLayer.morph;
    this.withAllSubmorphsDo(submorph => {
      if (submorph.isTimelineLayer && submorph.morph === morph && !submorph.isOverviewLayer) {
        submorph.layerInfo.remove();
        submorph.remove();
      }
    });
  }

  getNewTimelineLayer (props) {
    return this._inInitialConstruction ? new OverviewSequenceTimelineLayer(props) : new SequenceTimelineLayer(props);
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

  getScrollFromKeyframe (timelineKeyframe) {
    return this.sequence.getAbsolutePositionFor(timelineKeyframe.keyframe);
  }

  getPositionFromKeyframe (timelineKeyframe) {
    return this.getPositionFromScroll(this.getScrollFromKeyframe(timelineKeyframe));
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
    arr.invoke(this.selectedTimelineKeyframes, 'abandon');
  }

  async promptEasingForSelection (multipleKeyframesSelected) {
    const possibleEasings = Keyframe.possibleEasings;
    const listPrompt = new ListPrompt({ label: `Set Easing for the ${this.selectedTimelineKeyframes.length} selected Keyframe(s)`, items: possibleEasings, filterable: true });
    listPrompt.preselect = false;
    if (!multipleKeyframesSelected) {
      const preselectIndex = possibleEasings.indexOf(this.selectedTimelineKeyframes[0].keyframe.easingName);
      listPrompt.preselect = preselectIndex; // TODO: Make this work consistently (fails sometimes because building listprompt is not done yet (whenRendered is no option, this takes a few seconds))
    }
    const result = await $world.openPrompt(listPrompt);
    if (result.selected.length > 0) {
      this.setEasingForSelection(result.selected[0]);
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
    let newName;
    if (!multipleKeyframesSelected) {
      newName = await $world.prompt('Keyframe name:', { input: this.selectedTimelineKeyframes[0].name });
    } else {
      newName = await $world.prompt(`Name for the ${this.selectedTimelineKeyframes.length} selected Keyframes:`);
    }
    if (newName) {
      this.renameSelection(newName);
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
    let newPosition;
    if (!multipleKeyframesSelected) {
      newPosition = await $world.prompt('Keyframe position:', { input: `${this.selectedTimelineKeyframes[0].keyframe.position}` });
    } else {
      newPosition = await $world.prompt(`Set the ${this.selectedTimelineKeyframes.length} selected Keyframes to relative position:`);
    }
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
      timelineKeyframe.changeKeyframePosition(newPosition);
    });
    this.undoStop('move-keyframe');
  }

  async promptUserForNewAbsolutePositionForSelection (multipleKeyframesSelected) {
    const sequence = Sequence.getSequenceOfMorph(this.selectedTimelineKeyframes[0].animation.target);
    let newPosition;
    if (!multipleKeyframesSelected) {
      newPosition = await $world.prompt('Keyframe position:', { input: `${sequence.getAbsolutePositionFor(this.selectedTimelineKeyframes[0].keyframe)}` });
    } else {
      newPosition = await $world.prompt(`Set the ${this.selectedTimelineKeyframes.length} selected Keyframes to absolute position:`);
    }
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
    const timelineKeyframeX = timelineKeyframe.position.x;
    const timelineKeyframeIsVisible = timelineKeyframeX >= this.ui.layerContainer.scroll.x && timelineKeyframeX <= this.ui.layerContainer.extent.x + this.ui.layerContainer.scroll.x;
    if (timelineKeyframeIsVisible) return;

    const scrollTo = timelineKeyframeX - this.ui.layerContainer.extent.x / 2;
    this.scrollVerticallyTo(scrollTo);
  }

  scrollVerticallyTo (scrollLeft) {
    const layerContainerNode = this.ui.scrollableContainer.env.renderer.getNodeForMorph(this.ui.layerContainer);
    layerContainerNode.scrollLeft = scrollLeft;
    this.ui.layerContainer.setProperty('scroll', pt(layerContainerNode.scrollLeft, layerContainerNode.scrollTop));
    const relative = (this.ui.scrollBar.extent.x - this.ui.scroller.extent.x - (2 * CONSTANTS.SCROLLBAR_MARGIN)) / (this.ui.layerContainer.scrollExtent.x - this.ui.layerContainer.extent.x - this.ui.layerContainer.scrollbarOffset.x);
    this.ui.scroller.position = pt(this.ui.layerContainer.scroll.x * relative + CONSTANTS.SCROLLBAR_MARGIN, CONSTANTS.SCROLLBAR_MARGIN);
  }
}
