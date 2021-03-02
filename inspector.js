import { Morph, HorizontalLayout, VerticalLayout, Icon, Label } from 'lively.morphic';
import { pt, rect } from 'lively.graphics';
import { COLOR_SCHEME } from './colors.js';
import { NumberWidget } from 'lively.ide/value-widgets.js';
import { Button } from 'lively.components';
import { InteractiveMorphSelector } from 'lively.halos';
import { disconnect, connect } from 'lively.bindings';
import { Sequence } from 'interactives-editor';
import { Keyframe } from './animations.js';
import { ColorPickerField } from 'lively.ide/styling/color-picker.js';

export class InteractiveMorphInspector extends Morph {
  static get properties () {
    return {
      name: {
        defaultValue: 'interactive morph inspector'
      },
      borderColor: {
        defaultValue: COLOR_SCHEME.BACKGROUND_VARIANT
      },
      clipMode: {
        defaultValue: 'auto'
      },
      ui: {
        defaultValue: {}
      },
      propertyControls: {
        defaultValue: {}
      },
      targetMorph: {
        set (morph) {
          if (morph) {
            this.disbandConnections();
            this.setProperty('targetMorph', morph);
            this.ui.headline.textString = `Inspecting ${morph.toString()}`;

            this.buildPropertyControls();
            this.updateInInspector();
            this.createConnections();
          }
        }
      }
    };
  }

  get possibleProperties () {
    return {
      extent: 'point',
      position: 'point',
      fill: 'color',
      blur: 'number',
      flipped: 'number',
      tilted: 'number',
      grayscale: 'number',
      opacity: 'number',
      rotation: 'number',
      scale: 'number',
      fontSize: 'number',
      lineHeight: 'number',
      progress: 'number'
    };
  }

  get displayedProperties () {
    return Object.keys(this.propertyControls);
  }

  get interactive () {
    return this.owner.interactive;
  }

  get sequence () {
    if (this.targetMorph) {
      return Sequence.getSequenceOfMorph(this.targetMorph);
    }
    return undefined;
  }

  get propertiesToDisplay () {
    const possible = Object.keys(this.possibleProperties);
    return possible.filter(prop => prop in this.targetMorph);
  }

  buildPropertyControls () {
    if (!this.targetMorph) {
      return;
    }
    this.ui.propertyPane.submorphs.forEach(morph => morph.remove());
    const props = this.propertiesToDisplay;
    props.forEach(propToInspect => {
      const propType = this.possibleProperties[propToInspect];
      this.buildPropertyControl(propToInspect, propType);
    });
  }

  buildPropertyControl (property, propType) {
    this.propertyControls[property] = {};
    this.propertyControls[property].label = new Label({
      name: `${property} label`,
      textString: property,
      position: pt(15, 0)
    });
    switch (propType) {
      case 'point':
        this.propertyControls[property].x = new NumberWidget({ position: pt(65, 0) });
        this.propertyControls[property].y = new NumberWidget({ position: pt(65, 27) });
        break;
      case 'color':
        this.propertyControls[property].color = new ColorPickerField({ position: pt(65, 0), colorValue: this.targetMorph[property] });
        break;
      case 'number':
        this.buildNumberPropertyControl(property);
        break;
    }
    this.propertyControls[property].keyframe = new KeyframeButton({
      position: pt(165, 0),
      inspector: this,
      property,
      propType,
      sequence: this.sequence
    });
    this.propertyControls[property].keyframe.initialize();
    this.ui[property] = new Morph();
    Object.values(this.propertyControls[property]).forEach(morph => this.ui[property].addMorph(morph));
    this.ui.propertyPane.addMorph(this.ui[property]);
  }

  buildNumberPropertyControl (property) {
    const spec = this.propertiesAndPropertySettings().properties[property];
    let floatingPoint = spec.isFloat;
    let unit = '';
    let min = -Infinity;
    let max = Infinity;
    if (spec.isFloat && spec.max == 1) {
      // Use a percentage value instead of just numbers
      unit = '%';
      floatingPoint = false; // Numbers have too many digits with floating point
      min = 0;
      max = 100;
    }

    this.propertyControls[property].number = new NumberWidget({ position: pt(65, 0), floatingPoint, unit, min, max });
  }

  buildTargetPicker () {
    this.ui.targetPicker = new Button({
      name: 'targetPicker',
      padding: rect(2, 2, 0, 0),
      borderRadius: 15,
      master: {
        auto: 'styleguide://System/buttons/light'
      },
      tooltip: 'Choose Inspection Target',
      label: Icon.textAttribute('crosshairs'),
      extent: pt(25, 25),
      position: pt(5, 5)
    });
    this.ui.targetPicker.onMouseDown = async (evt) => {
      this.targetMorph = await InteractiveMorphSelector.selectMorph($world, null, morph => morph._morphInInteractive);
    };
  }

  build () {
    this.buildTargetPicker();

    this.ui.headlinePane = new Morph({ name: 'headline pane' });
    this.ui.headline = new Label({ name: 'headline', textString: 'No morph selected', fontWeight: 'bold' });
    this.ui.headlinePane.layout = new HorizontalLayout({ spacing: 5, align: 'center' });
    this.ui.headlinePane.addMorph(this.ui.headline);
    this.ui.headlinePane.addMorph(this.ui.targetPicker);

    this.ui.propertyPane = new Morph({ name: 'property pane' });
    this.ui.propertyPane.layout = new VerticalLayout({ spacing: 2 });

    this.addMorph(this.ui.headlinePane);
    this.addMorph(this.ui.propertyPane);
    this.layout = new VerticalLayout({
      autoResize: false,
      spacing: 5
    });
  }

  disbandConnections () {
    if (this.targetMorph) {
      this.displayedProperties.forEach(inspectedProperty => {
        const propType = this.possibleProperties[inspectedProperty];
        disconnect(this.targetMorph, inspectedProperty, this, 'updateInInspector');
        switch (propType) {
          case 'point':
            disconnect(this.propertyControls[inspectedProperty].x, 'number', this, 'updateInMorph');
            disconnect(this.propertyControls[inspectedProperty].y, 'number', this, 'updateInMorph');
            break;
          case 'color':
            disconnect(this.propertyControls[inspectedProperty].color, 'colorValue', this, 'updateInMorph');
            break;
          case 'number':
            disconnect(this.propertyControls[inspectedProperty].number, 'number', this, 'updateInMorph');
            break;
        }
      });
    }
  }

  createConnections () {
    this.displayedProperties.forEach(inspectedProperty => {
      const propType = this.possibleProperties[inspectedProperty];
      connect(this.targetMorph, inspectedProperty, this, 'updateInInspector');
      switch (propType) {
        case 'point':
          connect(this.propertyControls[inspectedProperty].x, 'number', this, 'updateInMorph');
          connect(this.propertyControls[inspectedProperty].y, 'number', this, 'updateInMorph');
          break;
        case 'color':
          connect(this.propertyControls[inspectedProperty].color, 'colorValue', this, 'updateInMorph');
          break;
        case 'number':
          connect(this.propertyControls[inspectedProperty].number, 'number', this, 'updateInMorph');
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
        case 'color':
          this.propertyControls[property].color.update(this.targetMorph[property]);
          break;
        case 'number':
          if (this.propertyControls[property].number.unit == '%') {
            this.propertyControls[property].number.number = this.targetMorph[property] * 100;
          } else {
            this.propertyControls[property].number.number = this.targetMorph[property];
          }
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
        case 'color':
          this.targetMorph[property] = this.propertyControls[property].color.colorValue;
          break;
        case 'number':
          if (this.propertyControls[property].number.unit == '%') {
            this.targetMorph[property] = this.propertyControls[property].number.number / 100;
          } else {
            this.targetMorph[property] = this.propertyControls[property].number.number;
          }
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
      borderColor: {
        defaultValue: COLOR_SCHEME.SECONDARY
      },
      nativeCursor: {
        defaultValue: 'pointer'
      },
      tooltip: {
        defaultValue: 'Create a keyframe'
      },
      borderStyle: {
        defaultValue: 'solid'
      },
      mode: {
        defaultValue: 'default',
        type: 'Enum',
        values: ['default', 'activated']
      },
      inspector: { },
      animation: { },
      sequence: {
        set (s) {
          if (this.sequence) {
            disconnect(s, 'updateProgress', this, 'updateStyle');
          }
          connect(s, 'updateProgress', this, 'updateStyle');
          this.setProperty('sequence', s);
        }
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

  initialize () {
    this.setDefaultStyle();
    this.animation = this.sequence.getAnimationForMorphProperty(this.target, this.property);
  }

  onMouseUp (evt) {
    this.setActivatedStyle();
    this.mode = 'activated';
    this.animation = this.sequence.addKeyframeForMorph(new Keyframe(this.sequence.progress, this.currentValue), this.target, this.property, this.propType);
  }

  // The rest is styling. This may be improved with a master component. See styleguides/keyframe-inspector.json

  setDefaultStyle () {
    this.fill = COLOR_SCHEME.TRANSPARENT;
    this.borderWidth = 2;
  }

  setHoverStyle () {
    this.fill = COLOR_SCHEME.SECONDARY_VARIANT;
    this.borderWidth = 0;
  }

  setClickStyle () {
    this.fill = COLOR_SCHEME.SECONDARY_VARIANT;
    this.borderWidth = 2;
  }

  setActivatedStyle () {
    this.fill = COLOR_SCHEME.SECONDARY;
    this.borderWidth = 0;
  }

  onMouseDown (evt) {
    super.onMouseDown(evt);
    this.setClickStyle();
  }

  onHoverIn (evt) {
    this.setHoverStyle();
  }

  onHoverOut (evt) {
    if (this.mode == 'activated') {
      this.setActivatedStyle();
    } else {
      this.setDefaultStyle();
    }
  }

  updateStyle () {
    if (!this.animation) {
      return;
    }
    const animationPosition = this.sequence.progress;

    if (this.animation.getKeyframeAt(animationPosition)) {
      this.mode = 'activated';
      this.setActivatedStyle();
    } else {
      this.mode = 'default';
      this.setDefaultStyle();
    }
  }
}
