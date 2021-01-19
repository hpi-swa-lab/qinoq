import { Window } from 'lively.components';
import { pt } from 'lively.graphics';
import { Timeline } from './timeline.js';
import { VerticalLayout, Morph } from 'lively.morphic';

export class InteractivesEditor extends Window {
  constructor () {
    super();

    this.name = 'interactives editor';
    this.extent = pt(900, 500);
    this.title = 'Interactives Editor';
    this.container = new Morph();
    this.container.name = 'container';
    this.container.layout = new VerticalLayout({
      padding: 5,
      autoResize: false
    });
    this.addMorph(this.container);
    this.initializeTimeline();
  }

  initializeTimeline () {
    this.timeline = new Timeline();
    this.timeline.width = this.width;
    this.container.addMorph(this.timeline);
  }

  relayoutWindowControls () {
    super.relayoutWindowControls();
    this.timeline.relayout();
  }
}
