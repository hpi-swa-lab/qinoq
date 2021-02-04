import { Morph, HorizontalLayout, ProportionalLayout, Label, VerticalLayout } from 'lively.morphic';
import { pt, Color } from 'lively.graphics';
import { connect } from 'lively.bindings';

const CONSTANTS = {
  LAYER_INFO_WIDTH: 50,
  LAYER_HEIGHT: 50,
  SEQUENCE_HEIGHT: 40,
  DEFAULT_SEQUENCE_WIDTH: 100,
  SEQUENCE_INITIAL_X_OFFSET: 5,
  SEQUENCE_LAYER_Y_OFFSET: 5
};

export class Timeline extends Morph {
  static get properties () {
    return {
      ui: {}
    };
  }

  constructor (props = {}) {
    super(props);
    this.layout = new ProportionalLayout({ lastExtent: this.extent });

    this.ui = {};

    this.initializeLayerInfoContainer();
    this.initializeLayerContainer();
    this.initializeCursor();
  }

  initializeCursor () {
    this.ui.cursor = new TimelineCursor();
    this.ui.layerContainer.addMorph(this.ui.cursor);
    this.onScrollPositionChange(0);
  }

  initializeLayerContainer () {
    this.ui.layerContainer = new Morph({
      name: 'layer container',
      position: pt(CONSTANTS.LAYER_INFO_WIDTH, 0),
      extent: pt(this.width - CONSTANTS.LAYER_INFO_WIDTH, this.height),
      layout: new VerticalLayout({
        spacing: 2,
        resizeSubmorphs: true,
        autoResize: true
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
        autoResize: false
      })
    });
    this.addMorph(this.ui.layerInfoContainer);
  }

  arrangeLayerInfos () {
    this.timelineLayers.forEach(timelineLayer => {
      const layerInfo = timelineLayer.layerInfo;
      layerInfo.position = pt(layerInfo.position.x, timelineLayer.position.y);
    });
  }

  updateLayerPositions () {
    this.interactive.layers.forEach(layer => {
      const timelineLayer = this.timelineLayerDict[layer.name];
      timelineLayer.position = pt(timelineLayer.position.x, -layer.zIndex);
    });
    this.arrangeLayerInfos();
  }

  relayout (availableWidth) {
    this.ui.layerInfoContainer.position = pt(0, 0); // Align the container to the left of the layers
    this.ui.layerInfoContainer.width = CONSTANTS.LAYER_INFO_WIDTH;
    this.ui.layerContainer.width = availableWidth - this.ui.layerInfoContainer.width - this.layout.spacing;
  }

  get timelineLayers () {
    return Object.values(this.timelineLayerDict);
  }

  createTimelineLayer (layer) {
    const timelineLayer = new TimelineLayer({
      container: this.ui.layerContainer,
      layer: layer
    });
    this.ui.layerContainer.addMorphBack(timelineLayer);
    const layerInfo = new Morph();
    layerInfo.height = CONSTANTS.LAYER_HEIGHT;
    layerInfo.layerLabel = (new Label({
      textString: layer.name
    }));
    timelineLayer.layerInfo = layerInfo;
    layerInfo.addMorph(layerInfo.layerLabel);
    this.ui.layerInfoContainer.addMorph(layerInfo);
    return timelineLayer;
  }

  createTimelineSequence (sequence) {
    return new TimelineSequence(sequence, this.timelineLayerDict[sequence.layer.name]);
  }

  loadContent (interactive) {
    this.interactive = interactive;
    this.timelineLayerDict = {};

    this.interactive.layers.forEach(layer => {
      const timelineLayer = this.createTimelineLayer(layer);
      this.timelineLayerDict[layer.name] = timelineLayer;
    });
    this.interactive.sequences.forEach(sequence => this.createTimelineSequence(sequence));
    this.updateLayerPositions();

    connect(this.interactive, 'scrollPosition', this, 'onScrollPositionChange');
  }

  onScrollPositionChange (scrollPosition) {
    this.ui.cursor.value = scrollPosition;
    this.ui.cursor.location = this.getPositionFromScroll(scrollPosition);
  }

  getPositionFromScroll (scroll) {
    return scroll + CONSTANTS.SEQUENCE_INITIAL_X_OFFSET;
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
        y: timelineLayer.position.y
      }));
    layerPositions.sort((a, b) => b.y - a.y);
    layerPositions.forEach((layerPositionObject, index) => {
      layerPositionObject.layer.zIndex = index * 10;
    });
    this.interactive.redraw();
  }
}

export class TimelineLayer extends Morph {
  static get properties () {
    return {
      layerInfo: {},
      container: {},
      layer: {}
    };
  }

  constructor (props = {}) {
    super(props);
    const { container, layer } = props;
    this.layer = layer;

    this.height = CONSTANTS.LAYER_HEIGHT;
    this.fill = Color.rgb(200, 200, 200);
    this.grabbable = true;
    this.focusable = false;
    this.container = container;
    this.nativeCursor = 'grab';
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

  onBeingDroppedOn (hand, recipient) {
    this.container.addMorphBack(this);
    this.timeline.arrangeLayerInfos();
    this.timeline.updateZIndicesFromTimelineLayerPositions();
  }
}

export class TimelineSequence extends Morph {
  static get properties () {
    return {
      timelineLayer: {},
      previousPosition: {},
      sequence: {}
    };
  }

  constructor (sequence, timelineLayer, props = {}) {
    super(props);
    const startPosition = timelineLayer.timeline.getPositionFromScroll(sequence.start);
    const endPosition = startPosition + timelineLayer.timeline.getWidthFromDuration(sequence.duration);

    this.height = CONSTANTS.SEQUENCE_HEIGHT;
    this.acceptDrops = false;
    this.grabbable = true;
    this.timelineLayer = timelineLayer;
    this.previousPosition = pt(startPosition, CONSTANTS.SEQUENCE_LAYER_Y_OFFSET);
    this.position = this.previousPosition;
    this.width = endPosition - startPosition;
    this.addMorph(new Label({ textString: sequence.name }));
    this.nativeCursor = 'grab';
    this.borderWidth = 1;
    this.borderColor = Color.rgb(0, 0, 0);
    this.sequence = sequence;
    this.timelineLayer.addMorph(this);
    this.initializeResizer();
  }

  onBeingDroppedOn (hand, recipient) {
    if (recipient.isTimelineLayer) {
      this.timelineLayer = recipient;
      this.timelineLayer.addMorph(this);
      this.position = pt(this.globalPosition.x - this.timelineLayer.globalPosition.x, CONSTANTS.SEQUENCE_LAYER_Y_OFFSET);
      this.previousPosition = this.position.copy();
      this.updateSequenceStartPosition();
      this.sequence.layer = this.timelineLayer.layer;
    } else {
      this.timelineLayer.addMorph(this);
      this.position = this.previousPosition;
    }
  }

  get timeline () {
    return this.timelineLayer.timeline;
  }

  updateSequenceStartPosition () {
    this.sequence.start = this.timeline.getScrollFromPosition(this.position.x);
  }

  initializeResizer () {
    this.rightResizer = new Morph({
      name: 'right resizer',
      fill: Color.transparent,
      width: 10,
      draggable: true,
      nativeCursor: 'ew-resize'
    });
    connect(this.rightResizer, 'onDrag', this, 'drag');
    connect(this.rightResizer, 'onDragEnd', this, 'finishDrag');
    this.addMorph(this.rightResizer);
    this.rightResizer.position = pt(this.width - this.rightResizer.width, 0);
    this.rightResizer.height = this.height;
  }

  drag (event) {
    if (!this.dragStarted) {
      this.dragStarted = true;
      this.widthBeforeDrag = this.width;
    }
    const dragDelta = event.position.x - event.startPosition.x;
    this.extent = pt(this.widthBeforeDrag + dragDelta, this.height);
    this.rightResizer.position = pt(this.rightResizer.position.x, 0);
  }

  finishDrag () {
    this.dragStarted = true;
    this.widthBeforeDrag = this.width;
    this.sequence.duration = this.timeline.getDurationFromWidth(this.width);
    this.timeline.interactive.redraw();
  }
}

const CURSOR_WIDTH = 2;
const CURSOR_COLOR = Color.rgb(240, 100, 0);
const CURSOR_FONT_COLOR = Color.rgb(255, 255, 255);
const CURSOR_FONT_SIZE = 10;

export class TimelineCursor extends Morph {
  static get properties () {
    return {
      value: {
        defaultValue: 0,
        type: 'Number',
        isFloat: false,
        set (value) {
          this.setProperty('value', value);
          this.redraw();
        }
      },
      location: {
        defaultValue: 0,
        type: 'Number',
        isFloat: false,
        set (location) {
          this.setProperty('location', location);
          this.updatePosition();
        }
      },
      cursorColor: {
        defaultValue: CURSOR_COLOR,
        set (color) {
          this.setProperty('cursorColor', color);
          this.updateColor();
        }
      },
      fontColor: {
        defaultValue: CURSOR_FONT_COLOR,
        set (color) {
          this.setProperty('fontColor', color);
          this.updateColor();
        }
      },
      ui: {}
    };
  }

  constructor (value = 0, props = {}) {
    super(props);

    this.initialize();
    this.name = 'cursor';
    this.isLayoutable = false;
    this.value = value;
  }

  initialize () {
    this.initializeSubmorphs();
    this.initializeAppearance();
    this.redraw();
  }

  initializeSubmorphs () {
    this.ui = {};
    this.ui.bar = new Morph({
      name: 'cursor/bar',
      extent: pt(CURSOR_WIDTH, 50),
      reactsToPointer: false,
      halosEnabled: false
    });
    this.ui.label = new Label({
      name: 'cursor/head/text',
      fontSize: CURSOR_FONT_SIZE,
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
    this.addMorph(this.ui.head);
    this.addMorph(this.ui.bar);
  }

  initializeAppearance () {
    this.layout = new VerticalLayout({
      autoResize: true,
      align: 'center'
    });
    this.fill = Color.rgba(0, 0, 0, 0);
    this.borderStyle = 'none';
    this.updateColor();
  }

  onOwnerChanged (newOwner) {
    if (!newOwner) return;
    this.ui.bar.height = newOwner.height - this.ui.head.height;
  }

  redraw () {
    this.ui.label.textString = this.value.toString();
    this.updatePosition();
  }

  _requestPositionUpdate () {
    this._updatePosition = true;
    this.makeDirty();
  }

  onAfterRender (node) {
    super.onAfterRender(node);
    if (!this._updatePosition) return;
    this._updatePosition = false;
    this.updatePosition();
  }

  updateColor () {
    this.ui.head.fill = this.cursorColor;
    this.ui.bar.fill = this.cursorColor;
    this.ui.label.fontColor = this.fontColor;
  }

  updatePosition () {
    // Try to update the position directly (which is very fast)
    // + 2 because the cursor has a slight offset otherwise
    this.position = pt(this.location - this.width / 2 + 2, this.position.y);
    // Sometimes, this doesn't work, as the width has not changed yet.
    // We need to request a rerender, after which the position will be updated again.
    // This is quite slow and acts as a fallback only
    this._requestPositionUpdate();
  }
}
