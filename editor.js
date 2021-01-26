import { Window } from 'lively.components';
import { pt, Color } from 'lively.graphics';
import { VerticalLayout, ProportionalLayout, Morph } from 'lively.morphic';
import { Timeline } from './timeline.js';

const EDITOR_WIDTH = 900;
const EDITOR_HEIGHT = 500;
const SIDEBAR_WIDTH = 150;
const PREVIEW_WIDTH = 600;
const SUBWINDOW_HEIGHT = 150;
const BORDER_WIDTH = 3;
const BORDER_COLOR = new Color.rgb(240, 240, 240);

export class InteractivesEditor extends Window {
  constructor () {
    super();

    this.name = 'interactives editor';
    this.extent = pt(EDITOR_WIDTH, EDITOR_HEIGHT);
    this.title = 'Interactives Editor';
    this.initializeContainer();
    this.initializeWindows();
  }

  initializeWindows () {
    this.container.addMorph(new SequenceOverview({ position: pt(0, 0) }));
    this.container.addMorph(new Preview({ position: pt(SIDEBAR_WIDTH, 0) }));
    this.container.addMorph(new InteractiveMorphInspector({ position: pt(PREVIEW_WIDTH + SIDEBAR_WIDTH, 0) }));
    this.container.addMorph(new Timeline({ position: pt(0, SUBWINDOW_HEIGHT), extent: pt(EDITOR_WIDTH, SUBWINDOW_HEIGHT) }));
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
    this.extent = pt(PREVIEW_WIDTH, SUBWINDOW_HEIGHT);
    this.borderColor = BORDER_COLOR;
    this.borderWidth = BORDER_WIDTH;
  }
}

export class SequenceOverview extends Morph {
  constructor (props = {}) {
    super(props);
    this.name = 'sequence overview';
    this.extent = pt(SIDEBAR_WIDTH, SUBWINDOW_HEIGHT);
    this.borderColor = BORDER_COLOR;
    this.borderWidth = BORDER_WIDTH;
  }
}

export class InteractiveMorphInspector extends Morph {
  constructor (props = {}) {
    super(props);
    this.name = 'interactive morph inspector';
    this.extent = pt(SIDEBAR_WIDTH, SUBWINDOW_HEIGHT);
    this.borderColor = BORDER_COLOR;
    this.borderWidth = BORDER_WIDTH;
  }
}
