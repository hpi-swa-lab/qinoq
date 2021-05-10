import { Label, Icon } from 'lively.morphic';
import { Color, rect } from 'lively.graphics';
import { COLOR_SCHEME } from '../colors.js';

export class QinoqButton extends Label {
  static get properties () {
    return {
      fontColor: {
        defaultValue: COLOR_SCHEME.BUTTON_BLUE
      },
      enabled: {
        defaultValue: true,
        set (enabled) {
          this.setProperty('enabled', enabled);
          if (enabled) {
            this.enable();
          } else {
            this.disable();
          }
        }
      },
      // use to show a state e.g. toggle snapping
      filled: {
        defaultValue: false,
        set (filled) {
          this.setProperty('filled', filled);
          this.styleSet = 'default';
          this.updateStyle();
        }
      },
      target: {},
      action: {},
      command: {},
      nativeCursor: {
        defaultValue: 'pointer'
      },
      borderRadius: {
        defaultValue: 4
      },
      borderColor: {
        defaultValue: COLOR_SCHEME.BACKGROUND
      },
      borderWidth: {
        defaultValue: 1
      },
      padding: {
        defaultValue: rect(1, 1, 4, 2)
      },
      icon: {
        set (icon) {
          Icon.setIcon(this, icon);
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

  get isQinoqButton () {
    return true;
  }

  onMouseDown () {
    this.styleSet = this.filled ? 'unfilled' : 'filled';
  }

  onMouseUp () {
    this.styleSet = 'default';
    this.command ? this.target.execCommand(this.command) : this.target[this.action]();
  }

  onHoverIn () {
    this.borderColor = COLOR_SCHEME.BUTTON_BLUE;
  }

  onHoverOut () {
    this.borderColor = COLOR_SCHEME.BACKGROUND;
    this.styleSet = 'default';
  }

  updateStyle () {
    switch (this.styleSet) {
      case 'default':
        this.styleSet = this.filled ? 'filled' : 'unfilled';
        break;
      case 'unfilled':
        this.fill = COLOR_SCHEME.BACKGROUND;
        this.fontColor = COLOR_SCHEME.BUTTON_BLUE;
        break;
      case 'disabled':
        this.fill = COLOR_SCHEME.BACKGROUND;
        this.fontColor = COLOR_SCHEME.BACKGROUND_VARIANT;
        break;
      case 'filled':
        this.fill = COLOR_SCHEME.BUTTON_BLUE;
        this.fontColor = COLOR_SCHEME.BACKGROUND;
    }
  }

  enable () {
    this.styleSet = this.filled ? 'filled' : 'default';
    this.reactsToPointer = true;
  }

  disable () {
    this.styleSet = 'disabled';
    this.reactsToPointer = false;
  }
}
