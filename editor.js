import { Window } from 'lively.components';
import { pt } from 'lively.graphics';
import { Timeline } from './timeline.js';
import { VerticalLayout, HorizontalLayout, Morph } from 'lively.morphic';
import { SequenceOverview, MainView, Preview, InteractiveMorphInspector } from './main-view.js';

export class InteractivesEditor extends Window {
  constructor () {
    super();

    this.name = 'interactives editor';
    this.extent = pt(900, 500);
    this.title = 'Interactives Editor';

    this.container = new Morph();
    this.container.name = 'container';
    this.container.addMorph(new MainView());
    this.addMorph(this.container);
  }

  // relayoutWindowControls () {
  // super.relayoutWindowControls();
  // this.lowerContainer.timeline.relayout();
  // }
}
