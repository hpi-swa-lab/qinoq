import { Morph, ProportionalLayout, Label, VerticalLayout } from 'lively.morphic';
import { pt, Color } from 'lively.graphics';
import { connect } from 'lively.bindings';

const CONSTANTS = {
  LAYER_INFO_WIDTH: 50,
  LAYER_HEIGHT: 50,
  SEQUENCE_HEIGHT: 40,
  DEFAULT_SEQUENCE_WIDTH: 100,
  SEQUENCE_INITIAL_X_OFFSET: 5,
  SEQUENCE_LAYER_Y_OFFSET: 5,
  MINIMAL_SEQUENCE_WIDTH: 20
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
    this.ui.layerContainer.addMorph(timelineLayer);
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

  unselectAllSequences () {
    this.timelineLayers.forEach(timelineLayer => {
      timelineLayer.unselectAllSequences();
    });
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

  onHoverIn (event) {
    super.onHoverIn(event);
    if (event.hand.dragTimelineSequenceState) {
      event.hand.dragTimelineSequenceState.timelineSequences.forEach(timelineSequence => {
        timelineSequence.onBeingMovedTo(this);
      });
    }
  }

  onBeingDroppedOn (hand, recipient) {
    this.container.addMorph(this);
    this.timeline.arrangeLayerInfos();
    this.timeline.updateZIndicesFromTimelineLayerPositions();
  }

  unselectAllSequences () {
    this.withAllSubmorphsDo(submorph => {
      if (submorph.isTimelineSequence) submorph.selected = false;
    });
  }
}

export class TimelineSequence extends Morph {
  static get properties () {
    return {
      timelineLayer: {},
      previousPosition: {},
      sequence: {},
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

  constructor (sequence, timelineLayer, props = {}) {
    super(props);
    const startPosition = timelineLayer.timeline.getPositionFromScroll(sequence.start);
    const endPosition = startPosition + timelineLayer.timeline.getWidthFromDuration(sequence.duration);

    this.height = CONSTANTS.SEQUENCE_HEIGHT;
    this.minimalSequenceWidth = CONSTANTS.MINIMAL_SEQUENCE_WIDTH;
    this.acceptDrops = false;
    this.draggable = true;
    this.timelineLayer = timelineLayer;
    this.previousPosition = pt(startPosition + CONSTANTS.SEQUENCE_INITIAL_X_OFFSET, CONSTANTS.SEQUENCE_LAYER_Y_OFFSET);
    this.position = this.previousPosition;
    this.width = endPosition - startPosition;
    this.addMorph(new Label({ textString: sequence.name }));

    this.nativeCursor = 'default';

    this.borderWidth = 1;
    this.borderColor = Color.rgb(0, 0, 0);
    this.borderRadius = 3;

    this.sequence = sequence;
    this.timelineLayer.addMorph(this);
    this.initializeResizers();
  }

  initializeResizers () {
    const resizerProps = {
      fill: Color.transparent,
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
    connect(this.leftResizer, 'onDrag', this, 'onResizeLeft');
    connect(this.leftResizer, 'onDragStart', this, 'onResizeLeftStart');

    this.addMorphBack(this.rightResizer);
    this.addMorphBack(this.leftResizer);
  }

  onMouseDown (event) {
    this.timeline.unselectAllSequences();
    this.selected = true;
  }

  onSelectionChange (selected) {
    this.fill = selected ? Color.lightGray : Color.white;
  }

  onDragStart (event) {
    event.hand.dragTimelineSequenceState = {
      timelineSequences: [this],
      originalTimelineLayer: this.timelineLayer
    };
  }

  onDragEnd (event) {
    delete event.hand.dragTimelineSequenceState;
  }

  onDrag (event) {
    super.onDrag(event);
    this.position = pt(this.position.x, SEQUENCE_LAYER_Y_OFFSET);
    this.updateSequenceAfterArrangement();
  }

  onBeingMovedTo (timelineLayer) {
    this.timelineLayer = timelineLayer;
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

  onResizeRight (event) {
    const newSequenceWidth = this.rightResizer.position.x + this.rightResizer.width;

    if (newSequenceWidth < this.minimalSequenceWidth) {
      this.extent = pt(this.minimalSequenceWidth, this.height);
      this.rightResizer.position = pt(this.minimalSequenceWidth - this.rightResizer.width, 0);
      this.updateSequenceAfterArrangement();
      return;
    }

    this.extent = pt(newSequenceWidth, this.height);
    this.rightResizer.position = pt(this.rightResizer.position.x, 0);

    this.updateSequenceAfterArrangement();
  }

  onResizeLeftStart (event) {
    this.leftResizer.startPosition = this.leftResizer.globalPosition;
    this.startWidth = this.width;
    this.startPosition = this.globalPosition;
  }

  onResizeLeft (event) {
    const dragDelta = event.startPosition.x - event.position.x;
    const newSequenceWidth = this.startWidth + dragDelta;
    const rightResizerGlobalPosition = this.rightResizer.globalPosition;

    if (newSequenceWidth <= this.minimalSequenceWidth) {
      this.extent = pt(this.minimalSequenceWidth, this.height);
      this.globalPosition = pt(rightResizerGlobalPosition.x + this.rightResizer.width - this.minimalSequenceWidth, this.globalPosition.y);
    } else {
      this.globalPosition = pt(this.startPosition.x - dragDelta, this.globalPosition.y);
      this.extent = pt(newSequenceWidth, this.height);
    }

    this.leftResizer.position = pt(0, 0);
    this.rightResizer.globalPosition = rightResizerGlobalPosition;

    this.updateSequenceAfterArrangement();
  }

  updateSequenceAfterArrangement () {
    this.sequence.duration = this.timeline.getDurationFromWidth(this.width);
    this.sequence.start = this.timeline.getScrollFromPosition(this.position.x);
    this.timeline.interactive.redraw();
  }
}
