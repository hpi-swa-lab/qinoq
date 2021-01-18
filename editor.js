import { Window } from 'lively.components';
import { pt } from 'lively.graphics';

export class InteractivesEditor extends Window {
  constructor () {
    super();

    this.name = 'interactives editor';
    this.extent = pt(300, 300);
    this.title = 'Interactives Editor';
  }
}
