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
      ui: {
        defaultValue: {}
      },
      propertyControls: {
        defaultValue: {}
      },
      targetMorph: {
        set (m) {
          this.disbandConnections();
          this.setProperty('targetMorph', m);
          this.ui.headline.textString = m.toString();
          this.buildPropertyControls();
          this.updateInInspector();
          this.createConnections();
        }
      }
    };
  }

  get possibleProperties () {
    return {
      // extent: 'point',
      position: 'point',
      fill: 'color'
    };
  }

  get displayedProperties () {
    return Object.keys(this.propertyControls);
  }

  get interactive () {
    return this.owner.interactive;
  }

  get propertiesToDisplay () {
    const possible = Object.keys(this.possibleProperties);
    return possible.filter(prop => prop in this.targetMorph);
  }

  buildPropertyControls () {
    if (!this.targetMorph) {
      return;
    }
    const props = this.propertiesToDisplay;
    props.forEach(propToInspect => {
      const propType = this.possibleProperties[propToInspect];
      this.buildPropertyControl(propToInspect, propType);
    });
  }

  buildPropertyControl (property, propType) {
    if (propType === 'point') {
      this.propertyControls[property] = {};
      this.propertyControls[property].label = new Label({
        name: `${property} label`,
        textString: property,
        position: pt(15, 0)
      });
      this.propertyControls[property].x = new NumberWidget({ position: pt(65, 0) });
      this.propertyControls[property].y = new NumberWidget({ position: pt(65, 30) });
      this.propertyControls[property].keyframe = new KeyframeButton({
        position: pt(165, 0),
        inspector: this,
        property,
        propType
      });
      this.ui[property] = new Morph();

      Object.values(this.propertyControls[property]).forEach(m => this.ui[property].addMorph(m));
      this.ui.propertyPane.addMorph(this.ui[property]);
    }
  }

  build () {
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
      this.displayedProperties.forEach(inspectedProperty => {
        const propType = this.possibleProperties[inspectedProperty];
        switch (propType) {
          case 'point':
            disconnect(this.propertyControls[inspectedProperty].x, 'number', this, 'updateInMorph');
            disconnect(this.propertyControls[inspectedProperty].y, 'number', this, 'updateInMorph');
            disconnect(this.targetMorph, inspectedProperty, this, 'updateInInspector');
            break;
        }
      });
    }
  }

  createConnections () {
    this.displayedProperties.forEach(inspectedProperty => {
      const propType = this.possibleProperties[inspectedProperty];

      switch (propType) {
        case 'point':

          connect(this.propertyControls[inspectedProperty].x, 'number', this, 'updateInMorph');
          connect(this.propertyControls[inspectedProperty].y, 'number', this, 'updateInMorph');
          connect(this.targetMorph, inspectedProperty, this, 'updateInInspector');
          break;
      }
    });
  }

  updateInInspector () {
    if (this._updatingMorph) {
      return;
    }
    this._updatingInspector = true;
    this.displayedProperties.forEach(property => {
      const propType = this.possibleProperties[property];
      switch (propType) {
        case 'point':
          this.propertyControls[property].x.number = this.targetMorph[property].x;
          this.propertyControls[property].y.number = this.targetMorph[property].y;
          break;
      }
    });
    this._updatingInspector = false;
  }

  updateInMorph () {
    if (this._updatingInspector) {
      return;
    }
    this._updatingMorph = true;
    this.displayedProperties.forEach(property => {
      const propType = this.possibleProperties[property];
      switch (propType) {
        case 'point':
          this.targetMorph[property] = pt(this.propertyControls[property].x.number, this.propertyControls[property].y.number);
          break;
      }
    });
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
