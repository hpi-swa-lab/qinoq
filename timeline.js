import { Morph, Label, HorizontalLayout, VerticalLayout } from 'lively.morphic';
import { pt, Rectangle, Color } from 'lively.graphics';
import { VerticalResizer } from 'lively.components';

export class Timeline extends Morph {
  constructor () {
    super();
    this.layout = new HorizontalLayout({
      spacing: 2,
      resizeSubmorphs: true
    });
    this.initializeControlContainer();
    this.initializeLayerContainer();

    this.initializeLayers();
    this.initializeControls();
  }

  get defaultLayerCount () {
    return 3;
  }

  initializeLayerContainer () {
    this.layerContainer = new Morph();
    this.layerContainer.name = 'layer container';
    this.layerContainer.layout = new VerticalLayout({
      spacing: 2,
      direction: 'bottomToTop',
      resizeSubmorphs: true
    });
    this.addMorph(this.layerContainer);
  }

  initializeControlContainer () {
    this.controlContainer = new Morph();
    this.controlContainer.name = 'control container';
    this.controlContainer.layout = new VerticalLayout({
      spacing: 2,
      direction: 'bottomToTop',
      resizeSubmorphs: true
    });
    this.addMorph(this.controlContainer);
  }

  initializeLayers () {
    this.layers = [];
    for (let i = 0; i < this.defaultLayerCount; i++) {
      const timelineLayer = new TimelineLayer({
        name: 'Layer ' + i,
        container: this.layerContainer
      });
      this.layers.push(timelineLayer);
      this.layerContainer.addMorph(timelineLayer);
    }
  }

  initializeControls () {
    this.controls = [];
    this.layers.forEach((layer) => {
      const control = new Morph();
      control.height = 50;
      control.layerLabel = (new Label({
        textString: layer.name
      }));
      layer.associatedControl = control;
      control.addMorph(control.layerLabel);
      this.controls.push(control);
      this.controlContainer.addMorph(control);
    });
  }

  updateLayerPositions () {
    for (let i = 0; i < this.layers.length; i++) {
      const control = this.layers[i].associatedControl;
      control.position = pt(control.position.x, this.layers[i].position.y);
    }
  }

  relayout () {
    this.controlContainer.width = 50;
    this.layerContainer.width = this.owner.owner.width - this.controlContainer.width - 10;
  }
}

export class TimelineLayer extends Morph {
  static get properties () {
    return {
      associatedControl: {},
      container: {}
    };
  }

  constructor (props = {}) {
    super(props);
    const { name = 'Unnamed Layer', container } = props;
    this.name = name;
    this.height = 50;
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
    this.height = 50;
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

export class TimelineSequence extends Morph {
  static get properties () {
    return {
      layer: {},
      previousPosition: {}
    };
  }

  constructor (timelineLayer) {
    super();
    this.height = 40;
    this.width = 100;
    this.acceptDrops = false;
    this.grabbable = true;
    this.layer = timelineLayer;
    this.previousPosition = pt(this.position.x + 5, 5);
    this.position = this.previousPosition;
    this.addMorph(new Label({ textString: 'test' }));
    this.nativeCursor = 'move';
  }

  onBeingDroppedOn (hand, recipient) {
    if (recipient.isTimelineLayer) {
      this.layer = recipient;
      this.layer.addMorph(this);
      this.previousPosition = this.position;
      this.position = pt(this.globalPosition.x - this.layer.globalPosition.x, 5);
    } else {
      this.layer.addMorph(this);
      this.position = this.previousPosition;
    }
  }
}
