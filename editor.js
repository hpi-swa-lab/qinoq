import { Window } from 'lively.components';
import { pt, Color } from 'lively.graphics';
import { VerticalLayout, ProportionalLayout, Morph } from 'lively.morphic';
import { Timeline } from './timeline.js';
import { Interactive } from './interactive.js';

const EDITOR_WIDTH = 900;
const EDITOR_HEIGHT = 500;
const SIDEBAR_WIDTH = (EDITOR_WIDTH - PREVIEW_WIDTH) / 2;
const PREVIEW_WIDTH = 400;
const SUBWINDOW_HEIGHT = 300;
const BORDER_WIDTH = 3;
const BORDER_COLOR = new Color.rgb(240, 240, 240);

export class InteractivesEditor extends Morph {
  static get properties () {
    return {
      interactive: {
        set (interactive) {
          this.initializeTimeline(interactive);
          this.initializePreview(interactive);
        }
      }
    };
  }

  constructor () {
    super();

    this.name = 'interactives editor';
    this.extent = pt(EDITOR_WIDTH, EDITOR_HEIGHT);
    this.initializeLayout();
    this.initializeUIElements();
    this.openInWindow({
      title: 'Interactives Editor',
      name: 'window for interactives editor'
    });
  }

  initializeUIElements () {
    this.sequenceOverview = this.addMorph(new SequenceOverview({ position: pt(0, 0) }));
    this.preview = this.addMorph(new Preview(this, { position: pt(SIDEBAR_WIDTH, 0) }));
    this.morphInspector = this.addMorph(new InteractiveMorphInspector({ position: pt(PREVIEW_WIDTH + SIDEBAR_WIDTH, 0) }));
    this.timeline = new Timeline({ position: pt(0, SUBWINDOW_HEIGHT), extent: pt(EDITOR_WIDTH, EDITOR_HEIGHT - SUBWINDOW_HEIGHT) });
    this.addMorph(this.timeline);
  }

  initializeLayout () {
    this.layout = new ProportionalLayout({
      lastExtent: this.extent
    });
    this.extent = pt(EDITOR_WIDTH, EDITOR_HEIGHT);
  }

  loadInteractive (interactive) {
    this.interactive = interactive;
  }

  initializePreview (interactive) {
    this.preview.setContent(interactive);
  }

  initializeTimeline (interactive) {
    this.timeline.loadContent(interactive);
  }
}

export class Preview extends Morph {
  constructor (editor, props = {}) {
    super(props);
    this.name = 'preview';
    this.editor = editor;
    this.extent = pt(PREVIEW_WIDTH, SUBWINDOW_HEIGHT);
    this.borderColor = BORDER_COLOR;
    this.borderWidth = BORDER_WIDTH;
  }

  onDrop (evt) {
    if (evt.type != 'morphicdrop') {
      return;
    }
    const grabbedMorph = evt.hand.grabbedMorphs[0];
    if (grabbedMorph.isInteractive) {
      this.editor.loadInteractive(grabbedMorph);
    } else {
      $world.setStatusMessage('You have to drop an interactive here');
    }
  }

  setContent (interactive) {
    this.addMorph(interactive);
    this.addMorph(interactive.scrollOverlay);
    interactive.position = pt(0, 0);
    this.extent = interactive.extent;
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
