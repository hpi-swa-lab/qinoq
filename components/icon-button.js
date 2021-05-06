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
      icon: {
        set (icon) {
          Icon.setIcon(this, icon);
        }
      }
    };
  }

  onMouseDown (event) {
    super.onMouseDown(event);
    this.setFilledStyle();
  }

  onMouseUp (event) {
    super.onMouseUp(event);
    this.setDefaultStyle();
    this.command ? this.target.execCommand(this.command) : this.target[this.action]();
  }

  setDefaultStyle () {
    this.fill = COLOR_SCHEME.BACKGROUND;
    this.fontColor = COLOR_SCHEME.BUTTON_BLUE;
  }

  setDisabledStyle () {
    this.fontColor = COLOR_SCHEME.BACKGROUND;
    this.fill = COLOR_SCHEME.BACKGROUND_VARIANT;
  }

  setFilledStyle () {
    this.fill = COLOR_SCHEME.BUTTON_BLUE;
    this.fontColor = COLOR_SCHEME.BACKGROUND;
  }

  enable () {
    this.setDefaultStyle();
    this.reactsToPointer = true;
  }

  disable () {
    this.setDisabledStyle();
    this.reactsToPointer = false;
  }
}
