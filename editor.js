import { Window } from 'lively.components';
import { pt, Color } from 'lively.graphics';
import { VerticalLayout, ProportionalLayout, Morph } from 'lively.morphic';
import { MainView } from './main-view.js';
import { Timeline } from './timeline.js';

export class InteractivesEditor extends Window {
  constructor () {
    super();

    this.name = 'interactives editor';
    this.extent = pt(900, 500);
    this.title = 'Interactives Editor';
    this.initializeContainer();
    this.initializeWindows();
  }

  initializeWindows () {
    this.container.addMorph(new SequenceOverview({ position: pt(0, 0) }));
    this.container.addMorph(new Preview({ position: pt(150, 0) }));
    this.container.addMorph(new InteractiveMorphInspector({ position: pt(750, 0) }));
    this.container.addMorph(new Timeline({ position: pt(0, 250), extent: pt(900, 250) }));
  }

  initializeContainer () {
    this.container = new Morph();
    this.container.name = 'container';
    this.container.layout = new ProportionalLayout({
      lastExtent: this.extent
    });
    this.addMorph(this.container);
  }
}

export class Preview extends Morph {
  constructor (props = {}) {
    super(props);
    this.name = 'preview';
    this.extent = pt(600, 250);
    this.borderColor = new Color.rgb(220, 220, 220);
    this.borderWidth = 5;
  }
}

export class SequenceOverview extends Morph {
  constructor (props = {}) {
    super(props);
    this.name = 'sequence overview';
    this.extent = pt(150, 250);
    this.borderColor = new Color.rgb(220, 220, 220);
    this.borderWidth = 5;
  }
}

export class InteractiveMorphInspector extends Morph {
  constructor (props = {}) {
    super(props);
    this.name = 'interactive morph inspector';
    this.extent = pt(150, 250);
    this.borderColor = new Color.rgb(220, 220, 220);
    this.borderWidth = 5;
  }
}
