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
          this.setProperty('interactive', interactive);
          this.initializeTimeline(interactive);
          this.initializePreview(interactive);
        }
      },
      name: {
        defaultValue: 'interactives editor'
      },
      extent: {
        defaultValue: pt(CONSTANTS.EDITOR_WIDTH, CONSTANTS.EDITOR_HEIGHT)
      },
      sequenceTimelines: {
        defaultValue: []
      }
    };
  }

  initialize () {
    this.initializeLayout();
    this.initializePanels();
    this.openInWindow({
      title: 'Interactives Editor',
      name: 'window for interactives editor'
    });
    return this;
  }

  initializePanels () {
    this.sequenceOverview = this.addMorph(new SequenceOverview({ position: pt(0, 0) }));
    this.preview = new Preview();
    this.preview.initialize(this);
    this.addMorph(this.preview);
    this.morphInspector = this.addMorph(new InteractiveMorphInspector({ position: pt(CONSTANTS.PREVIEW_WIDTH + CONSTANTS.SIDEBAR_WIDTH, 0) }));
    this.timeline = new Timeline({ position: pt(0, CONSTANTS.SUBWINDOW_HEIGHT), extent: pt(CONSTANTS.EDITOR_WIDTH, CONSTANTS.EDITOR_HEIGHT - CONSTANTS.SUBWINDOW_HEIGHT) });
    this.timeline.initialize();
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

  initializeSequenceView (sequence) {
    debugger;
    this.interactive.hideAllSequencesExcept(sequence);
    this.sequenceTimelines.push(this.initializeSequenceTimeline(sequence));
    this.timeline.remove();
  }

  initializeSequenceTimeline (sequence) {
    const sequenceTimeline = new Timeline({ position: pt(0, CONSTANTS.SUBWINDOW_HEIGHT), extent: pt(CONSTANTS.EDITOR_WIDTH, CONSTANTS.EDITOR_HEIGHT - CONSTANTS.SUBWINDOW_HEIGHT), name: `${sequence.name} timeline` });
    this.addMorph(sequenceTimeline);
    return sequenceTimeline;
  }
}

class Preview extends Morph {
  static get properties () {
    return {
      name: {
        defaultValue: 'preview'
      },
      extent: {
        defaultValue: pt(CONSTANTS.PREVIEW_WIDTH, CONSTANTS.SUBWINDOW_HEIGHT)
      },
      borderColor: {
        defaultValue: COLOR_SCHEME.BACKGROUND_VARIANT
      },
      borderWidth: {
        defaultValue: CONSTANTS.BORDER_WIDTH
      },
      position: {
        defaultValue: pt(CONSTANTS.SIDEBAR_WIDTH, 0)
      }
    };
  }

  initialize (editor) {
    this.editor = editor;
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
  static get properties () {
    return {
      name: {
        defaultValue: 'sequence overview'
      },
      extent: {
        defaultValue: pt(CONSTANTS.SIDEBAR_WIDTH, CONSTANTS.SUBWINDOW_HEIGHT)
      },
      borderColor: {
        defaultValue: COLOR_SCHEME.BACKGROUND_VARIANT
      },
      borderWidth: {
        defaultValue: CONSTANTS.BORDER_WIDTH
      }
    };
  }
}

class InteractiveMorphInspector extends Morph {
  static get properties () {
    return {
      name: {
        defaultValue: 'interactive morph inspector'
      },
      extent: {
        defaultValue: pt(CONSTANTS.SIDEBAR_WIDTH, CONSTANTS.SUBWINDOW_HEIGHT)
      },
      borderColor: {
        defaultValue: COLOR_SCHEME.BACKGROUND_VARIANT
      },
      borderWidth: {
        defaultValue: CONSTANTS.BORDER_WIDTH
      }
    };
  }
}
