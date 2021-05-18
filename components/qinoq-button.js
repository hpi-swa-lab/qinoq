import { Label, Icon } from 'lively.morphic';
import { rect } from 'lively.graphics';
import { COLOR_SCHEME } from '../colors.js';

export class QinoqButton extends Label {
  static get properties () {
    return {
      fontColor: {
        defaultValue: COLOR_SCHEME.BUTTON_BLUE
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
      doubleAction: {},
      doubleCommand: {},
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
        defaultValue: rect(3, 3, 0, 0)
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
      },
      previousMouseUpTime: {
        defaultValue: 0
      },
      enabled: {
        after: ['styleSet'],
        set (enabled) {
          this.setProperty('enabled', enabled);
          if (enabled) this.enable(); else this.disable();
        }
      }
    };
  }

  get isQinoqButton () {
    return true;
  }

  onMouseDown (event) {
    super.onMouseDown(event);
    this.styleSet = this.filled ? 'unfilled' : 'filled';
  }

  onDoubleMouseDown () {
    if (!this.doubleCommand && !this.doubleAction) return;
    this.doubleCommand ? this.target.execCommand(this.doubleCommand) : this.target[this.doubleAction]();
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
    this.styleSet = 'default';
    this.reactsToPointer = true;
  }

  disable () {
    this.styleSet = 'disabled';
    this.reactsToPointer = false;
  }
}
