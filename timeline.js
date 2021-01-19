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

  initializeLayerContainer () {
    this.layerContainer = new Morph();
    this.layerContainer.name = 'layerContainer';
    this.layerContainer.layout = new VerticalLayout({
      spacing: 2,
      direction: 'bottomToTop',
      resizeSubmorphs: true
    });
    this.addMorph(this.layerContainer);
  }

  initializeControlContainer () {
    this.controlContainer = new Morph();
    this.controlContainer.name = 'controlContainer';
    this.controlContainer.layout = new VerticalLayout({
      spacing: 2,
      direction: 'bottomToTop',
      resizeSubmorphs: true
    });
    this.addMorph(this.controlContainer);
  }

  initializeLayers () {
    this.layers = [];
    for (let i = 0; i < 3; i++) {
      const timelineLayer = new TimelineLayer();
      this.layers.push(timelineLayer);
      this.layerContainer.addMorph(timelineLayer);
    }
  }

  initializeControls () {
    this.controls = [];
    for (let i = 0; i < 3; i++) {
      const control = new Morph();
      control.height = 50;
      control.addMorph(new Label({
        textString: i
      }));
      this.controls.push(control);
      this.controlContainer.addMorph(control);
    }
  }

  relayout () {
    this.controlContainer.width = 50;
    this.layerContainer.width = this.owner.owner.width - this.controlContainer.width - 10;
  }
}

export class TimelineLayer extends Morph {
  constructor () {
    super();
    this.height = 50;
    this.fill = Color.rgb(200, 200, 200);
    this.focusable = false;
    this.addMorph(new TimelineSequence(this));
  }

  isTimelineLayer () {
    return true;
  }

  relayout () {
    this.height = 50;
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
  }

  onBeingDroppedOn (hand, recipient) {
    if (recipient.isTimelineLayer) {
      this.layer = recipient;
      this.layer.addMorph(this);
      this.previousPosition = this.position;
      this.position = pt(hand.globalPosition.x - this.layer.globalPosition.x, 5);
    } else {
      this.layer.addMorph(this);
      this.position = this.previousPosition;
    }
  }
}
