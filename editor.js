import { Window } from 'lively.components';
import { pt, Color } from 'lively.graphics';
import { VerticalLayout, ProportionalLayout, Morph } from 'lively.morphic';
import { Timeline } from './timeline.js';
import { Interactive } from 'interactives-editor';
import { COLOR_SCHEME } from './colors';

const CONSTANTS = {
  EDITOR_WIDTH: 900,
  EDITOR_HEIGHT: 500,
  PREVIEW_WIDTH: 400,
  SUBWINDOW_HEIGHT: 300,
  BORDER_WIDTH: 3
};
CONSTANTS.SIDEBAR_WIDTH = (CONSTANTS.EDITOR_WIDTH - CONSTANTS.PREVIEW_WIDTH) / 2;

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
    this.extent = pt(CONSTANTS.EDITOR_WIDTH, CONSTANTS.EDITOR_HEIGHT);
    this.initializeLayout();
    this.initializePanels();
    this.openInWindow({
      title: 'Interactives Editor',
      name: 'window for interactives editor'
    });
  }

  initializePanels () {
    this.sequenceOverview = this.addMorph(new SequenceOverview({ position: pt(0, 0) }));
    this.preview = this.addMorph(new Preview(this, { position: pt(CONSTANTS.SIDEBAR_WIDTH, 0) }));
    this.morphInspector = this.addMorph(new InteractiveMorphInspector({ position: pt(CONSTANTS.PREVIEW_WIDTH + CONSTANTS.SIDEBAR_WIDTH, 0) }));
    this.timeline = new Timeline({ position: pt(0, CONSTANTS.SUBWINDOW_HEIGHT), extent: pt(CONSTANTS.EDITOR_WIDTH, CONSTANTS.EDITOR_HEIGHT - CONSTANTS.SUBWINDOW_HEIGHT) });
    this.addMorph(this.timeline);
  }

  initializeLayout () {
    this.layout = new ProportionalLayout({
      lastExtent: this.extent
    });
    this.extent = pt(CONSTANTS.EDITOR_WIDTH, CONSTANTS.EDITOR_HEIGHT);
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

class Preview extends Morph {
  constructor (editor, props = {}) {
    super(props);
    this.name = 'preview';
    this.editor = editor;
    this.extent = pt(CONSTANTS.PREVIEW_WIDTH, CONSTANTS.SUBWINDOW_HEIGHT);
    this.borderColor = COLOR_SCHEME.LIGHT_GREY;
    this.borderWidth = CONSTANTS.BORDER_WIDTH;
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

class SequenceOverview extends Morph {
  constructor (props = {}) {
    super(props);
    this.name = 'sequence overview';
    this.extent = pt(CONSTANTS.SIDEBAR_WIDTH, CONSTANTS.SUBWINDOW_HEIGHT);
    this.borderColor = COLOR_SCHEME.LIGHT_GREY;
    this.borderWidth = CONSTANTS.BORDER_WIDTH;
  }
}

class InteractiveMorphInspector extends Morph {
  constructor (props = {}) {
    super(props);
    this.name = 'interactive morph inspector';
    this.extent = pt(CONSTANTS.SIDEBAR_WIDTH, CONSTANTS.SUBWINDOW_HEIGHT);
    this.borderColor = COLOR_SCHEME.LIGHT_GREY;
    this.borderWidth = CONSTANTS.BORDER_WIDTH;
  }
}
