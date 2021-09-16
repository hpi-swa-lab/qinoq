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
import { DropDownSelector } from 'lively.components/widgets.js';

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
      propertyAnimators: {
        initialize () {
          if (!this._deserializing) this.propertyAnimators = {};
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
    return Object.keys(this.propertyAnimators).filter(property => property !== '_rev');
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
    this.clearView();
    this.buildAnimationsDropDown();
    this.buildAnimatedPropertyAnimators();
    this.displayedProperties.forEach(property => {
      this.propertyAnimators[property].updateButtonStyle();
    });
    this.createConnections();
  }

  clearView () {
    if (!this.inspector.targetMorph) {
      return;
    }
    this.ui.propertyPane.submorphs.forEach(morph => morph.withAllSubmorphsDo(submorph => submorph.remove()));
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

  buildAnimationsDropDown () {
    const dropdown = new DropDownSelector({
      fontColor: this.fontColor,
      borderColor: COLOR_SCHEME.PRIMARY,
      borderStyle: 'solid',
      borderWidth: 1,
      tooltip: 'Select a property to animate'
    });
    dropdown.dropDownLabel.fontSize = 14;
    dropdown.getSubmorphNamed('currentValue').fontSize = 14;
    dropdown.values = Object.keys(this.propertiesToDisplay);
    dropdown.selectedValue = 'position';
    this.ui.propertyPane.addMorph(dropdown);
    connect(dropdown, 'selectedValue', this, 'updateShownAnimators');
  }

  updateShownAnimators (chosenProperty) {
    $world.setStatusMessage(chosenProperty);
  }

  buildAnimatedPropertyAnimators () {
    const props = this.sequence.getAnimationsForMorph(this.targetMorph).map(animation => animation.property);
    props.forEach(propToAnimate => {
      const propertyType = this.propertiesToDisplay[propToAnimate];
      this.buildPropertyAnimator(propToAnimate, propertyType);
    });
  }

  buildPropertyAnimator (property, propertyType) {
    this.propertyAnimators[property] = new PropertyControl({
      property: property,
      propertyType: propertyType,
      animationsInspector: this,
      fontColor: this.fontColor
    });

    this.ui.propertyPane.addMorph(this.propertyAnimators[property]);
  }

  disbandConnections () {
    if (this.targetMorph) {
      disconnect(this.targetMorph, 'name', this.inspector.ui.headline, 'textString');
      this.displayedProperties.forEach(inspectedProperty => {
        this.propertyAnimators[inspectedProperty].disbandConnection(this);
        this.propertyAnimators[inspectedProperty].remove();
      });
    }
    disconnect(this.editor, 'onScrollChange', this, 'resetHighlightingForAllUnsavedChanges');
  }

  createConnections () {
    connect(this.targetMorph, 'name', this.inspector.ui.headline, 'textString', { converter: '() => {return `Inspecting ${targetMorph.toString()}`}', varMapping: { targetMorph: this.targetMorph } });
    this.displayedProperties.forEach(inspectedProperty => {
      this.propertyAnimators[inspectedProperty].createConnection();
    });
    connect(this.editor, 'onScrollChange', this, 'resetHighlightingForAllUnsavedChanges');
  }

  resetHighlightingForProperty (changedProperty) {
    this._unsavedChanges = this._unsavedChanges.filter(property => { return property != changedProperty; });
    if (this.propertyAnimators[changedProperty].highlight) {
      this.propertyAnimators[changedProperty].highlight.abandon();
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
      this.propertyAnimators[changedProperty].highlight = new Label({
        name: 'warning label',
        position: pt(this.propertyAnimators[changedProperty].ui.keyframeButton.topRight.x + 5, 5),
        fontColor: COLOR_SCHEME.ERROR,
        halosEnabled: false,
        tooltip: 'Unsaved changes will be removed when scrolling \ninstead add a keyframe to persist them'
      });
      Icon.setIcon(this.propertyAnimators[changedProperty].highlight, 'exclamation-triangle'),
      this.propertyAnimators[changedProperty].addMorph(this.propertyAnimators[changedProperty].highlight);
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

  // used for copied morphs
  updateRespectiveAnimations () {
    this.displayedProperties.forEach(property => this.propertyAnimators[property].ui.keyframeButton.updateAnimation());
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
