import { Label, Icon } from 'lively.morphic';
import { Color } from 'lively.graphics';
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
          if (!this.enabled) return;
          if (filled) {
            this.setFilledStyle();
          } else {
            this.setDefaultStyle();
          }
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
      icon: {
        set (icon) {
          Icon.setIcon(this, icon);
        }
      }
    };
  }

  get isQinoqButton () {
    return true;
  }

  onMouseDown () {
    this.filled ? this.resetStyle() : this.setFilledStyle();
  }

  onMouseUp () {
    this.setDefaultStyle();
    this.command ? this.target.execCommand(this.command) : this.target[this.action]();
  }

  onHoverIn () {
    this.borderColor = COLOR_SCHEME.BUTTON_BLUE;
  }

  onHoverOut () {
    this.borderColor = COLOR_SCHEME.BACKGROUND;
  }

  setDefaultStyle () {
    this.filled ? this.setFilledStyle() : this.resetStyle();
  }

  setDisabledStyle () {
    this.fill = COLOR_SCHEME.BACKGROUND;
    this.fontColor = COLOR_SCHEME.BACKGROUND_VARIANT;
  }

  setFilledStyle () {
    this.fill = COLOR_SCHEME.BUTTON_BLUE;
    this.fontColor = COLOR_SCHEME.BACKGROUND;
  }

  resetStyle () {
    this.fill = COLOR_SCHEME.BACKGROUND;
    this.fontColor = COLOR_SCHEME.BUTTON_BLUE;
  }

  enable () {
    if (this.filled) this.setFilledStyle();
    else this.setDefaultStyle();
    this.reactsToPointer = true;
  }

  disable () {
    this.setDisabledStyle();
    this.reactsToPointer = false;
  }
}
