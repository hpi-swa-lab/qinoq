import { Window, Button } from 'lively.components';
import { pt, rect, Color } from 'lively.graphics';
import { VerticalLayout, Icon, Label, ProportionalLayout, Morph } from 'lively.morphic';
import { Timeline, GlobalTimeline, SequenceTimeline } from './timeline.js';
import { Interactive, Sequence } from 'interactives-editor';
import { connect, disconnect } from 'lively.bindings';
import { COLOR_SCHEME } from './colors.js';
import Inspector from 'lively.ide/js/inspector.js';
import { NumberWidget } from 'lively.ide/value-widgets.js';
import { Keyframe } from './animations.js';
import { InteractiveMorphSelector } from 'lively.halos';

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
          this.initializeGlobalTimeline(interactive);
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
      },
      globalTimeline: {
      },
      interactiveScrollPosition: {
        defaultValue: 0
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
    this.morphInspector.initialize();
    this.globalTimeline = new GlobalTimeline({ position: pt(0, CONSTANTS.SUBWINDOW_HEIGHT), extent: pt(CONSTANTS.EDITOR_WIDTH, CONSTANTS.EDITOR_HEIGHT - CONSTANTS.SUBWINDOW_HEIGHT) });

    this.globalTimeline.initialize();
    this.addMorph(this.globalTimeline);
  }

  initializeLayout () {
    this.layout = new ProportionalLayout({
      lastExtent: this.extent
    });
    this.extent = pt(CONSTANTS.EDITOR_WIDTH, CONSTANTS.EDITOR_HEIGHT);
  }

  loadInteractive (interactive) {
    this.interactive = interactive;
    connect(this.interactive, 'scrollPosition', this, 'interactiveScrollPosition');
    connect(this, 'interactiveScrollPosition', this.interactive, 'scrollPosition');
  }

  initializePreview (interactive) {
    this.preview.setContent(interactive);
  }

  initializeGlobalTimeline (interactive) {
    this.globalTimeline.loadContent(interactive);
  }

  initializeSequenceView (sequence) {
    this.interactive.showOnly(sequence);
    this.interactiveScrollPosition = sequence.start;
    this.sequenceTimelines.push(this.initializeSequenceTimeline(sequence));
    this.globalTimeline.remove();
  }

  initializeSequenceTimeline (sequence) {
    const sequenceTimeline = new SequenceTimeline({ position: pt(0, CONSTANTS.SUBWINDOW_HEIGHT), extent: pt(CONSTANTS.EDITOR_WIDTH, CONSTANTS.EDITOR_HEIGHT - CONSTANTS.SUBWINDOW_HEIGHT), name: `${sequence.name} timeline` });
    this.addMorph(sequenceTimeline);
    sequenceTimeline.initialize();
    sequenceTimeline.loadContent(sequence);
    return sequenceTimeline;
  }

  showGlobalTimeline () {
    this.interactive.showAllSequences();
    this.addMorph(this.globalTimeline);
    this.sequenceTimelines.forEach(timeline => timeline.remove());
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
      },
      shownProperties: {
        defaultValue: ['position', 'fill', 'extent']
      },
      ui: {
        defaultValue: {}
      },
      targetMorph: {
        set (m) {
          this.disbandConnections();
          this.setProperty('targetMorph', m);
          this.ui.headline.textString = m.toString();
          this.updatePositionInInspector();
          this.createConnections();
        }
      }
    };
  }

  get interactive () {
    return this.owner.interactive;
  }

  build () {
    this.ui.positionLabel = new Label({ name: 'position label', textString: 'Position', position: pt(15, 0) });
    this.ui.positionX = new NumberWidget({ position: pt(65, 0) });
    this.ui.positionY = new NumberWidget({ position: pt(65, 30) });
    this.ui.positionKeyframe = new KeyframeButton({ position: pt(165, 0), inspector: this, property: 'position', propType: 'point' });

    this.ui.targetPicker = new Button({
      name: 'targetPicker',
      padding: rect(2, 2, 0, 0),
      borderRadius: 15,
      master: {
        auto: 'styleguide://System/buttons/light'
      },
      tooltip: 'Change Inspection Target',
      label: Icon.textAttribute('crosshairs'),
      extent: pt(25, 25),
      position: pt(5, 5)
    });
    this.ui.targetPicker.onMouseDown = async (evt) => {
      this.targetMorph = await InteractiveMorphSelector.selectMorph($world, null, morph => morph._morphInInteractive);
    };

    this.ui.headlinePane = new Morph();
    this.ui.headline = new Label({ name: 'headline', textString: 'No morph selected', fontWeight: 'bold' });
    this.ui.headlinePane.addMorph(this.ui.headline);

    this.ui.propertyPane = new Morph();
    this.ui.propertyPane.addMorph(this.ui.positionLabel);
    this.ui.propertyPane.addMorph(this.ui.positionX);
    this.ui.propertyPane.addMorph(this.ui.positionY);
    this.ui.propertyPane.addMorph(this.ui.positionKeyframe);

    this.ui.footerPane = new Morph();
    this.ui.footerPane.addMorph(this.ui.targetPicker);

    this.addMorph(this.ui.headlinePane);
    this.addMorph(this.ui.propertyPane);
    this.addMorph(this.ui.footerPane);
    this.layout = new VerticalLayout({
      autoResize: false,
      spacing: 5
    });
  }

  disbandConnections () {
    if (this.targetMorph) {
      disconnect(this.ui.positionX, 'number', this, 'updatePositionInMorph');
      disconnect(this.ui.positionY, 'number', this, 'updatePositionInMorph');
      disconnect(this.targetMorph, 'position', this, 'updatePositionInInspector');
    }
  }

  createConnections () {
    connect(this.ui.positionX, 'number', this, 'updatePositionInMorph');
    connect(this.ui.positionY, 'number', this, 'updatePositionInMorph');
    connect(this.targetMorph, 'position', this, 'updatePositionInInspector');
  }

  updatePositionInInspector () {
    if (this._updatingMorph) {
      return;
    }
    this._updatingInspector = true;
    this.ui.positionX.number = this.targetMorph.position.x;
    this.ui.positionY.number = this.targetMorph.position.y;
    this._updatingInspector = false;
  }

  updatePositionInMorph () {
    if (this._updatingInspector) {
      return;
    }
    this._updatingMorph = true;
    this.targetMorph.position = pt(this.ui.positionX.number, this.ui.positionY.number);
    this._updatingMorph = false;
  }

  async initialize () {
    this.extent = pt(CONSTANTS.SIDEBAR_WIDTH, CONSTANTS.SUBWINDOW_HEIGHT);
    this.build();
  }
}

class KeyframeButton extends Morph {
  static get properties () {
    return {
      fill: {
        defaultValue: COLOR_SCHEME.SECONDARY
      },
      extent: {
        defaultValue: pt(15, 15)
      },
      rotation: {
        defaultValue: Math.PI / 4
      },
      tooltip: {
        defaultValue: 'Create a keyframe'
      },
      mode: {

      },
      inspector: {

      },
      property: {
        set (prop) {
          this.setProperty('property', prop);
          this.tooltip = `Create a keyframe for the ${prop} property`;
        }
      },
      propType: {}
    };
  }

  get target () {
    return this.inspector.targetMorph;
  }

  get currentValue () {
    return this.target[this.property];
  }

  onMouseDown (evt) {
    super.onMouseDown(evt);
    const sequence = Sequence.getSequenceOfMorph(this.target);
    const animation = sequence.addKeyframeToMorph(new Keyframe(sequence.progress, this.currentValue), this.target, this.property);
  }
}
