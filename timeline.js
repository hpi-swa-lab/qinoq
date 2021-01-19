import { Morph, Label, HorizontalLayout, VerticalLayout } from 'lively.morphic';
import { pt, Rectangle, Color } from 'lively.graphics';
import { VerticalResizer } from 'lively.components';

export class Timeline extends Morph {
  static get properties () {
    return {
      ui: {}
    };
  }

  constructor () {
    super();
    this.layout = new HorizontalLayout({
      spacing: 2,
      resizeSubmorphs: true
    });

    this.ui = {};

    this.initializeLayerInfoContainer();
    this.initializeLayerContainer();

    this.initializeLayers();
    this.initializeLayerInfos();
  }

  get defaultLayerCount () {
    return 3;
  }

  initializeLayerContainer () {
    this.ui.layerContainer = new Morph({
      name: 'layer container',
      layout: new VerticalLayout({
        spacing: 2,
        direction: 'bottomToTop',
        resizeSubmorphs: true
      })
    });
    this.addMorph(this.ui.layerContainer);
  }

  initializeLayerInfoContainer () {
    this.ui.layerInfoContainer = new Morph({
      name: 'layer info container',
      layout: new VerticalLayout({
        spacing: 2,
        direction: 'bottomToTop',
        resizeSubmorphs: true
      })
    });
    this.addMorph(this.ui.layerInfoContainer);
  }

  initializeLayers () {
    this.layers = [];
    for (let i = 0; i < this.defaultLayerCount; i++) {
      const timelineLayer = new TimelineLayer({
        name: 'Layer ' + i,
        container: this.ui.layerContainer
      });
      this.layers.push(timelineLayer);
      this.ui.layerContainer.addMorph(timelineLayer);
    }
  }

  initializeLayerInfos () {
    this.layerInfos = [];
    this.layers.forEach((layer) => {
      const layerInfo = new Morph();
      layerInfo.height = LAYER_HEIGHT;
      layerInfo.layerLabel = (new Label({
        textString: layer.name
      }));
      layer.associatedLayerInfo = layerInfo;
      layerInfo.addMorph(layerInfo.layerLabel);
      this.layerInfos.push(layerInfo);
      this.ui.layerInfoContainer.addMorph(layerInfo);
    });
  }

  updateLayerPositions () {
    for (let i = 0; i < this.layers.length; i++) {
      const layerInfo = this.layers[i].associatedLayerInfo;
      layerInfo.position = pt(layerInfo.position.x, this.layers[i].position.y);
    }
  }

  relayout () {
    this.ui.layerInfoContainer.width = LAYER_INFO_WIDTH;
    this.ui.layerContainer.width = this.owner.owner.width - this.ui.layerInfoContainer.width - 10;
  }
}

const LAYER_INFO_WIDTH = 50;
const LAYER_HEIGHT = 50;

export class TimelineLayer extends Morph {
  static get properties () {
    return {
      associatedLayerInfos: {},
      container: {}
    };
  }

  constructor (props = {}) {
    super(props);
    const { name = 'Unnamed Layer', container } = props;
    this.name = name;
    this.height = LAYER_HEIGHT;
    this.fill = Color.rgb(200, 200, 200);
    this.grabbable = true;
    this.focusable = false;
    this.container = container;
    this.nativeCursor = 'move';

    // Mock sequence for testing purposes
    this.addMorph(new TimelineSequence(this));
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

  updateLayerPosition () {
    this.timeline.updateLayerPositions();
  }

  onBeingDroppedOn (hand, recipient) {
    this.container.addMorph(this);
    this.updateLayerPosition();
  }
}

const SEQUENCE_HEIGHT = 40;
const DEFAULT_SEQUENCE_WIDTH = 100;
const SEQUENCE_INITIAL_X_OFFSET = 5;
const SEQUENCE_LAYER_Y_OFFSET = 5;

export class TimelineSequence extends Morph {
  static get properties () {
    return {
      layer: {},
      previousPosition: {}
    };
  }

  constructor (timelineLayer) {
    super();
    this.height = SEQUENCE_HEIGHT;
    this.width = DEFAULT_SEQUENCE_WIDTH;
    this.acceptDrops = false;
    this.grabbable = true;
    this.layer = timelineLayer;
    this.previousPosition = pt(this.position.x + SEQUENCE_INITIAL_X_OFFSET, SEQUENCE_LAYER_Y_OFFSET);
    this.position = this.previousPosition;
    this.addMorph(new Label({ textString: 'test' }));
    this.nativeCursor = 'move';
  }

  onBeingDroppedOn (hand, recipient) {
    if (recipient.isTimelineLayer) {
      this.layer = recipient;
      this.layer.addMorph(this);
      this.position = pt(this.globalPosition.x - this.layer.globalPosition.x, SEQUENCE_LAYER_Y_OFFSET);
      this.previousPosition = this.position.copy();
    } else {
      this.layer.addMorph(this);
      this.position = this.previousPosition;
    }
  }
}
