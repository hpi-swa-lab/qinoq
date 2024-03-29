import { QinoqMorph } from '../qinoq-morph.js';
import { VerticalLayout, HorizontalLayout, Label } from 'lively.morphic';
import { QinoqButton } from '../components/qinoq-button.js';
import { pt, rect } from 'lively.graphics';
import { string } from 'lively.lang';

import { CONSTANTS } from './constants.js';
import { COLOR_SCHEME } from '../colors.js';
import { connect, disconnect, disconnectAll } from 'lively.bindings';
import { DropDownSelector } from 'lively.components/widgets.js';
import InputLine from 'lively.morphic/text/input-line.js';

class InspectorPanel extends QinoqMorph {
  static get properties () {
    return {
      fontColor: {
        defaultValue: COLOR_SCHEME.ON_SURFACE
      },
      ui: {
        after: ['submorphs', 'fontColor'],
        initialize () {
          if (!this._deserializing) {
            this.ui = {};
            this.build();
          }
        }
      },
      title: {
        after: ['ui'],
        set (title) {
          if (this._deserializing) return;

          this.setProperty('title', title);
          if (!this.getSubmorphNamed('title')) this.buildTitleMorph();
          if (!title) {
            this.ui.title.abandon();
            delete this.ui.title;
            return;
          }
          this.ui.title.textString = title;
          this.ui.title.tooltip = title;
        }
      },
      layout: {
        initialize () {
          if (!this._deserializing) {
            this.layout = new VerticalLayout({
              autoResize: true,
              resizeSubmorphs: true,
              spacing: 5
            });
          }
        }
      },
      inspector: {},
      enabled: {
        defaultValue: true,
        set (enabled) {
          if (!this._deserializing) this.onEnabledChange(enabled);
          this.setProperty('enabled', enabled);
        }
      },
      displayed: {
        after: ['_latestOwner'],
        defaultValue: true,
        set (displayed) {
          if (displayed && this._latestOwner) this._latestOwner.addMorph(this);
          if (!displayed) this.remove();
        }
      },
      _latestOwner: {}
    };
  }

  get targetMorph () {
    return this.inspector.targetMorph;
  }

  onOwnerChanged () {
    // when the panel is removed, the world becomes owner
    // we still want to keep the actual owner
    if (this.owner && (!this.owner.isWorld || !this._latestOwner)) {
      this._latestOwner = this.owner;
    }
  }

  build () {
    /* hook to build the panel's UI components once at the creation of the panel */
  }

  buildTitleMorph () {
    if (this.getSubmorphNamed('title')) return;
    this.ui.title = new Label({
      fontWeight: 'bolder',
      fontColor: this.fontColor
    });
    this.addMorphAt(this.ui.title, 0);
  }

  initialize () {
    /* hook to initialize state of the panel and its components once after creation */
  }

  onTargetMorphChange (targetMorph) {
    /* hook called before the inspector's targetMorph changes */
  }

  onEnabledChange (enabled) {
    /* hook called before the panel is disabled or enabled */
  }
}

export class AlignmentPanel extends InspectorPanel {
  build () {
    const buttons = this.ui.buttons = [];
    const buttonContainer = this.ui.container = this.addMorph(
      new QinoqMorph({
        _editor: this.editor,
        layout: new HorizontalLayout({
          autoResize: true
        })
      })
    );

    const centerButton = new QinoqButton({
      icon: 'arrows-alt',
      tooltip: 'Center the selected morph',
      name: 'centerButton',
      action: 'centerMorph',
      target: this,
      fontSize: 20
    });
    centerButton.disable();
    buttons.push(buttonContainer.addMorph(centerButton));

    const horizontalCenterButton = new QinoqButton({
      icon: 'arrows-alt-h',
      tooltip: 'Center the selected morph horizontally',
      name: 'horizontalCenterButton',
      action: 'centerMorphHorizontally',
      target: this,
      fontSize: 20
    });
    horizontalCenterButton.disable();
    buttons.push(buttonContainer.addMorph(horizontalCenterButton));

    const verticalCenterButton = new QinoqButton({
      icon: 'arrows-alt-v',
      tooltip: 'Center the selected morph vertically',
      name: 'verticalCenterButton',
      action: 'centerMorphVertically',
      target: this,
      fontSize: 20
    });
    verticalCenterButton.disable();
    buttons.push(buttonContainer.addMorph(verticalCenterButton));

    super.build();
  }

  initialize () {
    this.enabled = false;
  }

  onTargetMorphChange (targetMorph) {
    this.enabled = !!targetMorph.position;
  }

  onEnabledChange (enabled) {
    this.ui.buttons.forEach(button => button.enabled = enabled);
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

class KeyValuePanel extends InspectorPanel {
  /*
    Allows to edit a collection of key-value-pairs, where the value is a string
  */

  build () {
    this.ui.container = this.addMorph(
      new QinoqMorph({
        name: 'widgetContainer',
        _editor: this.editor,
        layout: new VerticalLayout({
          autoResize: true,
          resizeSubmorphs: true
        })
      })
    );

    super.build();
  }

  buildLabel (text, container = undefined) {
    const owner = container || this.ui.container;
    return owner.addMorph(new Label({
      textString: string.camelize(text[0].toUpperCase() + text.substring(1)),
      fontColor: this.fontColor
    }));
  }

  buildTextField (title, value) {
    this.buildLabel(title);
    const field = this.ui.container.addMorph(new InputLine({
      position: pt(CONSTANTS.WIDGET_X, CONSTANTS.WIDGET_Y),
      fixedWidth: true,
      fixedHeight: true,
      extent: CONSTANTS.WIDGET_EXTENT,
      fontFamily: 'Sans-Serif',
      fontSize: 14,
      padding: rect(1, 1, 0, 0),
      fill: COLOR_SCHEME.SURFACE,
      textString: value,
      borderColor: COLOR_SCHEME.PRIMARY,
      fontColor: this.fontColor,
      borderStyle: 'solid',
      borderWidth: 1
    }));
    connect(field, 'inputChanged', this, 'changeTokenValue', {
      converter: `(change) => {
          return { symbol: '${title}', value: source.textString }
        }`
    });
    return field;
  }

  initialize () {
    this.displayed = false;
  }

  clear () {
    this.ui.container.withAllSubmorphsDo(submorph => {
      if (submorph === this.ui.container) return;
      disconnectAll(submorph);
      submorph.abandon();
    });
  }

  onTargetMorphChange (targetMorph) {
    if (!targetMorph.tokens) {
      this.displayed = false;
      return;
    }

    this.clear();

    const tokens = Array.isArray(targetMorph.tokens)
      ? targetMorph.tokens
      : Object.values(targetMorph.tokens);

    tokens.forEach(token => {
      if (!token.symbol || !token.active) return;
      this.buildTextField(token.symbol, token.value || '');
    });

    this.displayed = true;
  }

  onEnabledChange (enabled) {
    this.displayed = enabled;
  }

  changeTokenValue (change) {
    const { symbol, value } = change;
    const token = Object.values(this.targetMorph.tokens)
      .find(token => token.symbol === symbol);
    token.value = value;
  }
}

export class ShareSettingsPanel extends KeyValuePanel {
  build () {
    this.ui.presetDropDown = this.addMorph(new DropDownSelector({
      fontColor: this.fontColor,
      borderColor: COLOR_SCHEME.PRIMARY,
      borderStyle: 'solid',
      borderWidth: 1
    }));
    this.ui.presetDropDown.getSubmorphNamed('currentValue').fontSize = 14;
    this.ui.presetDropDown.dropDownLabel.fontSize = 14;
    connect(this.ui.presetDropDown, 'selectedValue', this, 'onPresetChange');

    super.build();
  }

  onTargetMorphChange (newTargetMorph) {
    super.onTargetMorphChange(newTargetMorph);
    if (!newTargetMorph.preset || !newTargetMorph.tokens) return;

    this._prohibitTargetMorphChange = true;
    this.ui.presetDropDown.selectedValue = newTargetMorph.preset.name;
    this.ui.presetDropDown.values = newTargetMorph.presetValues;

    delete this._prohibitTargetMorphChange;
  }

  onPresetChange (presetName) {
    if (!this.targetMorph || this._prohibitTargetMorphChange) return;
    this.targetMorph.preset = presetName;
    if (!this._prohibitTargetMorphChange) this.onTargetMorphChange(this.targetMorph);
  }

  abandon () {
    disconnect(this.ui.presetDropDown, 'selectedValue', this, 'onPresetChange');
  }
}

export class LinkPanel extends KeyValuePanel {
  initialize (target) {
    const value = this.interactive && this.interactive.linkMap.get(target);
    this.buildTextField('URL', value);
  }

  changeTokenValue (change) {
    let newLink = change.value;
    if (!this.interactive) return;
    if (newLink) {
      this.interactive.linkMap.set(this.targetMorph, newLink);
      this.targetMorph.nativeCursor = 'pointer';
    } else {
      this.interactive.linkMap.delete(this.targetMorph);
      this.targetMorph.nativeCursor = 'default';
    }
  }

  onTargetMorphChange (newTargetMorph) {
    this.clear();
    this.initialize(newTargetMorph);
  }
}
