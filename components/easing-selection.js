import { Morph, ShadowObject, HorizontalLayout, Label, VerticalLayout, easings, stringToEasing } from 'lively.morphic';
import { pt } from 'lively.graphics';
import { Canvas } from 'lively.components/canvas.js';
import { Keyframe } from '../animations.js';
import { Button } from 'lively.components';
import { promise } from 'lively.lang';
import { SearchField } from 'lively.components/widgets.js';
import { connect } from 'lively.bindings';
import { COLOR_SCHEME } from '../colors.js';

const CONSTANTS = {
  PROMPT_BORDER_RADIUS: 5,
  HEAD_FONT_SIZE: 20,
  SECONDARY_FONT_SIZE: 15,
  CURVE_WIDTH: 2,
  SELECTION_PANE_HEIGHT_RATIO: 0.72,
  SELECTION_PANE_BORDER_WIDTH: 1,
  PROMPT_DEFAULT_EXTENT: pt(480, 630),
  LIST_ITEM_EXTENT: pt(444, 70),
  IMAGE_EXTENT: pt(50, 50),
  LIST_ITEM_LABEL_EXTENT: pt(100, 20)
};

export class EasingSelection extends Morph {
  static keybindings () {
    return [
      { keys: 'Enter', command: 'confirm selection' },
      { keys: 'Escape', command: 'cancel selection' },
      { keys: 'Up', command: 'go up one easing' },
      { keys: 'Down', command: 'go down one easing' },
      { keys: 'Ctrl-Up', command: 'go to top of the list' },
      { keys: 'Ctrl-Down', command: 'go to bottom of the list' }
    ];
  }

  static get properties () {
    return {
      fill: {
        defaultValue: COLOR_SCHEME.PROMPT_BACKGROUND
      },
      borderRadius: {
        defaultValue: CONSTANTS.PROMPT_BORDER_RADIUS
      },
      draggable: {
        defaultValue: true
      },
      dropShadow: {
        defaultValue: new ShadowObject(true)
      },
      extent: {
        defaultValue: CONSTANTS.PROMPT_DEFAULT_EXTENT
      },
      epiMorph: {
        defaultValue: true
      },
      selection: {},
      listItems: {},
      label: {
        defaultValue: 'Select easing'
      },
      ui: {
        after: ['label'],
        initialize () {
          this.initializeUI();
        }
      }
    };
  }

  initializeUI () {
    this.layout = new VerticalLayout({
      spacing: 10,
      align: 'center',
      autoResize: false,
      resizeSubmorphs: true
    });
    this.ui = {};
    this.buildHeadline();
    this.buildSearchField();
    this.buildSelectionPane();
    this.initializeListItems();
    this.buildConfirmPane();
  }

  buildHeadline () {
    this.ui.headline = new Label({
      textString: this.label,
      fontSize: CONSTANTS.HEAD_FONT_SIZE
    });
    this.addMorph(this.ui.headline);
  }

  buildSearchField () {
    this.ui.searchField = new SearchField({
      borderRadius: CONSTANTS.PROMPT_BORDER_RADIUS,
      fontColor: COLOR_SCHEME.ON_BACKGROUND,
      fontSize: CONSTANTS.SECONDARY_FONT_SIZE
    });

    connect(this.ui.searchField, 'onChange', this, 'onFilterChange');
    this.addMorph(this.ui.searchField);
  }

  buildSelectionPane () {
    this.ui.selectionPane = new Morph({
      borderRadius: CONSTANTS.PROMPT_BORDER_RADIUS,
      fill: COLOR_SCHEME.BACKGROUND,
      borderColor: COLOR_SCHEME.ON_BACKGROUND_VARIANT,
      borderStyle: 'solid',
      borderWidth: CONSTANTS.SELECTION_PANE_BORDER_WIDTH,
      name: 'selection pane',
      height: this.height * CONSTANTS.SELECTION_PANE_HEIGHT_RATIO,
      clipMode: 'auto'
    });
    this.ui.selectionPane.layout = new VerticalLayout(
      {
        autoResize: false
      });

    this.addMorph(this.ui.selectionPane);
  }

  buildConfirmPane () {
    this.ui.confirmPane = new Morph({
      extent: pt(400, 100),
      fill: COLOR_SCHEME.TRANSPARENT
    });
    this.addMorph(this.ui.confirmPane);
    this.ui.confirmPane.layout = new HorizontalLayout({ spacing: 20 });
    this.ui.okButton = new Button({ label: 'Ok', master: 'styleguide://SystemPrompts/green button' });
    this.ui.okButton.action = () => this.execCommand('confirm selection');
    this.ui.confirmPane.addMorph(this.ui.okButton);
    this.ui.cancelButton = new Button({ label: 'Cancel', master: 'styleguide://SystemPrompts/red button' });
    this.ui.cancelButton.action = () => this.execCommand('cancel selection');
    this.ui.confirmPane.addMorph(this.ui.cancelButton);
  }

  initializeListItems () {
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
        name: 'confirm selection',
        exec: () => {
          if (this.selection) {
            this.resolve(this.selection);
            this.abandon(true);
          }
        }
      },
      {
        name: 'cancel selection',
        exec: () => {
          this.resolve(null);
          this.abandon(true);
        }
      },
      {
        name: 'go up one easing',
        exec: () => {
          if (!this.selection) {
            this.execCommand('go to bottom');
          } else {
            this.select(this.visibleListItems[Math.max(0, this.selectionIndexInVisibleListItems - 1)]);
          }
        }
      },
      {
        name: 'go down one easing',
        exec: () => {
          if (!this.selection) {
            this.execCommand('go to top');
          } else {
            this.select(this.visibleListItems[Math.min(this.visibleListItems.length - 1, this.selectionIndexInVisibleListItems + 1)]);
          }
        }
      },
      {
        name: 'go to top of the list',
        exec: () => {
          this.select(this.visibleListItems[0]);
        }
      },
      {
        name: 'go to bottom of the list',
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
    return EasingSelection.keybindings().concat(super.keybindings);
  }

  resolve (arg) {
    return this.answer.resolve(arg);
  }

  static init (props = {}) {
    const e = new EasingSelection(props);
    e.openInWorld();
    e.answer = {};
    const promise = new Promise((resolve, reject) => {
      e.answer.resolve = resolve;
      e.answer.reject = reject;
    });
    e.ui.searchField.focus();
    return { morph: e, promise };
  }

  static async getImageForEasing (easingName, props = {}) {
    const c = new Canvas(props);
    c.openInWorld();
    await c.whenRendered();
    const easing = stringToEasing(easings[easingName]);
    const style = { width: CONSTANTS.CURVE_WIDTH, color: COLOR_SCHEME.SECONDARY };

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
      borderRadius: {
        defaultValue: CONSTANTS.PROMPT_BORDER_RADIUS
      },
      easing: {
        defaultValue: 'linear'
      },
      browser: {},
      extent: {
        defaultValue: CONSTANTS.LIST_ITEM_EXTENT
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
      autoResize: false,
      align: 'center'
    });
    this.ui.label = new Label({ textString: this.easing, fontSize: CONSTANTS.SECONDARY_FONT_SIZE, extent: CONSTANTS.LIST_ITEM_LABEL_EXTENT });
    this.addMorph(this.ui.label);
    this.ui.easingImage = EasingSelection.getImageForEasing(this.easing, {
      extent: CONSTANTS.IMAGE_EXTENT
    });
    this.addMorph(await this.ui.easingImage);
    return this;
  }

  updateStyle () {
    switch (this.styleSet) {
      case 'default':
        this.fill = COLOR_SCHEME.BACKGROUND;
        break;
      case 'hover':
        this.fill = COLOR_SCHEME.SURFACE_VARIANT;
        break;
      case 'selected':
        this.fill = COLOR_SCHEME.SURFACE_VARIANT;
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

  onMouseDown (event) {
    super.onMouseDown(event);
    if (this.isSelected) {
      this.isSelected = false;
      this.styleSet = 'hover';
    } else {
      this.isSelected = true;
      this.styleSet = 'selected';
    }
  }

  onDoubleMouseDown (event) {
    event.stop();
    this.isSelected = true;
    this.browser.execCommand('confirm selection');
  }
}
