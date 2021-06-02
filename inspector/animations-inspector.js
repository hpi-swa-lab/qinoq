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
    this.propertyControls[property] = {};
    this.propertyControls[property].label = new Label({
      name: `${property} label`,
      textString: property,
      position: pt(CONSTANTS.LABEL_X, 0)
    });
    switch (propertyType) {
      case 'point':
        // extent and autofit are necessary for the correct layouting to be applied
        this.propertyControls[property].x = new NumberWidget({
          position: pt(CONSTANTS.WIDGET_X, CONSTANTS.WIDGET_ONE_Y),
          extent: CONSTANTS.WIDGET_EXTENT,
          autofit: false,
          floatingPoint: false
        });
        this.propertyControls[property].y = new NumberWidget({
          position: pt(CONSTANTS.WIDGET_X, CONSTANTS.WIDGET_TWO_Y),
          extent: CONSTANTS.WIDGET_EXTENT,
          autofit: false,
          floatingPoint: false
        });
        break;
      case 'color':
        this.propertyControls[property].color = new ColorPickerField({
          position: pt(CONSTANTS.WIDGET_X, CONSTANTS.WIDGET_ONE_Y),
          colorValue: this.targetMorph[property],
          dropShadow: new ShadowObject(true)
        });
        break;
      case 'number':
        this.buildNumberPropertyControl(property);
        break;
      case 'string':
        this.buildStringPropertyControl(property);
    }
    this.propertyControls[property].keyframe = new KeyframeButton({
      position: pt(CONSTANTS.KEYFRAME_BUTTON_X, CONSTANTS.WIDGET_ONE_Y),
      animationsInspector: this,
      property,
      propertyType,
      sequence: this.sequence,
      _editor: this.editor
    });
    this.ui[property] = new QinoqMorph();
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

    this.propertyControls[property].number = new NumberWidget({
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

  buildStringPropertyControl (property) {
    this.propertyControls[property].string = new StringWidget({
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

  disbandConnections () {
    if (this.targetMorph) {
      disconnect(this.targetMorph, 'name', this.inspector.ui.headline, 'textString');
      const sequenceOfTarget = this.sequence;
      this.displayedProperties.forEach(inspectedProperty => {
        this.propertyControls[inspectedProperty].keyframe.remove();
        const propertyType = this.propertiesToDisplay[inspectedProperty];
        disconnect(this.targetMorph, inspectedProperty, this, 'updateInInspector');
        switch (propertyType) {
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
          case 'string':
            disconnect(this.propertyControls[inspectedProperty].string, 'inputAccepted', this, 'updateInMorph');
            break;
        }
        delete this.propertyControls[inspectedProperty];
      });
    }
    disconnect(this.editor, 'onScrollChange', this, 'resetHighlightingForAllUnsavedChanges');
  }

  createConnections () {
    connect(this.targetMorph, 'name', this.inspector.ui.headline, 'textString', { converter: '() => {return `Inspecting ${targetMorph.toString()}`}', varMapping: { targetMorph: this.targetMorph } });
    this.displayedProperties.forEach(inspectedProperty => {
      const propertyType = this.propertiesToDisplay[inspectedProperty];
      connect(this.targetMorph, inspectedProperty, this, 'updateInInspector', { converter: '() => {return {property, propertyType}}', varMapping: { property: inspectedProperty, propertyType } });
      switch (propertyType) {
        case 'point':
          connect(this.propertyControls[inspectedProperty].x, 'number', this, 'updateInMorph', { converter: '() => {return {property, value} }', varMapping: { property: inspectedProperty, value: this.propertyControls[inspectedProperty].x.number } });
          connect(this.propertyControls[inspectedProperty].y, 'number', this, 'updateInMorph', { converter: '() => {return {property, value} }', varMapping: { property: inspectedProperty, value: this.propertyControls[inspectedProperty].y.number } });
          break;
        case 'color':
          connect(this.propertyControls[inspectedProperty].color, 'colorValue', this, 'updateInMorph', { converter: '() => {return {property, value} }', varMapping: { property: inspectedProperty, value: this.propertyControls[inspectedProperty].color } });
          break;
        case 'number':
          connect(this.propertyControls[inspectedProperty].number, 'number', this, 'updateInMorph', { converter: '() => {return {property, value} }', varMapping: { property: inspectedProperty, value: this.propertyControls[inspectedProperty].number } });
          break;
        case 'string':
          connect(this.propertyControls[inspectedProperty].string, 'inputAccepted', this, 'updateInMorph', { converter: '() => {return {property, value} }', varMapping: { property: inspectedProperty, value: this.propertyControls[inspectedProperty].string } });
          break;
      }
    });
    connect(this.editor, 'onScrollChange', this, 'resetHighlightingForAllUnsavedChanges');
  }

  updatePropertyInInspector (property, propertyType) {
    this._updatingInspector = true;
    switch (propertyType) {
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
      case 'string':
        if (this.propertyControls[property].string.stringValue != this.targetMorph[property]) { this.propertyControls[property].string.stringValue = this.targetMorph[property]; }
        break;
    }
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
    this.updatePropertyInInspector(property, propertyType);
  }

  refreshAllPropertiesInInspector () {
    if (this._updatingMorph) {
      return;
    }
    this._updatingInspector = true;
    this.displayedProperties.forEach(property => {
      const propertyType = this.propertiesToDisplay[property];
      this.updatePropertyInInspector(property, propertyType);
    });
    this._updatingInspector = false;
  }

  updateInMorph (updatingSpec = { property: null, value: null }) {
    const property = updatingSpec.property;
    if (this._updatingInspector) {
      return;
    }
    this._updatingMorph = true;

    const propertyType = this.propertiesToDisplay[property];
    switch (propertyType) {
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
      case 'string':
        this.targetMorph[property] = this.propertyControls[property].string.stringValue;
        break;
    }

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
    if (animationOnProperty && (!animationOnProperty.getKeyframeAt(this.sequence.progress) || animationOnProperty.getKeyframeAt(this.sequence.progress).value !== changedValue)) {
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
