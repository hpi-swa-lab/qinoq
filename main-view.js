import { Morph, HorizontalLayout, GridLayout } from 'lively.morphic';
import { pt, Color } from 'lively.graphics';
import { Timeline } from './timeline.js';

export class MainView extends Morph {
  constructor () {
    super();
    this.layout = new GridLayout({

    });
    this.ui = {};
    this.initializeUpperComponents();
    this.initializeLowerComponents();
  }

  initializeUpperComponents () {
    this.ui.overview = new SequenceOverview();
    this.addMorph(this.ui.overview);
    this.ui.preview = new Preview();
    this.addMorph(this.ui.preview);
    this.ui.interactiveMorphInspector = new InteractiveMorphInspector();
    this.addMorph(this.ui.interactiveMorphInspector);
  }

  initializeLowerComponents () {
    this.ui.timeline = new Timeline();
    this.addMorph(this.ui.timeline);
  }
}

export class Preview extends Morph {
  constructor () {
    super();

    this.extent = pt(400, 250);
    this.borderColor = new Color.rgb(220, 220, 220);
    this.borderWidth = 5;
  }
}

export class SequenceOverview extends Morph {
  constructor () {
    super();

    this.extent = pt(80, 250);
    this.borderColor = new Color.rgb(220, 220, 220);
    this.borderWidth = 5;
  }
}

export class InteractiveMorphInspector extends Morph {
  constructor () {
    super();

    this.extent = pt(80, 250);
    this.borderColor = new Color.rgb(220, 220, 220);
    this.borderWidth = 5;
  }
}
