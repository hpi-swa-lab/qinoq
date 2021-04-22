import { HorizontalLayout, Morph, VerticalLayout, Icon, Label } from 'lively.morphic';
import { pt, rect } from 'lively.graphics';
import { COLOR_SCHEME } from './colors.js';
import { NumberWidget } from 'lively.ide/value-widgets.js';
import { Button } from 'lively.components';
import { InteractiveMorphSelector } from 'lively.halos';
import { disconnect, connect } from 'lively.bindings';
import { ColorPickerField } from 'lively.ide/styling/color-picker.js';
import { Sequence, Keyframe } from './index.js';
import { animatedPropertiesAndTypes, getColorForProperty } from './properties.js';
import { QinoqMorph } from './qinoq-morph.js';

const CONSTANTS = {
  LABEL_X: 10,
  WIDGET_X: 65,
  WIDGET_ONE_Y: 0,
  WIDGET_TWO_Y: 27,
  KEYFRAME_BUTTON_X: 165,
  TARGET_PICKER_DIAMETER: 25,
  TARGET_PICKER_BORDER_RADIUS: 15
};

export class InteractiveMorphInspector extends QinoqMorph {
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
          if (this._deserializing) {
            this.setProperty('targetMorph', morph);
            return;
          }

          if (morph && morph != this.targetMorph) {
            this.disbandConnections();
            this.setProperty('targetMorph', morph);
            this.ui.headline.textString = `Inspecting ${morph.toString()}`;

            this.buildPropertyControls();
            this.refreshAllPropertiesInInspector();
            for (const property in this.propertyControls) {
              this.propertyControls[property].keyframe.updateStyle();
            }
            this.createConnections();
          }
        }
      }
    };
  }

  get displayedProperties () {
    return Object.keys(this.propertyControls);
  }

  get sequence () {
    return Sequence.getSequenceOfMorph(this.targetMorph);
  }

  get propertiesToDisplay () {
    const defaultPropertiesAndTypesInMorph = Object.entries(animatedPropertiesAndTypes())
      .filter(propertyAndType => propertyAndType[0] in this.targetMorph);
    const additionalProperties = Object.entries(this.targetMorph.propertiesAndPropertySettings().properties)
      .filter(propertyAndSettings => 'animateAs' in propertyAndSettings[1])
      .map(propertyAndSettings => [propertyAndSettings[0], propertyAndSettings[1].animateAs]);
    const propertyList = defaultPropertiesAndTypesInMorph.concat(additionalProperties);
    return Object.fromEntries(propertyList);
  }

  buildPropertyControls () {
    if (!this.targetMorph) {
      return;
    }
    this.ui.propertyPane.submorphs.forEach(morph => morph.withAllSubmorphsDo(submorph => submorph.remove()));
    const props = Object.keys(this.propertiesToDisplay);
    props.forEach(propToInspect => {
      const propType = this.propertiesToDisplay[propToInspect];
      this.buildPropertyControl(propToInspect, propType);
    });
  }

  buildPropertyControl (property, propType) {
    this.propertyControls[property] = {};
    this.propertyControls[property].label = new Label({
      name: `${property} label`,
      textString: property,
      position: pt(CONSTANTS.LABEL_X, 0)
    });
    switch (propType) {
      case 'point':
        this.propertyControls[property].x = new NumberWidget({ position: pt(CONSTANTS.WIDGET_X, CONSTANTS.WIDGET_ONE_Y) });
        this.propertyControls[property].y = new NumberWidget({ position: pt(CONSTANTS.WIDGET_X, CONSTANTS.WIDGET_TWO_Y) });
        break;
      case 'color':
        this.propertyControls[property].color = new ColorPickerField({ position: pt(CONSTANTS.WIDGET_X, CONSTANTS.WIDGET_ONE_Y), colorValue: this.targetMorph[property] });
        break;
      case 'number':
        this.buildNumberPropertyControl(property);
        break;
    }
    this.propertyControls[property].keyframe = new KeyframeButton({
      position: pt(CONSTANTS.KEYFRAME_BUTTON_X, CONSTANTS.WIDGET_ONE_Y),
      inspector: this,
      property,
      propType,
      sequence: this.sequence
    });
    this.propertyControls[property].keyframe.initialize(this.editor);
    this.ui[property] = new Morph();
    Object.values(this.propertyControls[property]).forEach(morph => this.ui[property].addMorph(morph));
    this.ui.propertyPane.addMorph(this.ui[property]);
  }

  buildNumberPropertyControl (property) {
    const spec = this.targetMorph.propertiesAndPropertySettings().properties[property];
    let floatingPoint = spec.isFloat;
    let unit = '';
    let min = -Infinity;
    let max = Infinity;
    if (spec.isFloat && spec.max === 1) {
      // Use a percentage value instead of just numbers
      unit = '%';
      floatingPoint = false; // Numbers have too many digits with floating point
      min = 0;
      max = 100;
    }

    this.propertyControls[property].number = new NumberWidget({ position: pt(CONSTANTS.WIDGET_X, CONSTANTS.WIDGET_ONE_Y), floatingPoint, unit, min, max });
  }

  buildTargetPicker () {
    this.ui.targetPicker = new Button({
      name: 'targetPicker',
      padding: rect(2, 2, 0, 0),
      borderRadius: CONSTANTS.TARGET_PICKER_BORDER_RADIUS,
      master: {
        auto: 'styleguide://System/buttons/light'
      },
      tooltip: 'Choose Inspection Target',
      label: Icon.textAttribute('crosshairs'),
      extent: pt(CONSTANTS.TARGET_PICKER_DIAMETER, CONSTANTS.TARGET_PICKER_DIAMETER)
    });
    this.ui.targetPicker.onMouseDown = async (event) => {
      this.targetMorph = await InteractiveMorphSelector.selectMorph($world, null, morph => Sequence.getSequenceOfMorph(morph) && Sequence.getSequenceOfMorph(morph).focused);
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
      disconnect(this.targetMorph, 'name', this.ui.headline, 'textString');
      const sequenceOfTarget = this.sequence;
      this.displayedProperties.forEach(inspectedProperty => {
        this.propertyControls[inspectedProperty].keyframe.remove();
        const propType = this.propertiesToDisplay[inspectedProperty];
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
    connect(this.targetMorph, 'name', this.ui.headline, 'textString', { converter: '() => {return `Inspecting ${targetMorph.toString()}`}', varMapping: { targetMorph: this.targetMorph } });
    this.displayedProperties.forEach(inspectedProperty => {
      const propType = this.propertiesToDisplay[inspectedProperty];
      connect(this.targetMorph, inspectedProperty, this, 'updateInInspector', { converter: '() => {return {property, propType}}', varMapping: { property: inspectedProperty, propType } });
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

  updatePropertyInInspector (property, propType) {
    this._updatingInspector = true;
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
    this._updatingInspector = false;
  }

  updateInInspector (spec) {
    if (this._updatingMorph) {
      return;
    }
    if (!spec) {
      return;
    }
    const { property, propType } = spec;
    this.updatePropertyInInspector(property, propType);
  }

  refreshAllPropertiesInInspector () {
    if (this._updatingMorph) {
      return;
    }
    this._updatingInspector = true;
    this.displayedProperties.forEach(property => {
      const propType = this.propertiesToDisplay[property];
      this.updatePropertyInInspector(property, propType);
    });
    this._updatingInspector = false;
  }

  updateInMorph () {
    if (this._updatingInspector) {
      return;
    }
    this._updatingMorph = true;
    this.displayedProperties.forEach(property => {
      const propType = this.propertiesToDisplay[property];
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

  async initialize (editor) {
    this._editor = editor;
    this.build();
    connect($world, 'showHaloFor', this, 'selectMorphThroughHalo');
  }

  selectMorphThroughHalo (morph) {
    if (Array.isArray(morph)) morph = morph[0]; // Multi select through halo
    if (Sequence.getSequenceOfMorph(morph)) {
      this.targetMorph = morph;
    }
  }

  deselect () {
    this.disbandConnections();
    Object.values(this.ui).forEach(uiElement => {
      if (uiElement.isMorph) {
        uiElement.remove();
      }
    });
    this.targetMorph = undefined;
    this.build();
  }

  abandon () {
    disconnect($world, 'showHaloFor', this, 'selectMorphThroughHalo');
    super.abandon();
  }
}

class KeyframeButton extends QinoqMorph {
  static get properties () {
    return {
      extent: {
        defaultValue: pt(15, 15)
      },
      rotation: {
        defaultValue: Math.PI / 4
      },
      borderColor: {
        defaultValue: COLOR_SCHEME.KEYFRAME_BORDER
      },
      nativeCursor: {
        defaultValue: 'pointer'
      },
      borderWidth: {
        defaultValue: 1
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
      _editor: {
        set (_editor) {
          if (this._deserializing) { connect(_editor, 'interactiveScrollPosition', this, 'updateStyle'); }
          this.setProperty('_editor', _editor);
        }
      },
      sequence: {},
      property: {
	after:['tooltip'],
	set (property) {
          this.setProperty('property', property);
          this.tooltip = `Create a keyframe for the ${property} property`;
          this.fill = getColorForProperty(property);
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

  initialize (editor) {
    this._editor = editor;
    this.setDefaultStyle();
    this.animation = this.sequence.getAnimationForMorphProperty(this.target, this.property);
  }

  async onMouseUp () {
    this.mode = 'activated';
    this.setActivatedStyle();
    const newKeyframe = new Keyframe(this.sequence.progress, this.currentValue);
    this.animation = await this.sequence.addKeyframeForMorph(newKeyframe, this.target, this.property, this.propType);
    if (this.animation.useRelativeValues && this.propType == 'point') {
      newKeyframe.value = pt(this.currentValue.x / this.sequence.width, this.currentValue.y / this.sequence.height);
    }
    this.editor.sequenceTimelines.forEach(sequenceTimeline => sequenceTimeline.updateLayers());
  }

  // The rest is styling. This may be improved with a master component. See styleguides/keyframe-inspector.json

  setDefaultStyle () {
    this.fill = COLOR_SCHEME.KEYFRAME_FILL;
    this.borderColor = COLOR_SCHEME.KEYFRAME_BORDER;
  }

  setHoverStyle () {
    this.fill = getColorForProperty(this.property);
  }

  setClickStyle () {
    this.fill = COLOR_SCHEME.TRANSPARENT;
  }

  setActivatedStyle () {
    this.fill = getColorForProperty(this.property);
  }

  onMouseDown (event) {
    super.onMouseDown(event);
    this.setClickStyle();
  }

  onHoverIn () {
    this.setHoverStyle();
  }

  onHoverOut () {
    if (this.mode === 'activated') {
      this.setActivatedStyle();
    } else {
      this.setDefaultStyle();
    }
  }

  async updateStyle () {
    if (this._updatingStyle) {
      return;
    }
    if (!this.animation) {
      return;
    }
    this._updatingStyle = true;
    const animationPosition = this.sequence.progress;

    if (animationPosition >= 0 && animationPosition <= 1 && this.animation.getKeyframeAt(animationPosition)) {
      this.mode = 'activated';
      this.setActivatedStyle();
    } else {
      this.mode = 'default';
      this.setDefaultStyle();
    }
    this._updatingStyle = false;
  }

  remove () {
    if (this.editor) disconnect(this.editor, 'interactiveScrollPosition', this, 'updateStyle');
    super.remove();
  }
}
