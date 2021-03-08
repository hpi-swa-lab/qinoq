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
    this.morphInspector.initialize(this);
    this.addMorph(this.morphInspector);

    this.globalTimeline = new GlobalTimeline({
      position: pt(0, CONSTANTS.SUBWINDOW_HEIGHT),
      extent: pt(CONSTANTS.EDITOR_WIDTH, CONSTANTS.EDITOR_HEIGHT - CONSTANTS.SUBWINDOW_HEIGHT)
    });
    this.globalTimeline.initialize(this);

    this.tabContainer = await resource('part://tabs/tabs').read();
    Object.assign(this.tabContainer, {
      position: pt(0, CONSTANTS.SUBWINDOW_HEIGHT),
      extent: pt(CONSTANTS.EDITOR_WIDTH, CONSTANTS.EDITOR_HEIGHT - CONSTANTS.SUBWINDOW_HEIGHT),
      showNewTabButton: false,
      tabHeight: 28
    });

    this.globalTab = await this.tabContainer.addTab('Scrollytelling', this.globalTimeline);
    this.globalTab.closeable = false;
    connect(this.globalTab, 'onSelectionChange', this, 'showGlobalTimeline', {
      updater: ($update, selected) => {
        if (selected) $update();
      }
    });

    this.addMorph(this.tabContainer);
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
    connect(this.interactive, 'name', this.globalTab, 'caption').update(this.interactive.name);
    connect(this.globalTab, 'caption', this.interactive, 'name');
    connect(this.globalTab, 'onSelectionChange', this.interactive, 'showAllSequences', {
      updater: '($update, selected) => {if (selected) $update()}'
    });
  }

  clearInteractive () {
    disconnect(this.interactive, 'scrollPosition', this, 'interactiveScrollPosition');
    disconnect(this, 'interactiveScrollPosition', this.interactive, 'scrollPosition');
    this.interactive.remove();
    this.morphInspector.deselect();
    this.sequenceTimelines.forEach(sequenceTimeline => disconnect(this, 'interactiveScrollPosition', sequenceTimeline, 'onScrollChange'));
  }

  async initializeSequenceView (sequence) {
    this.interactiveScrollPosition = sequence.start;

    const sequenceTab = this.getTabFor(sequence);
    if (sequenceTab) {
      sequenceTab.selected = true;
      return this.getTimelineFor(sequenceTab);
    }

    const timeline = this.initializeSequenceTimeline(sequence);
    const tab = await this.tabContainer.addTab(sequence.name, timeline);
    connect(sequence, 'name', tab, 'caption');
    connect(tab, 'caption', sequence, 'name');
    connect(tab, 'onSelectionChange', this.interactive, 'showOnly', {
      updater: `($update, selected) => {
        if (selected) $update(sequence);
      }`,
      varMapping: { sequence: this.getSequenceFor(tab) }
    }).update(tab.selected);
  }

  initializeSequenceTimeline (sequence) {
    const sequenceTimeline = new SequenceTimeline({ position: pt(0, CONSTANTS.SUBWINDOW_HEIGHT), extent: pt(CONSTANTS.EDITOR_WIDTH, CONSTANTS.EDITOR_HEIGHT - CONSTANTS.SUBWINDOW_HEIGHT) });
    sequenceTimeline.initialize(this);
    sequenceTimeline.loadContent(sequence);
    return sequenceTimeline;
  }

  get keybindings () {
    return [
      { keys: 'Left', command: 'move scrollposition backwards' },
      { keys: 'Right', command: 'move scrollposition forward' }
    ].concat(super.keybindings);
  }

  get sequenceTimelines () {
    return this.tabs.filter(tab => tab !== this.globalTab).map(tab => tab.content);
  }

  get tabs () {
    return this.tabContainer.tabs;
  }

  getTabFor (sequence) {
    return this.tabs.find(tab => tab.content.isSequenceTimeline && tab.content.sequence === sequence);
  }

  getTimelineFor (tab) {
    return tab.content;
  }

  getSequenceFor (tab) {
    return this.getTimelineFor(tab).sequence;
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
      _editor: {}
    };
  }

  get editor () {
    return this.editor;
  }

  initialize (editor) {
    this._editor = editor;
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
