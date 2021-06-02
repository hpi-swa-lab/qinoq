import { QinoqMorph } from '../qinoq-morph.js';
import { animatedPropertiesAndTypes, notAnimatableOnLabelMorphWithIcon, notAnimatableOnTextMorph } from '../properties.js';
import { VerticalLayout, Icon, ShadowObject, Label } from 'lively.morphic';
import { pt } from 'lively.graphics';
import { CONSTANTS } from './constants.js';
import { NumberWidget, StringWidget } from 'lively.ide/value-widgets.js';
import { ColorPickerField } from 'lively.ide/styling/color-picker.js';
import { KeyframeButton } from './keyframe-button.js';
import { COLOR_SCHEME } from '../colors.js';
import { disconnect, connect } from 'lively.bindings';

export class AnimationsInspector extends QinoqMorph {
  static get properties () {
    return {
      name: {
        defaultValue: 'animations inspector'
      },
      inspector: {},
      ui: {
        initialize () {
          if (this._deserializing) return;
          this.ui = {};
          this.build();
        }
      },
      propertyControls: {
        initialize () {
          if (!this._deserializing) this.propertyControls = {};
        }
      },
      clipMode: {
        defaultValue: 'auto'
      },
      _unsavedChanges: {
        defaultValue: []
      }
    };
  }

  get sequence () {
    return this.inspector.sequence;
  }

  get displayedProperties () {
    // serialized objects might contain a _rev key that is not removed after deserialization
    return Object.keys(this.propertyControls).filter(property => property !== '_rev');
  }

  get propertiesToDisplay () {
    const defaultPropertiesAndTypesInMorph = Object.entries(animatedPropertiesAndTypes())
      .filter(propertyAndType => propertyAndType[0] in this.targetMorph &&
           !this.propertyNotAnimatableForTargetMorph(propertyAndType[0]));
    const additionalProperties =
        Object.entries(this.targetMorph.propertiesAndPropertySettings().properties)
          .filter(propertyAndSettings => 'animateAs' in propertyAndSettings[1])
          .map(propertyAndSettings =>
            [propertyAndSettings[0], propertyAndSettings[1].animateAs]);
    const propertyList = defaultPropertiesAndTypesInMorph.concat(additionalProperties);
    return Object.fromEntries(propertyList);
  }

  // to exclude some properties for some target morph types
  // that are animatable on other target morphs
  propertyNotAnimatableForTargetMorph (property) {
    if (this.targetMorph.isText) {
      return notAnimatableOnTextMorph.includes(property);
    }

    if (this.targetMorph.isIcon) {
      return notAnimatableOnLabelMorphWithIcon.includes(property);
    }

    return false;
  }

  get targetMorph () {
    return this.inspector.targetMorph;
  }

  initialize () {
    this.buildPropertyControls();
    this.refreshAllPropertiesInInspector();
    this.displayedProperties.forEach(property => {
      this.propertyControls[property].updateButtonStyle();
    });
    this.createConnections();
  }

  build () {
    this.ui.propertyPane = new QinoqMorph({ name: 'property pane' });
    this.ui.propertyPane.layout = new VerticalLayout({ spacing: 2 });

    this.addMorph(this.ui.propertyPane);
    this.layout = new VerticalLayout({
      autoResize: false,
      spacing: 5
    });
  }

  buildPropertyControls () {
    if (!this.inspector.targetMorph) {
      return;
    }
    this.ui.propertyPane.submorphs.forEach(morph => morph.withAllSubmorphsDo(submorph => submorph.remove()));
    const props = Object.keys(this.propertiesToDisplay);
    props.forEach(propToInspect => {
      const propertyType = this.propertiesToDisplay[propToInspect];
      this.buildPropertyControl(propToInspect, propertyType);
    });
  }

  buildPropertyControl (property, propertyType) {
    this.propertyControls[property] = new PropertyControl({
      property: property,
      propertyType: propertyType,
      inspector: this
    });

    this.ui.propertyPane.addMorph(this.propertyControls[property]);
  }

  disbandConnections () {
    if (this.targetMorph) {
      disconnect(this.targetMorph, 'name', this.inspector.ui.headline, 'textString');
      this.displayedProperties.forEach(inspectedProperty => {
        this.propertyControls[inspectedProperty].disbandConnection(this);
        this.propertyControls[inspectedProperty].remove();
      });
    }
    disconnect(this.editor, 'onScrollChange', this, 'resetHighlightingForAllUnsavedChanges');
  }

  createConnections () {
    connect(this.targetMorph, 'name', this.inspector.ui.headline, 'textString', { converter: '() => {return `Inspecting ${targetMorph.toString()}`}', varMapping: { targetMorph: this.targetMorph } });
    this.displayedProperties.forEach(inspectedProperty => {
      this.propertyControls[inspectedProperty].createConnection(this);
    });
    connect(this.editor, 'onScrollChange', this, 'resetHighlightingForAllUnsavedChanges');
  }

  updatePropertyInInspector (property) {
    this._updatingInspector = true;
    this.propertyControls[property].updateValue();
    this._updatingInspector = false;

    const updatingSpec = { property: property, value: this.targetMorph[property] };
    this.highlightUnsavedChanges(updatingSpec);
  }

  updateInInspector (spec) {
    if (this._updatingMorph) {
      return;
    }
    if (!spec) {
      return;
    }
    const { property, propertyType } = spec;
    this.updatePropertyInInspector(property);
  }

  refreshAllPropertiesInInspector () {
    if (this._updatingMorph) {
      return;
    }
    this._updatingInspector = true;
    this.displayedProperties.forEach(property => {
      this.updatePropertyInInspector(property);
    });
    this._updatingInspector = false;
  }

  updateInMorph (updatingSpec = { property: null, value: null }) {
    const property = updatingSpec.property;
    if (this._updatingInspector) {
      return;
    }
    this._updatingMorph = true;

    this.propertyControls[property].updateMorph();

    this._updatingMorph = false;

    this.highlightUnsavedChanges(updatingSpec);
  }

  resetHighlightingForProperty (changedProperty) {
    this._unsavedChanges = this._unsavedChanges.filter(property => { return property != changedProperty; });
    if (this.propertyControls[changedProperty].highlight) {
      this.propertyControls[changedProperty].highlight.abandon();
    }
  }

  resetHighlightingForAllUnsavedChanges () {
    this._unsavedChanges.forEach(property => this.resetHighlightingForProperty(property));
  }

  highlightUnsavedChanges (changedPropertyAndValue) {
    const changedProperty = changedPropertyAndValue.property;
    const changedValue = changedPropertyAndValue.value;
    if (this._unsavedChanges.includes(changedProperty)) return;
    this._unsavedChanges.push(changedProperty);

    const animationOnProperty = this.sequence.getAnimationForMorphProperty(this.targetMorph, changedProperty);

    if (animationOnProperty && !this.checkForPropertyEquality(animationOnProperty.getValueForProgress(this.sequence.progress), changedValue)) {
      this.propertyControls[changedProperty].highlight = new Label({
        position: pt(this.propertyControls[changedProperty].ui.keyframeButton.topRight.x + 5, 5),
        fontColor: COLOR_SCHEME.ERROR,
        halosEnabled: false,
        tooltip: 'Unsaved changes will be removed when scrolling \ninstead add a keyframe to persist them'
      });
      Icon.setIcon(this.propertyControls[changedProperty].highlight, 'exclamation-triangle'),
      this.propertyControls[changedProperty].addMorph(this.propertyControls[changedProperty].highlight);
    }
  }

  checkForPropertyEquality (propertyOne, propertyTwo) {
    // types available are number, string and object (color and point)
    if (typeof propertyOne === 'number' || typeof propertyOne === 'string') {
      return propertyOne == propertyTwo;
    } else {
      return propertyOne.equals(propertyTwo);
    }
  }

  updateRespectiveAnimations () {
    this.displayedProperties.forEach(property => this.propertyControls[property].ui.keyframeButton.updateAnimation());
  }

  updateKeyframeButtonStyle (animation) {
    if (animation.target !== this.targetMorph) return;
    this.withAllSubmorphsDo(submorph => {
      if (submorph.isKeyframeButton && submorph.animation == animation) submorph.setMode();
    });
  }
}

class PropertyControl extends QinoqMorph {
  static get properties () {
    return {
      targetMorph: {},
      property: {},
      propertyType: {},
      inspector: {
        set (inspector) {
          this.setProperty('inspector', inspector);
          if (this._deserializing) return;
          this.targetMorph = this.inspector.targetMorph;
        }
      },
      ui: {
        after: ['property', 'propertyType', 'inspector'],
        initialize () {
          if (!this._deserializing) {
            this.ui = {};
            this.initializeLabel();
            this.buildWidget();
          }
        }
      }
    };
  }

  initializeLabel () {
    this.ui.label = this.addMorph(new Label({
      name: `${this.property} label`,
      textString: this.property,
      position: pt(CONSTANTS.LABEL_X, 0)
    }));
  }

  buildWidget () {
    switch (this.propertyType) {
      case 'point':
        // extent and autofit are necessary for the correct layouting to be applied
        this.ui.x = this.addMorph(new NumberWidget({
          position: pt(CONSTANTS.WIDGET_X, CONSTANTS.WIDGET_ONE_Y),
          extent: CONSTANTS.WIDGET_EXTENT,
          autofit: false,
          floatingPoint: false
        }));
        this.ui.y = this.addMorph(new NumberWidget({
          position: pt(CONSTANTS.WIDGET_X, CONSTANTS.WIDGET_TWO_Y),
          extent: CONSTANTS.WIDGET_EXTENT,
          autofit: false,
          floatingPoint: false
        }));
        break;
      case 'color':
        this.ui.color = this.addMorph(new ColorPickerField({
          position: pt(CONSTANTS.WIDGET_X, CONSTANTS.WIDGET_ONE_Y),
          colorValue: this.targetMorph[this.property],
          dropShadow: new ShadowObject(true)
        }));
        break;
      case 'number':
        this.buildNumberPropertyControl();
        break;
      case 'string':
        this.buildStringPropertyControl();
    }
    this.ui.keyframeButton = this.addMorph(new KeyframeButton({
      position: pt(CONSTANTS.KEYFRAME_BUTTON_X, CONSTANTS.WIDGET_ONE_Y),
      animationsInspector: this.inspector,
      property: this.property,
      propertyType: this.propertyType,
      sequence: this.inspector.sequence,
      _editor: this.inspector.editor
    }));
  }

  buildStringPropertyControl () {
    this.ui.string = this.addMorph(new StringWidget({
      position: pt(CONSTANTS.WIDGET_X, CONSTANTS.WIDGET_ONE_Y),
      fixedWidth: true,
      fixedHeight: true,
      extent: CONSTANTS.WIDGET_EXTENT,
      fontFamilty: 'Sans-Serif',
      fontSize: 16,
      fill: COLOR_SCHEME.SURFACE,
      dropShadow: new ShadowObject(true)
    }))
    ;
  }

  buildNumberPropertyControl () {
    const spec = this.targetMorph.propertiesAndPropertySettings().properties[this.property];
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

    this.ui.number = this.addMorph(new NumberWidget({
      position: pt(CONSTANTS.WIDGET_X, CONSTANTS.WIDGET_ONE_Y),
      floatingPoint,
      unit,
      min,
      max,
      // these two are necessary for the correct layouting to be applied
      extent: CONSTANTS.WIDGET_EXTENT,
      autofit: false
    }));
  }

  updateValue () {
    switch (this.propertyType) {
      case 'point':
        this.ui.x.number = this.targetMorph[this.property].x;
        this.ui.y.number = this.targetMorph[this.property].y;
        break;
      case 'color':
        this.ui.color.update(this.targetMorph[this.property]);
        break;
      case 'number':
        if (this.ui.number.unit == '%') {
          this.ui.number.number = this.targetMorph[this.property] * 100;
        } else {
          this.ui.number.number = this.targetMorph[this.property];
        }
        break;
      case 'string':
        if (this.ui.string.stringValue != this.targetMorph[this.property]) { this.ui.string.stringValue = this.targetMorph[this.property]; }
        break;
    }
  }

  updateMorph () {
    switch (this.propertyType) {
      case 'point':
        this.targetMorph[this.property] = pt(this.ui.x.number, this.ui.y.number);
        break;
      case 'color':
        this.targetMorph[this.property] = this.ui.color.colorValue;
        break;
      case 'number':
        if (this.ui.number.unit == '%') {
          this.targetMorph[this.property] = this.ui.number.number / 100;
        } else {
          this.targetMorph[this.property] = this.ui.number.number;
        }
        break;
      case 'string':
        this.targetMorph[this.property] = this.ui.string.stringValue;
        break;
    }
  }

  updateButtonStyle () {
    this.ui.keyframeButton.updateStyle();
  }

  createConnection () {
    connect(this.targetMorph, this.property, this.inspector, 'updateInInspector', { converter: '() => {return {property, propertyType}}', varMapping: { property: this.property, propertyType: this.propertyType } });
    switch (this.propertyType) {
      case 'point':
        connect(this.ui.x, 'number', this.inspector, 'updateInMorph', { converter: '() => {return {property, value} }', varMapping: { property: this.property, value: this.ui.x.number } });
        connect(this.ui.y, 'number', this.inspector, 'updateInMorph', { converter: '() => {return {property, value} }', varMapping: { property: this.property, value: this.ui.y.number } });
        break;
      case 'color':
        connect(this.ui.color, 'colorValue', this.inspector, 'updateInMorph', { converter: '() => {return {property, value} }', varMapping: { property: this.property, value: this.ui.color } });
        break;
      case 'number':
        connect(this.ui.number, 'number', this.inspector, 'updateInMorph', { converter: '() => {return {property, value} }', varMapping: { property: this.property, value: this.ui.number } });
        break;
      case 'string':
        connect(this.ui.string, 'inputAccepted', this.inspector, 'updateInMorph', { converter: '() => {return {property, value} }', varMapping: { property: this.property, value: this.ui.string } });
        break;
    }
  }

  disbandConnection () {
    this.ui.keyframeButton.remove();
    this.ui.label.remove();
    disconnect(this.targetMorph, this.property, this.inspector, 'updateInInspector');
    switch (this.propertyType) {
      case 'point':
        disconnect(this.ui.x, 'number', this.inspector, 'updateInMorph');
        disconnect(this.ui.y, 'number', this.inspector, 'updateInMorph');
        break;
      case 'color':
        disconnect(this.ui.color, 'colorValue', this.inspector, 'updateInMorph');
        break;
      case 'number':
        disconnect(this.ui.number, 'number', this.inspector, 'updateInMorph');
        break;
      case 'string':
        disconnect(this.ui.string, 'inputAccepted', this.inspector, 'updateInMorph');
        break;
    }
  }
}
