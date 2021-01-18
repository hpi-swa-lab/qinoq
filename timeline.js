import { Morph, Label, HorizontalLayout, VerticalLayout } from 'lively.morphic';
import { pt, Color } from 'lively.graphics';

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
    this.fill = Color.rgb(20, 240, 240);
    this.focusable = false;
    this.addMorph(new TimelineSequence(this));
  }

  isTimelineLayer () {
    return true;
  }
}

export class TimelineSequence extends Morph {
  constructor (timelineLayer) {
    super();
    this.height = 40;
    this.acceptDrops = false;
    this.grabbable = true;
    this.layer = timelineLayer;
  }

  onBeingDroppedOn (hand, recipient) {
    $world.setStatusMessage('test onMouseUp');
    if (recipient.isTimelineLayer) {
      this.layer = recipient;
    }
    this.layer.addMorph(this);
    this.position.y = this.layer.position.y + 5;
  }
}
