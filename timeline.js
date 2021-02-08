import { Morph, HorizontalLayout, ProportionalLayout, Label, VerticalLayout } from 'lively.morphic';
import { pt, Color } from 'lively.graphics';
import { connect } from 'lively.bindings';

const CONSTANTS = {
  LAYER_INFO_WIDTH: 50,
  LAYER_HEIGHT: 50,
  SEQUENCE_HEIGHT: 40,
  DEFAULT_SEQUENCE_WIDTH: 100,
  SEQUENCE_INITIAL_X_OFFSET: 5,
  SEQUENCE_LAYER_Y_OFFSET: 5,
  MINIMAL_SEQUENCE_WIDTH: 20,
  CURSOR_WIDTH: 2,
  CURSOR_COLOR: Color.rgb(240, 100, 0),
  CURSOR_FONT_COLOR: Color.rgb(255, 255, 255),
  CURSOR_FONT_SIZE: 10
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
    this.ui.cursor.displayValue = 0;
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
    this._timelineLayerDict[layer.id] = timelineLayer;
    return timelineLayer;
  }

  createTimelineSequence (sequence) {
    return new TimelineSequence(sequence, this.getTimelineLayerFor(sequence.layer));
  }

  loadContent (interactive) {
    this.interactive = interactive;
    this._timelineLayerDict = {};

    this.interactive.layers.forEach(layer => {
      const timelineLayer = this.createTimelineLayer(layer);
    });
    this.interactive.sequences.forEach(sequence => this.createTimelineSequence(sequence));
    this.updateLayerPositions();

    this.onScrollPositionChange(this.interactive.scrollPosition);

    connect(this.interactive, 'scrollPosition', this, 'onScrollPositionChange');
  }

  onScrollPositionChange (scrollPosition) {
    this.ui.cursor.displayValue = Math.round(scrollPosition);
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

  deselectAllSequences () {
    this.timelineLayers.forEach(timelineLayer => {
      timelineLayer.deselectAllSequences();
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

  static timelineSequencesDragged (event) {
    if (!event.hand.dragTimelineSequenceState) return [];
    return event.hand.dragTimelineSequenceState.timelineSequences;
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

  onMouseDown (event) {
    super.onMouseDown(event);
    this.timeline.deselectAllSequences();
  }

  onHoverIn (event) {
    super.onHoverIn(event);
    if (event.hand.dragTimelineSequenceState) {
      TimelineLayer.timelineSequencesDragged(event).forEach(timelineSequence => {
        timelineSequence.onBeingMovedTo(this);
      });
    }
  }

  onBeingDroppedOn (hand, recipient) {
    this.container.addMorphBack(this);
    this.timeline.arrangeLayerInfos();
    this.timeline.updateZIndicesFromTimelineLayerPositions();
  }

  deselectAllSequences () {
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
    this.previousPosition = pt(startPosition, CONSTANTS.SEQUENCE_LAYER_Y_OFFSET);
    this.position = this.previousPosition;
    this.width = endPosition - startPosition;
    this.addMorph(new Label({ textString: sequence.name }));

    this.nativeCursor = 'default';

    this.borderWidth = 1;
    this.borderColor = Color.black;
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
    this.timeline.deselectAllSequences();
    this.selected = true;
  }

  onSelectionChange (selected) {
    this.borderColor = selected ? Color.rgb(0, 176, 255) : Color.black;
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
    this.position = pt(this.position.x, CONSTANTS.SEQUENCE_LAYER_Y_OFFSET);
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

class TimelineCursor extends Morph {
  static get properties () {
    return {
      displayValue: {
        defaultValue: 0,
        type: 'Number',
        isFloat: false,
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
        defaultValue: CONSTANTS.CURSOR_COLOR,
        set (color) {
          this.setProperty('fill', color);
          this.updateColor();
        }
      },
      fontColor: {
        defaultValue: CONSTANTS.CURSOR_FONT_COLOR,
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

  constructor (displayValue = 0, props = {}) {
    super(props);

    this.initialize();

    this.isLayoutable = false;
    this.displayValue = displayValue;
  }

  initialize () {
    this.initializeSubmorphs();
    this.initializeAppearance();
    this.redraw();
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
      extent: pt(500, 1),
      halosEnabled: false,
      reactsToPointer: false,
      fill: Color.transparent,
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
