import { Morph, Icon, HorizontalLayout, ProportionalLayout, Label, VerticalLayout } from 'lively.morphic';
import { pt, LinearGradient, rect, Color } from 'lively.graphics';
import { connect } from 'lively.bindings';
import { COLOR_SCHEME } from './colors.js';

const CONSTANTS = {
  LAYER_INFO_WIDTH: 50,
  LAYER_HEIGHT: 50,
  SEQUENCE_HEIGHT: 40,
  DEFAULT_SEQUENCE_WIDTH: 100,
  SEQUENCE_INITIAL_X_OFFSET: 16,
  SEQUENCE_LAYER_Y_OFFSET: 5,
  MINIMAL_SEQUENCE_WIDTH: 20,
  CURSOR_WIDTH: 2,
  CURSOR_FONT_SIZE: 10,
  WARNING_WIDTH: 8,
  FULL_WARNING_OPACITY_AT_DRAG_DELTA: 50,
  IN_EDIT_MODE_SEQUENCE_WIDTH: 800,
  KEYFRAME_EXTENT: pt(23, 23)
};

export class Timeline extends Morph {
  static get properties () {
    return {
      ui: {
        defaultValue: {}
      },
      interactive: {},
      _timelineLayerDict: {
        defaultValue: {}
      },
      clipMode: {
        defaultValue: 'auto'
      }
    };
  }

  initialize () {
    this.layout = new ProportionalLayout({ lastExtent: this.extent });
    this.initializeLayerInfoContainer();
    this.initializeLayerContainer();
  }

  initializeCursor () {
    this.ui.cursor = new TimelineCursor();
    this.ui.cursor.initialize(0);
    this.ui.layerContainer.addMorph(this.ui.cursor);
    this.ui.cursor.location = this.getPositionFromScroll(0);
    this.ui.cursor.height = this.height;
  }

  initializeLayerContainer () {
    this.ui.layerContainer = new Morph({
      name: 'layer container',
      position: pt(CONSTANTS.LAYER_INFO_WIDTH, 0),
      extent: pt(this.width - CONSTANTS.LAYER_INFO_WIDTH, this.height),
      layout: new VerticalLayout({
        spacing: 2,
        resizeSubmorphs: true,
        autoResize: true,
        orderByIndex: true
      })
    });
    this.addMorph(this.ui.layerContainer);
  }

  initializeLayerInfoContainer () {
    this.ui.layerInfoContainer = new Morph({
      name: 'layer info container',
      position: pt(0, 0),
      extent: pt(this.height, CONSTANTS.LAYER_INFO_WIDTH),
      layout: new VerticalLayout({
        spacing: 2,
        resizeSubmorphs: true,
        autoResize: false,
        orderByIndex: true
      })
    });
    this.addMorph(this.ui.layerInfoContainer);
  }

  createTimelineLayer (layer, index = 0, name = undefined) {
    const timelineLayer = this.getNewTimelineLayer();
    timelineLayer.initialize(this.ui.layerContainer, layer);
    this.ui.layerContainer.addMorphAt(timelineLayer, index);
    const layerInfo = new Morph();
    layerInfo.height = CONSTANTS.LAYER_HEIGHT;
    layerInfo.layerLabel = (new Label({
      textString: name || layer.name
    }));
    timelineLayer.layerInfo = layerInfo;
    layerInfo.addMorph(layerInfo.layerLabel);
    this.ui.layerInfoContainer.addMorphAt(layerInfo, index);
    this._timelineLayerDict[layer.id] = timelineLayer;
    return timelineLayer;
  }

  arrangeLayerInfos () {
    this.ui.layerInfoContainer.removeAllMorphs();
    const layerInfos = new Array(this.timelineLayers.length);
    this.timelineLayers.forEach(timelineLayer => {
      layerInfos[timelineLayer.index] = timelineLayer.layerInfo;
    });
    this.ui.layerInfoContainer.submorphs = layerInfos;
    this.ui.layerInfoContainer.layout.apply();
  }

  updateLayerPositions () {
    this.interactive.layers.forEach(layer => {
      const timelineLayer = this.getTimelineLayerFor(layer);
      timelineLayer.position = pt(timelineLayer.position.x, -layer.zIndex);
    });
    this.arrangeLayerInfos();
  }

  getTimelineLayerFor (layer) {
    return this._timelineLayerDict[layer.id];
  }

  relayout (availableWidth) {
    this.ui.layerInfoContainer.position = pt(0, 0); // Align the container to the left of the layers
    this.ui.layerInfoContainer.width = CONSTANTS.LAYER_INFO_WIDTH;
    this.ui.layerContainer.width = availableWidth - this.ui.layerInfoContainer.width - this.layout.spacing;
  }

  get timelineLayers () {
    return Object.values(this._timelineLayerDict);
  }

  loadContent (content) {
    this._inInitialConstruction = true;
    this.onLoadContent(content);
    this.initializeCursor();
    this.onScrollChange(this.editor.interactiveScrollPosition);
    connect(this.editor, 'interactiveScrollPosition', this, 'onScrollChange');
    this._inInitialConstruction = false;
  }

  onLoadContent (content) {
    throw new Error('Subclass resposibility');
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

  get editor () {
    return this.owner;
  }
}
export class GlobalTimeline extends Timeline {
  createTimelineSequence (sequence) {
    const seq = new TimelineSequence();
    seq.initialize(sequence, this.getTimelineLayerFor(sequence.layer));
  }

  getNewTimelineLayer () {
    return new GlobalTimelineLayer();
  }

  onLoadContent (interactive) {
    this.interactive = interactive;

    this.interactive.layers.forEach(layer => {
      const timelineLayer = this.createTimelineLayer(layer);
    });
    this.interactive.sequences.forEach(sequence => this.createTimelineSequence(sequence));
    this.updateLayerPositions();
  }

  getDisplayValueFromScroll (scrollPosition) {
    return Math.round(scrollPosition);
  }

  getPositionFromScroll (scrollPosition) {
    return scrollPosition + CONSTANTS.SEQUENCE_INITIAL_X_OFFSET;
  }

  getScrollFromPosition (position) {
    return position - CONSTANTS.SEQUENCE_INITIAL_X_OFFSET;
  }

  getWidthFromDuration (duration) {
    return duration;
  }

  getDurationFromWidth (width) {
    return width;
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

  deselectAllSequences () {
    this.timelineLayers.forEach(timelineLayer => {
      timelineLayer.deselectAllSequences();
    });
  }
}

export class SequenceTimeline extends Timeline {
  createOverviewTimelineLayer (morph) {
    const timelineLayer = super.createTimelineLayer(morph);
    timelineLayer.addCollapseToggle();
    return timelineLayer;
  }

  onLoadContent (sequence) {
    this.sequence = sequence;
    this.sequence.submorphs.forEach(morph => {
      const timelineLayer = this.createOverviewTimelineLayer(morph);
      this.addTimelineKeyframesForLayer(timelineLayer);
    });
  }

  addTimelineKeyframesForLayer (timelineLayer) {
    this.sequence.getAnimationsForMorph(timelineLayer.morph).forEach(animation => {
      this.addKeyframesForAnimation(animation, timelineLayer);
    });
  }

  addKeyframesForAnimation (animation, timelineLayer) {
    animation.keyframes.forEach(keyframe => {
      timelineLayer.addMorph(new TimelineKeyframe().initialize(keyframe, animation));
    });
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
      this.addKeyframesForAnimation(animation, animationLayer);
    });
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
      return CONSTANTS.IN_EDIT_MODE_SEQUENCE_WIDTH + CONSTANTS.SEQUENCE_INITIAL_X_OFFSET;
    }
    return (CONSTANTS.IN_EDIT_MODE_SEQUENCE_WIDTH * this.sequence.progress) + CONSTANTS.SEQUENCE_INITIAL_X_OFFSET;
  }

  getDisplayValueFromScroll (scrollPosition) {
    return this.sequence.progress.toFixed(2);
  }
}

export class TimelineKeyframe extends Morph {
  static get properties () {
    return {
      extent: {
        defaultValue: CONSTANTS.KEYFRAME_EXTENT
      },
      fill: {
        defaultValue: COLOR_SCHEME.SECONDARY
      },
      rotation: {
        defaultValue: Math.PI / 4
      },
      keyframe: {
        set (keyframe) {
          this.setProperty('keyframe', keyframe);
          this.name = keyframe.name;
          this.position = this.getPositionFromProgress(this.keyframe.position);
        }
      },
      animation: {},
      name: {
        type: String,
        set (name) {
          this.setProperty('name', name);
          this.tooltip = this.name;
          if (this.keyframe) {
            this.keyframe.name = this.name;
          }
        }
      }
    };
  }

  initialize (keyframe, animation) {
    this.animation = animation;
    this.keyframe = keyframe;
    return this;
  }

  getPositionFromProgress (progress) {
    const x = (CONSTANTS.IN_EDIT_MODE_SEQUENCE_WIDTH * progress) + CONSTANTS.SEQUENCE_INITIAL_X_OFFSET;
    const y = (CONSTANTS.LAYER_HEIGHT / 2) - (Math.sqrt(2) * CONSTANTS.KEYFRAME_EXTENT.x / 2);
    return pt(x, y);
  }

  menuItems (evt) {
    return [
      ['Rename Keyframe', async () => this.name = await $world.prompt('Keyframe name:', { input: this.keyframe.name })],
      ['Delete Keyframe', () => this.remove()],
      ['Edit Keyframe Position (0 to 1)', async () => { await this.promptUserForNewPosition(); }]
    ];
  }

  async promptUserForNewPosition () {
    const newPosition = await $world.prompt('Keyframe position:', { input: this.keyframe.position });
    if (newPosition) {
      if (newPosition >= 0 && newPosition <= 1) {
        this.keyframe.position = newPosition;
        this.position = this.getPositionFromProgress(this.keyframe.position);
      } else {
        await $world.inform('Enter a value between 0 and 1.');
        await this.promptUserForNewPosition();
      }
    }
  }

  remove () {
    this.animation.removeKeyframe(this.keyframe);
    this.removeMorph();
  }

  removeMorph () {
    super.remove();
  }

  get isTimelineKeyframe () {
    return true;
  }
}

export class TimelineLayer extends Morph {
  static get properties () {
    return {
      layerInfo: {},
      container: {},
      focusable: {
        defaultValue: false
      },
      fill: {
        defaultValue: COLOR_SCHEME.BACKGROUND_VARIANT
      },
      height: {
        defaultValue: CONSTANTS.LAYER_HEIGHT
      }
    };
  }

  initialize (container, layer) {
    this.container = container;
    this.addActiveAreaMorph();
  }

  isTimelineLayer () {
    return true;
  }

  relayout () {
    this.height = CONSTANTS.LAYER_HEIGHT;
  }

  get timeline () {
    return this.owner.owner;
  }

  get name () {
    return this.layer.name;
  }

  updateLayerPosition () {
    this.timeline.updateLayerPositions();
  }

  get index () {
    return this.container.submorphs.indexOf(this);
  }

  addActiveAreaMorph () {
    this.addMorph(new Morph({
      extent: pt(CONSTANTS.IN_EDIT_MODE_SEQUENCE_WIDTH, CONSTANTS.LAYER_HEIGHT),
      position: pt(CONSTANTS.SEQUENCE_INITIAL_X_OFFSET, 0),
      fill: COLOR_SCHEME.SURFACE_VARIANT,
      reactsToPointer: false,
      name: 'active area',
      acceptsDrops: false
    }));
  }
}

export class SequenceTimelineLayer extends TimelineLayer {
  static get properties () {
    return {
      morph: {}
    };
  }

  initialize (container, morph) {
    super.initialize(container);
    this.tooltip = morph.name;
    this.morph = morph;
  }
}

export class GlobalTimelineLayer extends TimelineLayer {
  static get properties () {
    return {
      grabbable: {
        defaultValue: true
      },
      draggable: {
      // setting grabbable sets draggable to true but only via the setter and not with the default value, but we need draggable to be true as well
        defaultValue: true
      },
      nativeCursor: {
        defaultValue: 'grab'
      },
      layer: {}
    };
  }

  initialize (container, layer) {
    super.initialize(container);
    this.layer = layer;
    this.tooltip = layer.name;
  }

  get timelineSequences () {
    return this.submorphs.filter(submorph => !!submorph.isTimelineSequence);
  }

  onHoverIn (event) {
    super.onHoverIn(event);
    if (event.hand.dragTimelineSequenceStates) {
      event.hand.dragTimelineSequenceStates.forEach(dragState => {
        dragState.timelineSequence.timelineLayer = this;
      });
    }
  }

  onMouseDown (event) {
    super.onMouseDown(event);
    this.timeline.deselectAllSequences();
  }

  onBeingDroppedOn (hand, recipient) {
    let index = (hand.position.y - this.container.globalPosition.y) / (this.extent.y + 2 * this.container.layout.spacing);
    if (index < 0) {
      index = 0;
    }
    if (index > this.container.submorphs.length - 1) {
      index = this.container.submorphs.length - 1;
    }
    this.container.addMorphAt(this, Math.round(index));
    this.timeline.arrangeLayerInfos();
    this.timeline.updateZIndicesFromTimelineLayerPositions();
  }

  getAllSequencesIntersectingWith (rectangle) {
    return this.timelineSequences.filter(timelineSequence => timelineSequence.bounds().intersects(rectangle));
  }

  deselectAllSequences () {
    this.timelineSequences.forEach(timelineSequence => {
      timelineSequence.selected = false;
    });
  }
}

class OverviewSequenceTimelineLayer extends SequenceTimelineLayer {
  static get properties () {
    return {
      isExpanded: {
        defaultValue: false,
        set (isExpanded) {
          this.setProperty('isExpanded', isExpanded);
          if (this.layerInfo && this.layerInfo.getSubmorphNamed('collapseButton')) {
            isExpanded ? this.expand() : this.collapse();
          }
        }
      },
      isOverviewLayer: {
        defaultValue: true
      }
    };
  }

  addCollapseToggle () {
    const arrowLabel = new Label({ name: 'collapseButton', position: pt(10, 10), fontSize: 15 });
    Icon.setIcon(arrowLabel, 'caret-right');
    arrowLabel.nativeCursor = 'pointer';
    this.layerInfo.addMorph(arrowLabel);
    arrowLabel.onMouseDown = (evt) => {
      this.isExpanded = !this.isExpanded;
      this.owner.whenRendered().then(() => this.timeline.ui.cursor.height = this.timeline.ui.layerContainer.height);
    };
  }

  collapse () {
    const arrowLabel = this.layerInfo.getSubmorphNamed('collapseButton');
    Icon.setIcon(arrowLabel, 'caret-right');
    this.opacity = 1;
    this.tooltip = this.morph.name;
    this.reactsToPointer = true;
    this.timeline.addTimelineKeyframesForLayer(this);
    this.timeline.removePropertyLayers(this);
  }

  expand () {
    const arrowLabel = this.layerInfo.getSubmorphNamed('collapseButton');
    Icon.setIcon(arrowLabel, 'caret-down');
    this.opacity = 0;
    this.tooltip = '';
    this.reactsToPointer = false;
    this.removeAllTimelineKeyframes();
    this.timeline.createPropertyLayers(this);
  }

  removeAllTimelineKeyframes () {
    this.withAllSubmorphsDo(submorph => {
      if (submorph.isTimelineKeyframe) {
        submorph.removeMorph();
      }
    });
  }

  updateTimelineKeyframes () {
    this.removeAllTimelineKeyframes();
    this.timeline.addTimelineKeyframesForLayer(this);
  }
}

export class TimelineSequence extends Morph {
  static get properties () {
    return {
      acceptsDrops: {
        defaultValue: false
      },
      draggable: {
        defaultValue: true
      },
      clipMode: {
        defaultValue: 'hidden'
      },
      nativeCursor: {
        defaultValue: 'default'
      },
      borderWidth: {
        defaultValue: 1
      },
      borderColor: {
        defaultValue: COLOR_SCHEME.ON_BACKGROUND
      },
      borderRadius: {
        defaultValue: 3
      },
      sequence: {
        set (sequence) {
          this.setProperty('sequence', sequence);
          this.tooltip = sequence.name;
        }
      },
      height: {
        defaultValue: CONSTANTS.SEQUENCE_HEIGHT
      },
      timelineLayer: {
        set (timelineLayer) {
          this.setProperty('timelineLayer', timelineLayer);
          if (!this._isInitializing) {
            this.onTimelineLayerChange(timelineLayer);
          }
        }
      },
      position: {
        set (position) {
          this.setProperty('position', position);
          if (!this._isInitializing) {
            this.updateSequenceAfterArrangement();
          }
        }
      },
      selected: {
        defaultValue: false,
        type: 'Boolean',
        set (selected) {
          this.setProperty('selected', selected);
          this.onSelectionChange(selected);
        }
      }
    };
  }

  initialize (sequence, timelineLayer) {
    this._isInitializing = true;
    this.sequence = sequence;
    this.timelineLayer = timelineLayer;

    const startPosition = timelineLayer.timeline.getPositionFromScroll(this.sequence.start);
    const endPosition = startPosition + timelineLayer.timeline.getWidthFromDuration(this.sequence.duration);
    this.position = pt(startPosition, CONSTANTS.SEQUENCE_LAYER_Y_OFFSET);
    this.width = endPosition - startPosition;
    this.addMorph(new Label({
      textString: sequence.name,
      padding: rect(5, 4, 0, 0),
      reactsToPointer: false
    }));
    timelineLayer.addMorph(this);
    this.initializeResizers();
    this._isInitializing = false;
  }

  initializeResizers () {
    const resizerProps = {
      fill: COLOR_SCHEME.TRANSPARENT,
      width: 7,
      draggable: true,
      nativeCursor: 'ew-resize',
      height: this.height
    };

    this.rightResizer = new Morph({
      name: 'right resizer',
      position: pt(this.width - resizerProps.width, 0),
      ...resizerProps
    });
    this.leftResizer = new Morph({
      name: 'left resizer',
      position: pt(0, 0),
      ...resizerProps
    });

    connect(this.rightResizer, 'onDrag', this, 'onResizeRight');
    connect(this.rightResizer, 'onDragStart', this, 'onResizeStart');
    connect(this.rightResizer, 'onDragEnd', this, 'onResizeEnd');
    connect(this.leftResizer, 'onDrag', this, 'onResizeLeft');
    connect(this.leftResizer, 'onDragStart', this, 'onResizeStart');
    connect(this.leftResizer, 'onDragEnd', this, 'onResizeEnd');

    this.addMorphBack(this.rightResizer);
    this.addMorphBack(this.leftResizer);
  }

  onDoubleMouseDown (event) {
    this.timeline.owner.initializeSequenceView(this.sequence);
  }

  onMouseDown (event) {
    super.onMouseDown(event);
    this.timeline.deselectAllSequences();
    this.selected = true;
    this.bringToFront();
  }

  onSelectionChange (selected) {
    this.borderColor = selected ? COLOR_SCHEME.PRIMARY : COLOR_SCHEME.ON_BACKGROUND;
  }

  onDragStart (event) {
    this.undoStart('timeline-sequence-move');
    event.hand.dragTimelineSequenceStates = [{
      timelineSequence: this,
      previousPosition: this.position,
      previousTimelineLayer: this.timelineLayer
    }];
  }

  onDragEnd (event) {
    this.undoStop('timeline-sequence-move');
    if (this.isOverlappingOtherSequence()) {
      const dragStates = event.hand.dragTimelineSequenceStates;
      dragStates.forEach(dragState => {
        const sequence = dragState.timelineSequence;
        sequence.position = dragState.previousPosition;
        sequence.remove();
        sequence.timelineLayer = dragState.previousTimelineLayer;
        sequence.updateAppearance();
        // this.env.undoManager.removeLatestUndo(); uncomment as soon as it is merged in the lively.next:master
      });
    }
    this.hideWarningLeft();
    this.hideWarningRight();
    delete event.hand.dragTimelineSequenceStates;
  }

  onDrag (event) {
    super.onDrag(event);
    if (this.position.x <= CONSTANTS.SEQUENCE_INITIAL_X_OFFSET) {
      this.position = pt(CONSTANTS.SEQUENCE_INITIAL_X_OFFSET, CONSTANTS.SEQUENCE_LAYER_Y_OFFSET);
      this.showWarningLeft(event.hand.position.x);
    } else {
      this.position = pt(this.position.x, CONSTANTS.SEQUENCE_LAYER_Y_OFFSET);
    }
    this.updateAppearance();
    this.updateSequenceAfterArrangement();
  }

  onTimelineLayerChange (timelineLayer) {
    this.timelineLayer.addMorph(this);
    this.sequence.layer = this.timelineLayer.layer;
    this.updateSequenceAfterArrangement();
  }

  isTimelineSequence () {
    return true;
  }

  get timeline () {
    return this.timelineLayer.timeline;
  }

  get interactive () {
    return this.timeline.interactive;
  }

  onResizeRight (event) {
    const newSequenceWidth = this.rightResizer.position.x + this.rightResizer.width;

    if (newSequenceWidth < CONSTANTS.MINIMAL_SEQUENCE_WIDTH) {
      this.showWarningRight(event.hand.position.x);
      this.extent = pt(CONSTANTS.MINIMAL_SEQUENCE_WIDTH, this.height);
      this.rightResizer.position = pt(CONSTANTS.MINIMAL_SEQUENCE_WIDTH - this.rightResizer.width, 0);
      this.updateSequenceAfterArrangement();
      return;
    }

    this.extent = pt(newSequenceWidth, this.height);
    this.rightResizer.position = pt(this.rightResizer.position.x, 0);

    if (this.isOverlappingOtherSequence()) {
      this.width = this.startWidth;
      this.rightResizer.position = pt(this.width - this.rightResizer.width, 0);
    }

    this.updateAppearance();
    this.updateSequenceAfterArrangement();
  }

  onResizeStart (event) {
    this.leftResizer.startUpperLeftCorner = this.leftResizer.globalPosition;
    this.rightResizer.startUpperRightCorner = pt(this.rightResizer.globalPosition.x + this.rightResizer.width, this.rightResizer.globalPosition.y);
    this.startWidth = this.width;
    this.startPosition = this.globalPosition;
  }

  onResizeLeft (event) {
    const dragDelta = event.startPosition.x - event.position.x;
    const newSequenceWidth = this.startWidth + dragDelta;
    const rightResizerGlobalPosition = this.rightResizer.globalPosition;

    const leftTimelineEnd = this.timelineLayer.globalPosition.x + CONSTANTS.SEQUENCE_INITIAL_X_OFFSET;

    const minimalSequenceWidthReached = newSequenceWidth <= CONSTANTS.MINIMAL_SEQUENCE_WIDTH;
    const leftEndOfTimelineReached = this.leftResizer.startUpperLeftCorner.x - dragDelta < leftTimelineEnd;

    // stop resizing due to minimal width
    if (minimalSequenceWidthReached) {
      this.extent = pt(CONSTANTS.MINIMAL_SEQUENCE_WIDTH, this.height);
      this.globalPosition = pt(rightResizerGlobalPosition.x + this.rightResizer.width - CONSTANTS.MINIMAL_SEQUENCE_WIDTH, this.globalPosition.y);
      this.showWarningLeft(dragDelta);
    }
    // stop resizing due to end of timeline
    else if (leftEndOfTimelineReached) {
      this.showWarningLeft(dragDelta);
      this.extent = pt(this.rightResizer.startUpperRightCorner.x - leftTimelineEnd, this.height);
      this.globalPosition = pt(leftTimelineEnd, this.owner.globalPosition.y + CONSTANTS.SEQUENCE_LAYER_Y_OFFSET);
    } else {
      this.globalPosition = pt(this.startPosition.x - dragDelta, this.globalPosition.y);
      this.extent = pt(newSequenceWidth, this.height);
    }

    this.updateAppearance();

    if (this.isOverlappingOtherSequence()) {
      this.width = this.startWidth;
      this.globalPosition = this.startPosition;
    }

    this.leftResizer.position = pt(0, 0);
    this.rightResizer.globalPosition = rightResizerGlobalPosition;

    this.updateSequenceAfterArrangement();
  }

  onResizeEnd (event) {
    this.hideWarningLeft();
    this.hideWarningRight();
    this.setDefaultAppearance();
  }

  updateSequenceAfterArrangement () {
    this.sequence.duration = this.timeline.getDurationFromWidth(this.width);
    this.sequence.start = this.timeline.getScrollFromPosition(this.position.x);
    this.timeline.interactive.redraw();
  }

  createWarningMorph (morphSuffix, morphPosition, gradientVector) {
    return new Morph({
      name: `warning ${morphSuffix}`,
      position: morphPosition,
      extent: pt(CONSTANTS.WARNING_WIDTH, CONSTANTS.SEQUENCE_HEIGHT),
      fill: new LinearGradient({
        vector: gradientVector,
        stops: [
          { offset: 0, color: COLOR_SCHEME.SECONDARY.withA(1) },
          { offset: 1, color: COLOR_SCHEME.SECONDARY.withA(0) }
        ]
      })
    });
  }

  showWarningLeft (dragValue) {
    const newWarning = !this.warningStartLeft;
    if (newWarning) this.warningStartLeft = dragValue;
    const currentDrag = this.warningStartLeft - dragValue;
    const strength = currentDrag / CONSTANTS.FULL_WARNING_OPACITY_AT_DRAG_DELTA;
    const warning = !newWarning
      ? this.getSubmorphNamed('warning left')
      : this.createWarningMorph('left', pt(0, 0), 'eastwest');
    warning.opacity = strength;
    this.addMorph(warning);
  }

  showWarningRight (dragValue) {
    const newWarning = !this.warningStartRight;
    if (newWarning) this.warningStartRight = dragValue;
    const currentDrag = this.warningStartRight - dragValue;
    const strength = currentDrag / CONSTANTS.FULL_WARNING_OPACITY_AT_DRAG_DELTA;
    const warning = !newWarning
      ? this.getSubmorphNamed('warning right')
      : this.createWarningMorph('right', pt(this.width - CONSTANTS.WARNING_WIDTH, 0), 'westeast');
    warning.opacity = strength;
    this.addMorph(warning);
  }

  hideWarning (morphSuffix, fadeout = 1000) {
    this.withAllSubmorphsDo(morph => {
      if (morph.name == `warning ${morphSuffix}`) morph.fadeOut(fadeout);
    });
  }

  hideWarningLeft (fadeout = 1000) {
    delete this.warningStartLeft;
    this.hideWarning('left', fadeout);
  }

  hideWarningRight (fadeout = 1000) {
    delete this.warningStartRight;
    this.hideWarning('right', fadeout);
  }

  setOverlappingAppearance () {
    this.fill = COLOR_SCHEME.ERROR;
  }

  setDefaultAppearance () {
    this.fill = COLOR_SCHEME.SURFACE;
    this.borderColor = COLOR_SCHEME.ON_BACKGROUND;
  }

  updateAppearance () {
    if (this.isOverlappingOtherSequence()) {
      this.setOverlappingAppearance();
    } else {
      this.setDefaultAppearance();
    }
  }

  isOverlappingOtherSequence () {
    const blockingSequences = this.timelineLayer.getAllSequencesIntersectingWith(this.bounds());
    return blockingSequences.length > 1; // must be > 1 since blockingSequences always contain the dragged sequence itself
  }
}

class TimelineCursor extends Morph {
  static get properties () {
    return {
      isLayoutable: {
        defaultValue: false
      },
      displayValue: {
        defaultValue: 0,
        type: 'Number',
        set (displayValue) {
          this.setProperty('displayValue', displayValue);
          this.redraw();
        }
      },
      location: {
        // location: where the cursor should point at
        // position: actual position of the morph, which is dependent on the location and the width of the cursor
        defaultValue: 0,
        type: 'Number',
        isFloat: false,
        set (location) {
          this.setProperty('location', location);
          this.updatePosition();
        }
      },
      fill: {
        defaultValue: COLOR_SCHEME.SECONDARY,
        set (color) {
          this.setProperty('fill', color);
          this.updateColor();
        }
      },
      fontColor: {
        defaultValue: COLOR_SCHEME.ON_SECONDARY,
        set (color) {
          this.setProperty('fontColor', color);
          this.updateColor();
        }
      },
      name: {
        defaultValue: 'cursor'
      },
      ui: {}
    };
  }

  initialize (displayValue = 0) {
    this.initializeSubmorphs();
    this.initializeAppearance();
    this.displayValue = displayValue;
  }

  initializeSubmorphs () {
    this.ui = {};
    this.ui.label = new Label({
      name: 'cursor/head/text',
      fontSize: CONSTANTS.CURSOR_FONT_SIZE,
      halosEnabled: false,
      reactsToPointer: false
    });
    this.ui.head = new Morph({
      name: 'cursor/head',
      layout: new HorizontalLayout({
        spacing: 3,
        autoResize: true
      }),
      halosEnabled: false,
      borderRadius: 4,
      submorphs: [this.ui.label]
    });
    this.ui.headCenter = new Morph({
      extent: pt(20, 1),
      halosEnabled: false,
      reactsToPointer: false,
      fill: COLOR_SCHEME.TRANSPARENT,
      layout: new HorizontalLayout({
        direction: 'centered',
        autoResize: false
      }),
      submorphs: [this.ui.head]
    });
    this.addMorph(this.ui.headCenter);
  }

  initializeAppearance () {
    this.extent = pt(CONSTANTS.CURSOR_WIDTH, 50);
    this.clipMode = 'overflow';
    this.ui.headCenter.position = pt(-this.ui.headCenter.width / 2 + 1, this.ui.headCenter.position.y);
    this.borderStyle = 'none';
    this.updateColor();
  }

  redraw () {
    this.ui.label.textString = this.displayValue.toString();
    this.updatePosition();
  }

  updateColor () {
    this.ui.head.fill = this.fill;
    this.ui.label.fontColor = this.fontColor;
  }

  updatePosition () {
    this.position = pt(this.location - this.width / 2 + 2, this.position.y);
  }
}
