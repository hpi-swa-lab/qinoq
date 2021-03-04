import { pt } from 'lively.graphics';
import { ProportionalLayout, Morph } from 'lively.morphic';
import { GlobalTimeline, SequenceTimeline } from './timeline.js';
import { connect, disconnect } from 'lively.bindings';
import { COLOR_SCHEME } from './colors.js';
import { InteractiveMorphInspector } from './inspector.js';
import { resource } from 'lively.resources';

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
          this.preview.loadContent(interactive);
          this.globalTimeline.loadContent(interactive);
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
      },
      globalTimeline: {
      },
      interactiveScrollPosition: {
        defaultValue: 0
      }
    };
  }

  async initialize () {
    this.initializeLayout();
    await this.initializePanels();
    this.openInWindow({
      title: 'Interactives Editor',
      name: 'window for interactives editor'
    });
    return this;
  }

  async initializePanels () {
    this.sequenceOverview = this.addMorph(new SequenceOverview({ position: pt(0, 0) }));

    this.preview = new Preview();
    this.preview.initialize(this);
    this.addMorph(this.preview);

    this.morphInspector = new InteractiveMorphInspector({
      position: pt(CONSTANTS.PREVIEW_WIDTH + CONSTANTS.SIDEBAR_WIDTH, 0),
      extent: pt(CONSTANTS.SIDEBAR_WIDTH, CONSTANTS.SUBWINDOW_HEIGHT),
      borderWidth: CONSTANTS.BORDER_WIDTH
    });
    this.morphInspector.initialize();
    this.addMorph(this.morphInspector);

    this.globalTimeline = new GlobalTimeline({
      position: pt(0, CONSTANTS.SUBWINDOW_HEIGHT),
      extent: pt(CONSTANTS.EDITOR_WIDTH, CONSTANTS.EDITOR_HEIGHT - CONSTANTS.SUBWINDOW_HEIGHT)
    });
    this.globalTimeline.initialize(this);

    this.tabs = await resource('part://tabs/tabs').read();
    this.tabs.name = 'tabs';
    this.tabs.position = pt(0, CONSTANTS.SUBWINDOW_HEIGHT);
    this.tabs.extent = pt(CONSTANTS.EDITOR_WIDTH, CONSTANTS.EDITOR_HEIGHT - CONSTANTS.SUBWINDOW_HEIGHT);
    (await this.tabs.addTab('Scrollytelling', this.globalTimeline, (selected) => {
      if (selected) this.showGlobalTimeline();
    })).closeable = false;
    this.addMorph(this.tabs);
  }

  initializeLayout () {
    this.layout = new ProportionalLayout({
      lastExtent: this.extent
    });
    this.extent = pt(CONSTANTS.EDITOR_WIDTH, CONSTANTS.EDITOR_HEIGHT);
  }

  loadInteractive (interactive) {
    if (this.interactive) {
      this.clearInteractive();
    }
    this.interactive = interactive;
    connect(this.interactive, 'scrollPosition', this, 'interactiveScrollPosition');
    connect(this, 'interactiveScrollPosition', this.interactive, 'scrollPosition');
    this.showGlobalTimeline();
  }

  clearInteractive () {
    disconnect(this.interactive, 'scrollPosition', this, 'interactiveScrollPosition');
    disconnect(this, 'interactiveScrollPosition', this.interactive, 'scrollPosition');
    this.interactive.remove();
    this.morphInspector.deselect();
    this.sequenceTimelines.forEach(sequenceTimeline => disconnect(this, 'interactiveScrollPosition', sequenceTimeline, 'onScrollChange'));
    this.sequenceTimelines = [];
  }

  initializeSequenceView (sequence) {
    this.interactiveScrollPosition = sequence.start;
    const timeline = this.initializeSequenceTimeline(sequence);
    this.tabs.addTab(sequence.name, timeline, (selected) => {
      if (selected) this.interactive.showOnly(sequence);
    });
    this.sequenceTimelines.push(timeline);
  }

  initializeSequenceTimeline (sequence) {
    const sequenceTimeline = new SequenceTimeline({ position: pt(0, CONSTANTS.SUBWINDOW_HEIGHT), extent: pt(CONSTANTS.EDITOR_WIDTH, CONSTANTS.EDITOR_HEIGHT - CONSTANTS.SUBWINDOW_HEIGHT), name: `${sequence.name} timeline`, editor: this });
    this.addMorph(sequenceTimeline);
    sequenceTimeline.initialize(this);
    sequenceTimeline.loadContent(sequence);
    return sequenceTimeline;
  }

  showGlobalTimeline () {
    if (!this.interactive) return;
    this.interactive.showAllSequences();
    this.addMorph(this.globalTimeline);
    this.sequenceTimelines.forEach(timeline => timeline.remove());
  }

  get timeline () {
    // TODO change as soon as the tab layout is implemented
    return this.submorphs.includes(this.globalTimeline) ? this.globalTimeline : this.sequenceTimelines[0];
  }

  get keybindings () {
    return [
      { keys: 'Left', command: 'move scrollposition backwards' },
      { keys: 'Right', command: 'move scrollposition forward' },
      { keys: 'Esc', command: 'show global timeline' }
    ].concat(super.keybindings);
  }

  get commands () {
    return [
      {
        name: 'move scrollposition forward',
        doc: 'Move the scrollPosition of the interactive forward by one unit',
        exec: () => {
          if (this.interactive) {
            this.interactive.scrollPosition++;
          }
        }
      },
      {
        name: 'move scrollposition backwards',
        doc: 'Move the scrollPosition of the interactive back by one unit',
        exec: () => {
          if (this.interactive) {
            this.interactive.scrollPosition--;
          }
        }
      },
      {
        name: 'show global timeline',
        doc: 'Show the global timeline',
        exec: () => {
          if (this.interactive) {
            this.showGlobalTimeline();
          }
        }
      }];
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
      },
      editor: {}
    };
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

  loadContent (interactive) {
    this.withAllSubmorphsDo(submorph => {
      if (submorph !== this) submorph.remove();
    });
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
      },
      editor: {}
    };
  }
}
