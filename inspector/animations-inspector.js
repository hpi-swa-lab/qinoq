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
      fontColor: {
        defaultValue: COLOR_SCHEME.ON_SURFACE
      },
      name: {
        defaultValue: 'animations inspector'
      },
      inspector: {},
      ui: {
        after: ['fontColor'],
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
      animationsInspector: this,
      fontColor: this.fontColor
    });

    this.ui.propertyPane.addMorph(this.propertyControls[property]);
  }

  updatePropertyInInspector (property) {
    this._updatingInspector = true;
    this.propertyControls[property].updateValue();
    this._updatingInspector = false;

    const updatingSpec = { property: property, value: this.targetMorph[property] };
    this.highlightUnsavedChanges(updatingSpec);
  }

  updateInInspector (spec) {
    if (!spec) {
      return;
    }
    const { property, propertyType } = spec;
    this.updatePropertyInInspector(property);
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
      this.propertyControls[inspectedProperty].createConnection();
    });
    connect(this.editor, 'onScrollChange', this, 'resetHighlightingForAllUnsavedChanges');
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
      fontColor: {
        after: ['ui'],
        set (color) {
          this.setProperty('fontColor', color);
          if (!this._deserializing) this.ui.label.fontColor = color;
        }
      },
      targetMorph: {},
      property: {},
      propertyType: {},
      animationsInspector: {
        set (inspector) {
          this.setProperty('animationsInspector', inspector);
          if (this._deserializing) return;
          this.targetMorph = this.animationsInspector.targetMorph;
        }
      },
      ui: {
        after: ['property', 'propertyType', 'animationsInspector'],
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
      position: pt(CONSTANTS.LABEL_X, 0),
      fontColor: this.fontColor
    }));
  }

  buildWidget () {
    this.ui.keyframeButton = this.addMorph(new KeyframeButton({
      position: pt(CONSTANTS.KEYFRAME_BUTTON_X, CONSTANTS.WIDGET_Y),
      animationsInspector: this.animationsInspector,
      property: this.property,
      propertyType: this.propertyType,
      sequence: this.animationsInspector.sequence,
      _editor: this.animationsInspector.editor
    }));
  }

  updateButtonStyle () {
    this.ui.keyframeButton.updateStyle();
  }

  createConnection () {
    connect(this.targetMorph, this.property, this.animationsInspector, 'highlightUnsavedChanges', { converter: '(x) => {return {property, value: x}}', varMapping: { property: this.property } });
  }

  disbandConnection () {
    disconnect(this.targetMorph, this.property, this.animationsInspector, 'highlightUnsavedChanges');
    this.ui.keyframeButton.remove();
    this.ui.label.remove();
  }
}
