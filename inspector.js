import { Morph, VerticalLayout, Icon, Label } from 'lively.morphic';
import { pt, rect } from 'lively.graphics';
import { COLOR_SCHEME } from './colors.js';
import { NumberWidget } from 'lively.ide/value-widgets.js';
import { Button } from 'lively.components';
import { InteractiveMorphSelector } from 'lively.halos';
import { disconnect, connect } from 'lively.bindings';
import { Sequence } from 'interactives-editor';
import { Keyframe } from './animations.js';

export class InteractiveMorphInspector extends Morph {
  static get properties () {
    return {
      name: {
        defaultValue: 'interactive morph inspector'
      },
      borderColor: {
        defaultValue: COLOR_SCHEME.BACKGROUND_VARIANT
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
      nativeCursor: {
        defaultValue: 'pointer'
      },
      tooltip: {
        defaultValue: 'Create a keyframe'
      },
      mode: {

      },
      inspector: { },
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
