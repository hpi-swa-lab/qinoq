import { Morph, ShadowObject, HorizontalLayout, Label, VerticalLayout, easings, stringToEasing } from 'lively.morphic';
import { pt, Color } from 'lively.graphics';

import { Canvas } from 'lively.components/canvas.js';
import { Keyframe } from 'qinoq';
import { Button } from 'lively.components';
import { promise } from 'lively.lang';
import { SearchField } from 'lively.components/widgets.js';
import { connect } from 'lively.bindings';

export class EasingSelection extends Morph {
  static get properties () {
    return {
      fill: {
        defaultValue: Color.rgb(236, 240, 241)
      },
      borderRadius: {
        defaultValue: 4
      },
      draggable: {
        defaultValue: true
      },
      dropShadow: {
        defaultValue: new ShadowObject(true)
      },
      extent: {
        defaultValue: pt(480, 630)
      },
      selection: {},
      listItems: {

      },
      label: {
        defaultValue: 'Select easing'
      },
      ui: {
        after: ['label'],
        initialize () {
          this.initialize();
        }
      }
    };
  }

  initialize () {
    this.layout = new VerticalLayout({
      spacing: 10,
      align: 'center',
      autoResize: false,
      resizeSubmorphs: true
    });
    this.ui = {};
    this.ui.headline = new Label({ textString: this.label, fontSize: 19 });
    this.addMorph(this.ui.headline);
    this.ui.searchField = new SearchField({ fontColor: Color.black });

    connect(this.ui.searchField, 'onChange', this, 'onFilterChange');

    this.addMorph(this.ui.searchField);
    this.ui.selectionPane = new Morph({
      borderRadius: 4,
      fill: Color.white,
      borderColor: Color.rgb(131, 145, 146),
      borderStyle: 'solid',
      borderWidth: 1,
      name: 'selection pane',
      extent: pt(430, 464),
      clipMode: 'auto'
    });
    this.ui.selectionPane.layout = new VerticalLayout(
      {
        autoResize: false
      });
    this.addMorph(this.ui.selectionPane);
    this.initListItems();
    this.ui.confirmPane = new Morph({ extent: pt(400, 100), fill: Color.transparent });
    this.addMorph(this.ui.confirmPane);
    this.ui.confirmPane.layout = new HorizontalLayout({ spacing: 20 });
    this.ui.okButton = new Button({ label: 'Ok', master: 'styleguide://SystemPrompts/green button' });
    this.ui.okButton.action = () => this.execCommand('confirm');
    this.ui.confirmPane.addMorph(this.ui.okButton);
    this.ui.cancelButton = new Button({ label: 'Cancel', master: 'styleguide://SystemPrompts/red button' });
    this.ui.cancelButton.action = () => this.execCommand('cancel');
    this.ui.confirmPane.addMorph(this.ui.cancelButton);
  }

  initListItems () {
    const possibleEasings = this.selectionKeys;
    possibleEasings.forEach(easing => {
      const listItem = new EasingListItem({ easing, browser: this });
      this.ui.selectionPane.addMorph(listItem);
    });
    this.listItems = this.ui.selectionPane.submorphs;
  }

  get visibleListItems () {
    return this.ui.selectionPane.submorphs;
  }

  get selectionKeys () {
    return Keyframe.possibleEasings;
  }

  onFilterChange () {
    this.listItems.forEach(listItem => {
      if (this.ui.searchField.matches(listItem.easing)) {
        this.ui.selectionPane.addMorph(listItem);
      } else {
        listItem.remove();
      }
    });
  }

  onSelectionChange (changedItem) {
    if (this._inOnSelectionChange) return;
    this._inOnSelectionChange = true;
    if (changedItem.isSelected) {
      this.selection = changedItem.easing;
      if (!this.itemIsVisible(changedItem)) {
        this.ui.selectionPane.scroll = pt(0, changedItem.top);
      }
    } else {
      this.selection = null;
    }
    this.listItems.forEach(listItem => {
      if (listItem.easing != this.selection) {
        listItem.isSelected = false;
        listItem.styleSet = 'default';
      }
    });
    this._inOnSelectionChange = false;
  }

  get commands () {
    return [
      {
        name: 'confirm',
        exec: () => {
          if (this.selection) {
            this.resolve(this.selection);
            this.abandon(true);
          }
        }
      },
      {
        name: 'cancel',
        exec: () => {
          this.resolve(null);
          this.abandon(true);
        }
      },
      {
        name: 'up',
        exec: () => {
          if (!this.selection) {
            this.execCommand('go to bottom');
          } else {
            this.select(this.visibleListItems[Math.max(0, this.selectionIndexInVisibleListItems - 1)]);
          }
        }
      },
      {
        name: 'down',
        exec: () => {
          if (!this.selection) {
            this.execCommand('go to top');
          } else {
            this.select(this.visibleListItems[Math.min(this.visibleListItems.length - 1, this.selectionIndexInVisibleListItems + 1)]);
          }
        }
      },
      {
        name: 'go to top',
        exec: () => {
          this.select(this.visibleListItems[0]);
        }
      },
      {
        name: 'go to bottom',
        exec: () => {
          this.select(this.visibleListItems[this.visibleListItems.length - 1]);
        }
      }
    ];
  }

  get selectionIndex () {
    return this.listItems.findIndex(item => item.isSelected);
  }

  get selectionIndexInVisibleListItems () {
    return this.visibleListItems.findIndex(item => item.isSelected);
  }

  select (item) {
    item.isSelected = true;
    item.styleSet = 'selected';
  }

  selectByIndex (index) {
    this.select(this.listItems[index]);
  }

  itemIsVisible (item) {
    const visibleTop = this.ui.selectionPane.scroll.y;
    const visibleBottom = visibleTop + this.ui.selectionPane.height;
    return item.top >= visibleTop && item.bottom <= visibleBottom;
  }

  get keybindings () {
    return [
      { keys: 'Enter', command: 'confirm' },
      { keys: 'Escape', command: 'cancel' },
      { keys: 'Up', command: 'up' },
      { keys: 'Down', command: 'down' },
      { keys: 'Ctrl-Up', command: 'go to top' },
      { keys: 'Ctrl-Down', command: 'go to bottom' }
    ].concat(super.keybindings);
  }

  resolve (arg) {
    return this.answer.resolve(arg);
  }

  static init () {
    const e = new EasingSelection();
    e.openInWorld();
    e.answer = {};
    const promise = new Promise((resolve, reject) => {
      e.answer.resolve = resolve;
      e.answer.reject = reject;
    });
    e.focus();
    return { morph: e, promise };
  }

  static async getImageForEasing (easingName, props = {}) {
    const c = new Canvas(props);
    c.openInWorld();
    await c.whenRendered();
    const easing = stringToEasing(easings[easingName]);
    const style = { color: Color.black };

    const values = [];
    const samples = 200;
    for (let i = 0; i <= samples; i++) {
      const x = i / samples;
      values.push([x, easing(x)]);
    }

    const xToDrawPosition = (x) => x * c.width;
    const yToDrawPosition = (y) => (1 - y) * c.height;

    let previousX = 0;
    let previousValue = 0;

    values.forEach(positionValuePair => {
      const x = positionValuePair[0];
      const value = positionValuePair[1];
      c.line(pt(xToDrawPosition(previousX), yToDrawPosition(previousValue)), pt(xToDrawPosition(x), yToDrawPosition(value)), style);
      previousX = x;
      previousValue = value;
    });

    // final line
    c.line(pt(xToDrawPosition(previousX), yToDrawPosition(previousValue)), pt(c.width, yToDrawPosition(previousValue)), style);
    return c;
  }
}

export class EasingListItem extends Morph {
  static get properties () {
    return {
      fill: {
        defaultValue: Color.white
      },
      borderRadius: {
        defaultValue: 4
      },
      easing: {
        defaultValue: 'linear'
      },
      browser: {},
      extent: {
        defaultValue: pt(430, 70)
      },
      ui: {
        after: ['easing'],
        initialize () {
          this.initialize();
        }
      },
      isSelected: {
        defaultValue: false,
        set (isSelected) {
          this.setProperty('isSelected', isSelected);
          this.browser.onSelectionChange(this);
        }
      },
      styleSet: {
        defaultValue: 'default',
        set (styleSet) {
          this.setProperty('styleSet', styleSet);
          this.updateStyle();
        }
      }
    };
  }

  async initialize () {
    this.ui = {};
    this.layout = new HorizontalLayout({
      spacing: 20,
      autoResize: false
    });
    this.ui.label = new Label({ textString: this.easing, fontSize: 15, extent: pt(100, 20) });
    this.addMorph(this.ui.label);
    this.ui.easingImage = EasingSelection.getImageForEasing(this.easing, {
      extent: pt(50, 50),
      position: pt(200, 10)
    });
    this.addMorph(await this.ui.easingImage);
    return this;
  }

  updateStyle () {
    switch (this.styleSet) {
      case 'default':
        this.fill = Color.white;
        break;
      case 'hover':
        this.fill = Color.rgb(229, 231, 233);
        break;
      case 'selected':
        this.fill = Color.rgb(133, 193, 233);
        break;
    }
  }

  onHoverIn () {
    if (!this.isSelected) {
      this.styleSet = 'hover';
    }
  }

  onHoverOut () {
    if (!this.isSelected) {
      this.styleSet = 'default';
    }
  }

  onMouseDown () {
    if (this.isSelected) {
      this.isSelected = false;
      this.styleSet = 'hover';
    } else {
      this.isSelected = true;
      this.styleSet = 'selected';
    }
  }
}
