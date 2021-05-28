import { Label, Icon } from 'lively.morphic';
import { rect } from 'lively.graphics';
import { COLOR_SCHEME } from '../colors.js';

export class QinoqButton extends Label {
  static get properties () {
    return {
      styleSet: {
        defaultValue: 'default',
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
          if (enabled) this.enable(); else this.disable();
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
      this.fontColor = COLOR_SCHEME.ON_SURFACE_VARIANT;
      return;
    }

    switch (this.styleSet) {
      case 'default':
        if (this.active) {
          this.fill = COLOR_SCHEME.PRIMARY;
          this.fontColor = COLOR_SCHEME.ON_SURFACE;
        } else {
          this.fill = COLOR_SCHEME.SURFACE;
          this.fontColor = COLOR_SCHEME.PRIMARY;
        }
        break;
      case 'hovered':
        if (this.active) {
          this.fill = COLOR_SCHEME.PRIMARY_VARIANT;
          this.fontColor = COLOR_SCHEME.ON_SURFACE;
        } else {
          this.fill = COLOR_SCHEME.SURFACE_VARIANT;
          this.fontColor = COLOR_SCHEME.PRIMARY;
        }
        break;
      case 'pressed':
        if (this.active) {
          this.fill = COLOR_SCHEME.ON_SURFACE_VARIANT;
          this.fontColor = COLOR_SCHEME.PRIMARY;
        } else {
          this.fill = COLOR_SCHEME.PRIMARY;
          this.fontColor = COLOR_SCHEME.ON_SURFACE;
        }
    }
  }

  enable () {
    this.updateStyle();
    this.reactsToPointer = true;
  }

  disable () {
    this.updateStyle();
    this.reactsToPointer = false;
  }
}
