import { HorizontalLayout, Morph, Label } from 'lively.morphic';
import { COLOR_SCHEME } from '../colors.js';
import { pt } from 'lively.graphics';
import { arr } from 'lively.lang';
import { disconnect, connect } from 'lively.bindings';
import { CONSTANTS } from './constants.js';
import { QinoqMorph } from '../qinoq-morph.js';
export class TimelineCursor extends QinoqMorph {
  static get properties () {
    return {
      isLayoutable: {
        defaultValue: false
      },
      displayValue: {
        after: ['ui'],
        defaultValue: 0,
        type: 'Number',
        set (displayValue) {
          this.setProperty('displayValue', displayValue);
          if (!this._deserializing) this.redraw();
        }
      },
      location: {
        // location: where the cursor should point at
        // position: actual position of the morph, which is dependent on the location and the width of the cursor
        defaultValue: 0,
        type: 'Number',
        isFloat: false,
        set (location) {
          this.setProperty('location', location);
          if (!this._deserializing) this.updatePosition();
        }
      },
      fill: {
        defaultValue: COLOR_SCHEME.SECONDARY,
        set (color) {
          this.setProperty('fill', color);
          if (!this._deserializing) this.updateColor();
        }
      },
      fontColor: {
        defaultValue: COLOR_SCHEME.ON_SECONDARY,
        set (color) {
          this.setProperty('fontColor', color);
          if (!this._deserializing) this.updateColor();
        }
      },
      name: {
        defaultValue: 'cursor'
      },
      ui: {
        initialize () {
          if (this._deserializing) return;
          this.initializeSubmorphs();
          this.initializeAppearance();
        }
      },
      timeline: {}
    };
  }

  initializeSubmorphs () {
    this.ui = {};
    this.ui.label = new Label({
      name: 'cursor/head/text',
      fontSize: CONSTANTS.CURSOR_FONT_SIZE,
      halosEnabled: false,
      reactsToPointer: false
    });
    this.ui.head = new QinoqMorph({
      name: 'cursor/head',
      layout: new HorizontalLayout({
        spacing: 3,
        autoResize: true
      }),
      halosEnabled: false,
      borderRadius: 4,
      submorphs: [this.ui.label]
    });
    this.ui.headCenter = new QinoqMorph({
      extent: pt(20, 1),
      halosEnabled: false,
      reactsToPointer: false,
      fill: COLOR_SCHEME.TRANSPARENT,
      layout: new HorizontalLayout({
        direction: 'centered',
        autoResize: false
      }),
      submorphs: [this.ui.head]
    });
    this.addMorph(this.ui.headCenter);
  }

  initializeAppearance () {
    this.extent = pt(CONSTANTS.CURSOR_WIDTH, 50);
    this.clipMode = 'overflow';
    this.ui.headCenter.position = pt(-this.ui.headCenter.width / 2 + 1, this.ui.headCenter.position.y);
    this.borderStyle = 'none';
    this.updateColor();
  }

  redraw () {
    this.ui.label.textString = this.displayValue.toString();
    this.updatePosition();
  }

  updateColor () {
    this.ui.head.fill = this.fill;
    this.ui.label.fontColor = this.fontColor;
  }

  updatePosition () {
    this.position = pt(this.location - this.width / 2 + 2, this.position.y);
  }

  onOwnerChanged (newOwner) {
    if (newOwner && arr.include(newOwner.submorphs, this)) {
      if (this.previousOwner) { disconnect(this.previousOwner, 'extent', this, 'height'); }
      connect(newOwner, 'extent', this, 'height', {
        updater: `($update, extent) => {
        // needed for setting first owner while deserialization
        if (!target.timeline || !target.owner || !target.owner.owner) return;
        if (extent.y >= target.timeline.ui.layerContainer.height) $update(extent.y);
        else $update(target.timeline.ui.layerContainer.height)
      }`
      });
      this.previousOwner = newOwner;
    }
  }

  remove () {
    if (this.owner) disconnect(this.owner, 'extent', this, 'height');
    super.remove();
  }
}
