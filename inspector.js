import { ShadowObject, HorizontalLayout, VerticalLayout, Icon, Label } from 'lively.morphic';
import { pt, rect } from 'lively.graphics';
import { COLOR_SCHEME } from './colors.js';
import { NumberWidget, StringWidget } from 'lively.ide/value-widgets.js';
import { Button } from 'lively.components';
import { InteractiveMorphSelector } from 'lively.halos';
import { disconnect, connect } from 'lively.bindings';
import { ColorPickerField } from 'lively.ide/styling/color-picker.js';
import { Sequence, Keyframe } from './index.js';
import { animatedPropertiesAndTypes, getColorForProperty } from './properties.js';
import { QinoqMorph } from './qinoq-morph.js';
import { resource } from 'lively.resources';
import { QinoqButton } from './components/qinoq-button.js';

const CONSTANTS = {
  LABEL_X: 10,
  WIDGET_X: 65,
  WIDGET_ONE_Y: 0,
  WIDGET_TWO_Y: 27,
  KEYFRAME_BUTTON_X: 185,
  TARGET_PICKER_DIAMETER: 25,
  TARGET_PICKER_BORDER_RADIUS: 15,
  WIDGET_WIDTH: 100,
  WIDGET_HEIGHT: 25
};
CONSTANTS.WIDGET_EXTENT = pt(CONSTANTS.WIDGET_WIDTH, CONSTANTS.WIDGET_HEIGHT);

export class InteractiveMorphInspector extends QinoqMorph {
  static get properties () {
    return {
      name: {
        defaultValue: 'interactive morph inspector'
      },
      borderColor: {
        defaultValue: COLOR_SCHEME.BACKGROUND_VARIANT
      },
      ui: {
        after: ['_editor'],
        initialize () {
          if (this._deserializing) return;
          this.ui = {};
          this.build();
          connect($world, 'showHaloFor', this, 'selectMorphThroughHalo');
        }
      },
      targetMorph: {
        after: ['propertyControls'],
        set (morph) {
          if (this._deserializing) {
            this.setProperty('targetMorph', morph);
            return;
          }

          if (morph && morph != this.targetMorph) {
            this.ui.animationsInspector.disbandConnections();
            this.setProperty('targetMorph', morph);
            this.ui.headline.textString = `Inspecting ${morph.toString()}`;

            this.ui.animationsInspector.initialize();
            this.ui.styleInspector.initialize();
          }
        }
      }
    };
  }

  get sequence () {
    return Sequence.getSequenceOfMorph(this.targetMorph);
  }

  get animationsInspector () {
    return this.ui.animationsInspector;
  }

  get styleInspector () {
    return this.ui.styleInspector;
  }

  buildTargetPicker () {
    this.ui.targetPicker = new TargetPicker({ inspector: this });
  }

  async build () {
    this.buildTargetPicker();

    this.ui.headlinePane = new QinoqMorph({ name: 'headline pane' });
    this.ui.headline = new Label({ name: 'headline', textString: 'No morph selected', fontWeight: 'bold' });
    this.ui.headlinePane.layout = new HorizontalLayout({ spacing: 5, align: 'center' });
    this.ui.headlinePane.addMorph(this.ui.targetPicker);
    this.ui.headlinePane.addMorph(this.ui.headline);

    this.addMorph(this.ui.headlinePane);

    this.ui.tabContainer = await resource('part://tabs/tabs').read();
    Object.assign(this.ui.tabContainer, {
      position: pt(0, 38),
      extent: pt(this.width, this.height - this.ui.headlinePane.height),
      showNewTabButton: false,
      tabHeight: 25
    });

    await this.buildAnimationsInspector();
    await this.buildStyleInspector();
    this.ui.animationsInspectorTab.selected = true;
    this.addMorph(this.ui.tabContainer);
  }

  async buildStyleInspector () {
    this.ui.styleInspector = new StyleInspector({
      inspector: this,
      _editor: this.editor
    });
    this.ui.styleInspectorTab = await this.ui.tabContainer.addTab('styling', this.ui.styleInspector);
    this.ui.styleInspectorTab.closeable = false;
    this.ui.styleInspectorTab.renamable = false;
  }

  async buildAnimationsInspector () {
    this.ui.animationsInspector = new AnimationsInspector({
      inspector: this,
      _editor: this.editor
    });
    this.ui.animationsInspectorTab = await this.ui.tabContainer.addTab('animations', this.ui.animationsInspector);
    this.ui.animationsInspectorTab.closeable = false;
    this.ui.animationsInspectorTab.renamable = false;
  }

  selectMorphThroughHalo (morph) {
    if (Array.isArray(morph)) morph = morph[0]; // Multi select through halo
    if (this.interactive && this.interactive.sequences.includes(Sequence.getSequenceOfMorph(morph))) {
      this.targetMorph = morph;
    }
  }

  updateInMorph () {
    this.ui.animationsInspector.updateInMorph();
  }

  deselect () {
    this.ui.animationsInspector.disbandConnections();
    Object.values(this.ui).forEach(uiElement => {
      if (uiElement.isMorph) {
        uiElement.remove();
      }
    });
    this.targetMorph = null;
    this.build();
  }

  abandon () {
    disconnect($world, 'showHaloFor', this, 'selectMorphThroughHalo');
    super.abandon();
  }
}

class AnimationsInspector extends QinoqMorph {
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
      }
    };
  }

  get displayedProperties () {
    // serialized objects might contain a _rev key that is not removed after deserialization
    return Object.keys(this.propertyControls).filter(property => property !== '_rev');
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
        this.propertyControls[property].color = new ColorPickerField({ position: pt(CONSTANTS.WIDGET_X, CONSTANTS.WIDGET_ONE_Y), colorValue: this.targetMorph[property] });
        break;
      case 'number':
        this.buildNumberPropertyControl(property);
        break;
      case 'string':
        this.buildStringPropertyControl(property);
    }
    this.propertyControls[property].keyframe = new KeyframeButton({
      position: pt(CONSTANTS.KEYFRAME_BUTTON_X, CONSTANTS.WIDGET_ONE_Y),
      inspector: this.inspector,
      property,
      propType,
      sequence: this.inspector.sequence,
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
      const sequenceOfTarget = this.inspector.sequence;
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
          case 'string':
            disconnect(this.propertyControls[inspectedProperty].string, 'inputAccepted', this, 'updateInMorph');
            break;
        }
        delete this.propertyControls[inspectedProperty];
      });
    }
  }

  createConnections () {
    connect(this.targetMorph, 'name', this.inspector.ui.headline, 'textString', { converter: '() => {return `Inspecting ${targetMorph.toString()}`}', varMapping: { targetMorph: this.targetMorph } });
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
        case 'string':
          connect(this.propertyControls[inspectedProperty].string, 'inputAccepted', this, 'updateInMorph');
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
      case 'string':
        if (this.propertyControls[property].string.stringValue != this.targetMorph[property]) { this.propertyControls[property].string.stringValue = this.targetMorph[property]; }
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
        case 'string':
          this.targetMorph[property] = this.propertyControls[property].string.stringValue;
          break;
      }
    });
    this._updatingMorph = false;
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

class StyleInspector extends QinoqMorph {
  static get properties () {
    return {
      name: {
        defaultValue: 'style inspector'
      },
      inspector: {},
      ui: {
        initialize () {
          if (this._deserializing) return;
          this.ui = {};
          this.build();
        }
      },
      clipMode: {
        defaultValue: 'auto'
      },
      enable: {
        defaultValue: false,
        set (bool) {
          this.setProperty('enable', bool);
          this.initialize();
        }
      }
    };
  }

  get targetMorph () {
    return this.inspector.targetMorph;
  }

  build () {
    this.ui.buttons = [];
    this.layout = new HorizontalLayout({
      spacing: 2,
      align: 'center'
    });

    const centerButton = new QinoqButton({
      icon: 'arrows-alt',
      tooltip: 'Center the selected morph',
      name: 'centerButton',
      action: 'centerMorph',
      target: this,
      fontSize: 20
    });
    centerButton.disable();
    this.ui.buttons.push(this.addMorph(centerButton));

    const horizontalCenterButton = new QinoqButton({
      icon: 'arrows-alt-h',
      tooltip: 'Center the selected morph horizontally',
      name: 'horizontalCenterButton',
      action: 'centerMorphHorizontally',
      target: this,
      fontSize: 20
    });
    horizontalCenterButton.disable();
    this.ui.buttons.push(this.addMorph(horizontalCenterButton));

    const verticalCenterButton = new QinoqButton({
      icon: 'arrows-alt-v',
      tooltip: 'Center the selected morph vertically',
      name: 'verticalCenterButton',
      action: 'centerMorphVertically',
      target: this,
      fontSize: 20
    });
    verticalCenterButton.disable();
    this.ui.buttons.push(this.addMorph(verticalCenterButton));
  }

  initialize () {
    this.ui.buttons.forEach(button => {
      button.enable();
    });
  }

  centerMorph () {
    this.targetMorph.center = this.interactive.center;
  }

  centerMorphVertically () {
    this.targetMorph.center = pt(this.targetMorph.center.x, this.interactive.center.y);
  }

  centerMorphHorizontally () {
    this.targetMorph.center = pt(this.interactive.center.x, this.targetMorph.center.y);
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
      fill: {
        defaultValue: COLOR_SCHEME.KEYFRAME_FILL
      },
      mode: {
        defaultValue: 'default',
        type: 'Enum',
        values: ['default', 'activated'],
        set (mode) {
          this.setProperty('mode', mode);
          this.styleSet = mode;
        }
      },
      inspector: { },
      animation: {
        after: ['sequence', 'property', 'inspector'],
        initialize () {
          if (!this._deserializing) {
            this.animation = this.sequence.getAnimationForMorphProperty(this.target, this.property);
          }
        }
      },
      _editor: {
        set (_editor) {
          if (!this._deserializing) {
            connect(_editor, 'onScrollChange', this, 'setMode');
          }
          this.setProperty('_editor', _editor);
        }
      },
      sequence: {},
      property: {
        after: ['tooltip'],
        set (property) {
          this.setProperty('property', property);
          this.tooltip = `Create a keyframe for the ${property} property`;
        }
      },
      propType: {},
      styleSet: {
        defaultValue: 'default',
        set (styleSet) {
          this.setProperty('styleSet', styleSet);
          this.updateStyle();
        }
      }
    };
  }

  get target () {
    return this.inspector.targetMorph;
  }

  get isKeyframeButton () {
    return true;
  }

  get currentValue () {
    return this.target[this.property];
  }

  async onMouseUp () {
    this.mode = 'activated';
    const newKeyframe = new Keyframe(this.sequence.progress, this.currentValue);
    this.animation = await this.sequence.addKeyframeForMorph(newKeyframe, this.target, this.property, this.propType);
    if (this.animation.useRelativeValues && this.propType == 'point') {
      newKeyframe.value = pt(this.currentValue.x / this.sequence.width, this.currentValue.y / this.sequence.height);
    }
    this.editor.getTimelineForSequence(this.sequence).updateAnimationLayer(this.animation);
  }

  updateAnimation () {
    this.animation = this.sequence.getAnimationForMorphProperty(this.target, this.property);
    this.setMode();
  }

  onMouseDown (event) {
    super.onMouseDown(event);
    this.styleSet = 'click';
  }

  onHoverIn () {
    this.styleSet = 'hover';
  }

  onHoverOut () {
    if (this.mode === 'activated') {
      this.styleSet = 'activated';
    } else {
      this.styleSet = 'default';
    }
  }

  updateStyle () {
    switch (this.styleSet) {
      case 'default':
        this.fill = COLOR_SCHEME.KEYFRAME_FILL;
        this.borderColor = COLOR_SCHEME.KEYFRAME_BORDER;
        break;
      case 'activated':
      case 'hover':
        this.fill = getColorForProperty(this.property);
        break;
      case 'click':
        this.fill = COLOR_SCHEME.TRANSPARENT;
    }
  }

  setMode () {
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
    } else {
      this.mode = 'default';
    }
    this._updatingStyle = false;
  }

  remove () {
    if (this.editor) disconnect(this.editor, 'onScrollChange', this, 'setMode');
    super.remove();
  }
}

class TargetPicker extends Button {
  static get properties () {
    return {
      name: {
        defaultValue: 'target picker'
      },
      padding: {
        defaultValue: rect(2, 2, 0, 0)
      },
      tooltip: {
        defaultValue: 'Choose Inspection Target'
      },
      inspector: {
        async initialize () {
          this.initializeUI();
        }
      }
    };
  }

  async initializeUI () {
    // opacity is only relevant for optical reasons so one does not see the awaited changes
    this.opacity = 0;
    this.master = { auto: 'styleguide://System/buttons/light' };
    await this.whenRendered();
    this.label = Icon.textAttribute('crosshairs');
    await this.whenRendered();
    this.extent = pt(CONSTANTS.TARGET_PICKER_DIAMETER, CONSTANTS.TARGET_PICKER_DIAMETER);
    this.borderRadius = CONSTANTS.TARGET_PICKER_BORDER_RADIUS;
    this.opacity = 1;
  }

  async onMouseDown (event) {
    super.onMouseDown(event);
    this.inspector.targetMorph = await InteractiveMorphSelector.selectMorph($world, null, morph => Sequence.getSequenceOfMorph(morph) && Sequence.getSequenceOfMorph(morph).focused);
  }
}
