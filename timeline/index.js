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

export class Timeline extends Morph {
  static get properties () {
    return {
      ui: {
        initialize () {
          this.ui = {};
        }
      },
      interactive: {},
      _editor: {},
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
          this.setProperty('zoomFactor', zoomFactor);
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

  initialize (editor) {
    this._editor = editor;
    this.ui.scrollableContainer = new Morph(
      {
        name: 'scrollable container',
        extent: pt(this.extent.x, this.extent.y - CONSTANTS.CUSTOM_SCROLLBAR_HEIGHT),
        clipMode: 'auto'
      });
    this.addMorph(this.ui.scrollableContainer);
    this.initializeLayerInfoContainer();

    this.initializeLayerContainer();
    connect(this.ui.layerContainer, 'extent', this.ui.scrollableContainer, 'height', { converter: ' (extent) => extent.y > timeline.height - scrollbarHeight ? timeline.height - scrollbarHeight : extent.y', varMapping: { timeline: this, scrollbarHeight: CONSTANTS.CUSTOM_SCROLLBAR_HEIGHT } }).update(this.ui.layerContainer.extent);
    this.initializeScrollBar();
  }

  relayout (newWindowExtent) {
    this.ui.scrollableContainer.extent = pt(newWindowExtent.x, this.owner.extent.y - CONSTANTS.CUSTOM_SCROLLBAR_HEIGHT);
    this.ui.layerContainer.extent = pt(newWindowExtent.x - this.scrollbarOffset.x - CONSTANTS.LAYER_INFO_WIDTH, this.owner.extent.y - CONSTANTS.CUSTOM_SCROLLBAR_HEIGHT);
    this.ui.scrollBar.extent = pt(newWindowExtent.x - this.scrollbarOffset.x - CONSTANTS.LAYER_INFO_WIDTH, this.ui.scrollBar.extent.y);
    this.ui.scrollBar.position = this.ui.layerContainer.bottomLeft;
  }

  initializeScrollBar () {
    this.ui.scrollBar = new Morph({
      name: 'scrollbar',
      position: pt(CONSTANTS.LAYER_INFO_WIDTH, this.height - CONSTANTS.CUSTOM_SCROLLBAR_HEIGHT),
      extent: pt(this.width - CONSTANTS.LAYER_INFO_WIDTH - this.scrollbarOffset.x, CONSTANTS.CUSTOM_SCROLLBAR_HEIGHT),
      fill: COLOR_SCHEME.PRIMARY
    });
    this.addScrollIndicator();
    this.addMorph(this.ui.scrollBar);
  }

  addScrollIndicator () {
    this.ui.scroller = this.ui.scrollBar.addMorph(new Morph({
      name: 'scroller',
      draggable: true,
      fill: COLOR_SCHEME.BACKGROUND_VARIANT,
      position: pt(2, 2),
      extent: pt(20, 11)
    }));
  }

  initializeCursor () {
    this.ui.cursor = new TimelineCursor();
    this.ui.cursor.initialize(0);
    this.ui.layerContainer.addMorph(this.ui.cursor);
    this.ui.cursor.location = this.getPositionFromScroll(0);
    this.ui.cursor.height = this.ui.layerContainer.height;
  }

  initializeLayerContainer () {
    this.ui.layerContainer = new Morph({
      name: 'layer container',
      clipMode: 'hidden',
      position: pt(CONSTANTS.LAYER_INFO_WIDTH, 0),
      extent: pt(this.width - CONSTANTS.LAYER_INFO_WIDTH - this.scrollbarOffset.x, this.height - CONSTANTS.CUSTOM_SCROLLBAR_HEIGHT),
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
        evt.stop();
      }
    };

    this.ui.scrollableContainer.addMorph(this.ui.layerContainer);
  }

  initializeLayerInfoContainer () {
    this.ui.layerInfoContainer = new Morph({
      name: 'layer info container',
      position: pt(0, 0),
      extent: pt(CONSTANTS.LAYER_INFO_WIDTH, this.height - CONSTANTS.CUSTOM_SCROLLBAR_HEIGHT),
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

  createTimelineLayer (layer, index = 0, name = undefined) {
    const timelineLayer = this.getNewTimelineLayer();
    timelineLayer.initialize(this.editor, this.ui.layerContainer, layer);
    this.ui.layerContainer.addMorphAt(timelineLayer, index);

    const layerInfo = new TimelineLayerInfo({ timelineLayer: timelineLayer, name });
    timelineLayer.layerInfo = layerInfo;
    this.ui.layerInfoContainer.addMorphAt(layerInfo, index);
    return timelineLayer;
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
      this.initialize(this.editor);
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
    // keep 2px margin at both left and right end of the scrollbar
    this.ui.scroller.extent = pt((visiblePortion * scrollbarWidth) - 4, this.ui.scroller.extent.y);
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
    const seq = new TimelineSequence();
    seq.initialize(this.editor, sequence, this.getTimelineLayerFor(sequence.layer));
    return seq;
  }

  createTimelineSequenceInHand (sequence) {
    const newTimelineSequence = this.createTimelineSequence(sequence);
    const hand = $world.firstHand;
    hand.grab(newTimelineSequence);
    newTimelineSequence.onGrabStart(hand);
    newTimelineSequence.center = pt(0, 0);
  }

  getNewTimelineLayer () {
    return new GlobalTimelineLayer();
  }

  onLoadContent (interactive) {
    this.editor.interactive.layers.sort((a, b) => a.zIndex - b.zIndex).forEach(layer => this.createTimelineLayer(layer));
    connect(this.editor.interactive, 'onLengthChange', this, '_activeAreaWidth', { converter: '(length) => target.getWidthFromDuration(length)' }).update(this.editor.interactive.length);
    this.editor.interactive.sequences.forEach(sequence => {
      const timeline_seq = this.createTimelineSequence(sequence);
      connect(sequence, 'name', timeline_seq, 'caption');
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

  deselectAllSequences () {
    this.timelineLayers.forEach(timelineLayer => {
      timelineLayer.deselectAllSequences();
    });
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
      const timelineKeyframe = timelineLayer.addMorph(new TimelineKeyframe().initialize(this.editor, keyframe, animation));
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

  getNewTimelineLayer () {
    return this._inInitialConstruction ? new OverviewSequenceTimelineLayer() : new SequenceTimelineLayer();
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
}
