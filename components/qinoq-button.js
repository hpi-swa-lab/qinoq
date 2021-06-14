import { Label, Icon } from 'lively.morphic';
import { rect } from 'lively.graphics';
import { COLOR_SCHEME } from '../colors.js';

export class QinoqButton extends Label {
  static get properties () {
    return {
      styleSet: {
        // cannot use defaultValue, otherwise this.updateStyle won't be triggered initially
        initialize () {
          if (this._deserializing) return;
          this.styleSet = 'default';
        },
        set (styleSet) {
          this.setProperty('styleSet', styleSet);
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
      borderWidth: {
        defaultValue: 0
      },
      padding: {
        defaultValue: rect(3, 3, 0, 0)
      },
      icon: {
        set (icon) {
          Icon.setIcon(this, icon);
        }
      },
      previousMouseUpTime: {
        defaultValue: 0
      },
      enabled: {
        after: ['styleSet'],
        defaultValue: true,
        set (enabled) {
          this.setProperty('enabled', enabled);
          this.updateStyle();
          this.reactsToPointer = enabled;
        }
      },
      active: {
        after: ['enabled'],
        defaultValue: false,
        set (active) {
          this.setProperty('active', active);
          this.updateStyle();
        }
      }
    };
  }

  get isQinoqButton () {
    return true;
  }

  onMouseDown (event) {
    super.onMouseDown(event);
    this.styleSet = 'pressed';
  }

  onDoubleMouseDown () {
    if (!this.doubleCommand && !this.doubleAction) return;
    this.doubleCommand
      ? this.target.execCommand(this.doubleCommand)
      : this.target[this.doubleAction]();
  }

  onMouseUp () {
    this.styleSet = 'default';
    this.command ? this.target.execCommand(this.command) : this.target[this.action]();
  }

  onHoverIn () {
    this.styleSet = 'hovered';
  }

  onHoverOut () {
    this.styleSet = 'default';
  }

  updateStyle () {
    if (!this.enabled) {
      this.fill = COLOR_SCHEME.SURFACE_VARIANT;
      this.fontColor = COLOR_SCHEME.ON_SURFACE_DARKER_VARIANT;
      return;
    }

    switch (this.styleSet) {
      case 'default':
        if (this.active) {
          this.fill = COLOR_SCHEME.PRIMARY;
          this.fontColor = COLOR_SCHEME.ON_PRIMARY;
        } else {
          this.fill = COLOR_SCHEME.SURFACE;
          this.fontColor = COLOR_SCHEME.PRIMARY;
        }
        break;
      case 'hovered':
        if (this.active) {
          this.fill = COLOR_SCHEME.PRIMARY_VARIANT;
          this.fontColor = COLOR_SCHEME.ON_PRIMARY;
        } else {
          this.fill = COLOR_SCHEME.SURFACE_VARIANT;
          this.fontColor = COLOR_SCHEME.PRIMARY;
        }
        break;
      case 'pressed':
        if (this.active) {
          this.fill = COLOR_SCHEME.SURFACE_VARIANT;
          this.fontColor = COLOR_SCHEME.PRIMARY;
        } else {
          this.fill = COLOR_SCHEME.PRIMARY;
          this.fontColor = COLOR_SCHEME.ON_PRIMARY;
        }
    }
  }

  enable () {
    this.enabled = true;
  }

  disable () {
    this.enabled = false;
  }
}
