import { Window } from 'lively.components';
import { pt } from 'lively.graphics';
import { VerticalLayout, Morph } from 'lively.morphic';
import { MainView } from './main-view.js';

export class InteractivesEditor extends Window {
  constructor () {
    super();

    this.name = 'interactives editor';
    this.extent = pt(900, 500);
    this.title = 'Interactives Editor';
    this.container = new MainView();
    this.addMorph(this.container);
    this.container.relayout();
  }

  relayoutWindowControls () {
    super.relayoutWindowControls();
    this.container.relayout();
  }
}
