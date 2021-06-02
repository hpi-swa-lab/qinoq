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
      this.propertyControls[property].keyframe.updateStyle();
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
    this.propertyControls[property] = new PropertyControl(property, propertyType, this);

    this.ui[property] = new QinoqMorph();
    this.propertyControls[property].morphsToAdd().forEach(morph => this.ui[property].addMorph(morph));
    this.ui.propertyPane.addMorph(this.ui[property]);
  }

  disbandConnections () {
    if (this.targetMorph) {
      disconnect(this.targetMorph, 'name', this.inspector.ui.headline, 'textString');
      this.displayedProperties.forEach(inspectedProperty => {
        this.propertyControls[inspectedProperty].disbandConnection(this);
        delete this.propertyControls[inspectedProperty];
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
        position: pt(this.propertyControls[changedProperty].keyframe.topRight.x + 5, 5),
        fontColor: COLOR_SCHEME.ERROR,
        halosEnabled: false,
        tooltip: 'Unsaved changes will be removed when scrolling \ninstead add a keyframe to persist them'
      });
      Icon.setIcon(this.propertyControls[changedProperty].highlight, 'exclamation-triangle'),
      this.propertyControls[changedProperty].keyframe.owner.addMorph(this.propertyControls[changedProperty].highlight);
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
    this.displayedProperties.forEach(property => this.propertyControls[property].keyframe.updateAnimation());
  }

  updateKeyframeButtonStyle (animation) {
    if (animation.target !== this.targetMorph) return;
    this.withAllSubmorphsDo(submorph => {
      if (submorph.isKeyframeButton && submorph.animation == animation) submorph.setMode();
    });
  }
}

class PropertyControl {
  constructor (property, propertyType, inspector) {
    this.targetMorph = inspector.targetMorph;
    this.property = property;
    this.propertyType = propertyType;
    this.inspector = inspector;
    this.initializeLabel();
    this.buildWidget();
  }

  initializeLabel () {
    this.label = new Label({
      name: `${this.property} label`,
      textString: this.property,
      position: pt(CONSTANTS.LABEL_X, 0)
    });
  }

  buildWidget () {
    switch (this.propertyType) {
      case 'point':
        // extent and autofit are necessary for the correct layouting to be applied
        this.x = new NumberWidget({
          position: pt(CONSTANTS.WIDGET_X, CONSTANTS.WIDGET_ONE_Y),
          extent: CONSTANTS.WIDGET_EXTENT,
          autofit: false,
          floatingPoint: false
        });
        this.y = new NumberWidget({
          position: pt(CONSTANTS.WIDGET_X, CONSTANTS.WIDGET_TWO_Y),
          extent: CONSTANTS.WIDGET_EXTENT,
          autofit: false,
          floatingPoint: false
        });
        break;
      case 'color':
        this.color = new ColorPickerField({
          position: pt(CONSTANTS.WIDGET_X, CONSTANTS.WIDGET_ONE_Y),
          colorValue: this.targetMorph[this.property],
          dropShadow: new ShadowObject(true)
        });
        break;
      case 'number':
        this.buildNumberPropertyControl();
        break;
      case 'string':
        this.buildStringPropertyControl();
    }
    this.keyframe = new KeyframeButton({
      position: pt(CONSTANTS.KEYFRAME_BUTTON_X, CONSTANTS.WIDGET_ONE_Y),
      animationsInspector: this.inspector,
      property: this.property,
      propertyType: this.propertyType,
      sequence: this.inspector.sequence,
      _editor: this.inspector.editor
    });
  }

  buildStringPropertyControl () {
    this.string = new StringWidget({
      position: pt(CONSTANTS.WIDGET_X, CONSTANTS.WIDGET_ONE_Y),
      fixedWidth: true,
      fixedHeight: true,
      extent: CONSTANTS.WIDGET_EXTENT,
      fontFamilty: 'Sans-Serif',
      fontSize: 16,
      fill: COLOR_SCHEME.SURFACE,
      dropShadow: new ShadowObject(true)
    })
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

    this.number = new NumberWidget({
      position: pt(CONSTANTS.WIDGET_X, CONSTANTS.WIDGET_ONE_Y),
      floatingPoint,
      unit,
      min,
      max,
      // these two are necessary for the correct layouting to be applied
      extent: CONSTANTS.WIDGET_EXTENT,
      autofit: false
    });
  }

  morphsToAdd () {
    return Object.values(this).filter(object => object.isMorph && object !== this.targetMorph && object !== this.inspector);
  }

  updateValue () {
    switch (this.propertyType) {
      case 'point':
        this.x.number = this.targetMorph[this.property].x;
        this.y.number = this.targetMorph[this.property].y;
        break;
      case 'color':
        this.color.update(this.targetMorph[this.property]);
        break;
      case 'number':
        if (this.number.unit == '%') {
          this.number.number = this.targetMorph[this.property] * 100;
        } else {
          this.number.number = this.targetMorph[this.property];
        }
        break;
      case 'string':
        if (this.string.stringValue != this.targetMorph[this.property]) { this.propertyControls[this.property].string.stringValue = this.targetMorph[this.property]; }
        break;
    }
  }

  updateMorph () {
    switch (this.propertyType) {
      case 'point':
        this.targetMorph[this.property] = pt(this.x.number, this.y.number);
        break;
      case 'color':
        this.targetMorph[this.property] = this.color.colorValue;
        break;
      case 'number':
        if (this.number.unit == '%') {
          this.targetMorph[this.property] = this.number.number / 100;
        } else {
          this.targetMorph[this.property] = this.number.number;
        }
        break;
      case 'string':
        this.targetMorph[this.property] = this.string.stringValue;
        break;
    }
  }

  createConnection () {
    connect(this.targetMorph, this.property, this.inspector, 'updateInInspector', { converter: '() => {return {property, propertyType}}', varMapping: { property: this.property, propertyType: this.propertyType } });
    switch (this.propertyType) {
      case 'point':
        connect(this.x, 'number', this.inspector, 'updateInMorph', { converter: '() => {return {property, value} }', varMapping: { property: this.property, value: this.x.number } });
        connect(this.y, 'number', this.inspector, 'updateInMorph', { converter: '() => {return {property, value} }', varMapping: { property: this.property, value: this.y.number } });
        break;
      case 'color':
        connect(this.color, 'colorValue', this.inspector, 'updateInMorph', { converter: '() => {return {property, value} }', varMapping: { property: this.property, value: this.color } });
        break;
      case 'number':
        connect(this.number, 'number', this.inspector, 'updateInMorph', { converter: '() => {return {property, value} }', varMapping: { property: this.property, value: this.number } });
        break;
      case 'string':
        connect(this.string, 'inputAccepted', this.inspector, 'updateInMorph', { converter: '() => {return {property, value} }', varMapping: { property: this.property, value: this.string } });
        break;
    }
  }

  disbandConnection () {
    this.keyframe.remove();
    this.label.remove();
    disconnect(this.targetMorph, this.property, this.inspector, 'updateInInspector');
    switch (this.propertyType) {
      case 'point':
        disconnect(this.x, 'number', this.inspector, 'updateInMorph');
        disconnect(this.y, 'number', this.inspector, 'updateInMorph');
        break;
      case 'color':
        disconnect(this.color, 'colorValue', this.inspector, 'updateInMorph');
        break;
      case 'number':
        disconnect(this.number, 'number', this.inspector, 'updateInMorph');
        break;
      case 'string':
        disconnect(this.string, 'inputAccepted', this.inspector, 'updateInMorph');
        break;
    }
  }
}
