import { Morph, ProportionalLayout, Label, VerticalLayout } from 'lively.morphic';
import { pt, Color } from 'lively.graphics';
import { connect } from 'lively.bindings';

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
  }

  initializeLayerContainer () {
    this.ui.layerContainer = new Morph({
      name: 'layer container',
      position: pt(LAYER_INFO_WIDTH, 0),
      extent: pt(this.width - LAYER_INFO_WIDTH, this.height),
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
      extent: pt(this.height, LAYER_INFO_WIDTH),
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
    this.ui.layerInfoContainer.width = LAYER_INFO_WIDTH;
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
    this.ui.layerContainer.addMorph(timelineLayer);
    const layerInfo = new Morph();
    layerInfo.height = LAYER_HEIGHT;
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
  }

  getPositionFromScroll (scroll) {
    return scroll + SEQUENCE_INITIAL_X_OFFSET;
  }

  getScrollFromPosition (position) {
    return position - SEQUENCE_INITIAL_X_OFFSET;
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

const LAYER_INFO_WIDTH = 50;
const LAYER_HEIGHT = 50;

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

    this.height = LAYER_HEIGHT;
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
    this.height = LAYER_HEIGHT;
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
    this.container.addMorph(this);
    this.timeline.arrangeLayerInfos();
    this.timeline.updateZIndicesFromTimelineLayerPositions();
  }
}

const SEQUENCE_HEIGHT = 40;
const DEFAULT_SEQUENCE_WIDTH = 100;
const SEQUENCE_INITIAL_X_OFFSET = 5;
const SEQUENCE_LAYER_Y_OFFSET = 5;

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

    this.height = SEQUENCE_HEIGHT;
    this.acceptDrops = false;
    this.grabbable = true;
    this.timelineLayer = timelineLayer;
    this.previousPosition = pt(startPosition + SEQUENCE_INITIAL_X_OFFSET, SEQUENCE_LAYER_Y_OFFSET);
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
      this.position = pt(this.globalPosition.x - this.timelineLayer.globalPosition.x, SEQUENCE_LAYER_Y_OFFSET);
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
