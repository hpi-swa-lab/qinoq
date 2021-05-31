import { HorizontalLayout, Label } from 'lively.morphic';
import { COLOR_SCHEME } from '../colors.js';
import { pt } from 'lively.graphics';
import { arr } from 'lively.lang';
import { disconnect, connect } from 'lively.bindings';
import { TIMELINE_CONSTANTS } from './constants.js';
import { QinoqMorph } from '../qinoq-morph.js';
import { Canvas } from 'lively.components/canvas.js';
export class TimelineCursor extends QinoqMorph {
  static get properties () {
    return {
      isLayoutable: {
        defaultValue: false
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
      ruler: {},
      fill: {
        defaultValue: COLOR_SCHEME.SECONDARY
      },
      fontColor: {
        defaultValue: COLOR_SCHEME.ON_SECONDARY
      },
      name: {
        defaultValue: 'cursor'
      },
      ui: {
        initialize () {
          if (this._deserializing) return;
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
    this.borderStyle = 'none';
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

export class Ruler extends QinoqMorph {
  static get properties () {
    return {
      name: {
        defaultValue: 'ruler'
      },
      timeline: {},
      extent: {
        set (point) {
          this.setProperty('extent', point);
          this.ui.scaleContainer.extent = pt(this.timeline.ui.layerContainer.width, this.height);
        }
      },
      ui: {
        after: ['timeline'],
        defaultValue: {},
        initialize () {
          if (this._deserializing) return;
          this.initializeScale();
          this.initializeHead();
        }
      },
      clipMode: 'hidden',
      displayValue: {
        after: ['ui'],
        defaultValue: 0,
        type: 'Number',
        set (displayValue) {
          this.setProperty('displayValue', displayValue);
          if (!this._deserializing) this.ui.label.textString = displayValue.toString();
        }
      }
    };
  }

  initializeHead () {
    this.ui.label = new Label({
      name: 'ruler/head/text',
      fontSize: CONSTANTS.CURSOR_FONT_SIZE,
      fontColor: COLOR_SCHEME.ON_SECONDARY
    });
    this.ui.head = new QinoqMorph({
      name: 'ruler/head',
      layout: new HorizontalLayout({
        spacing: 3,
        autoResize: true
      }),
      borderRadius: 4,
      fill: COLOR_SCHEME.SECONDARY,
      submorphs: [this.ui.label]
    });
    this.ui.headCenter = new QinoqMorph({
      extent: pt(20, 40),
      name: 'ruler/head/center',
      fill: COLOR_SCHEME.TRANSPARENT,
      layout: new HorizontalLayout({
        direction: 'centered'
      }),
      submorphs: [this.ui.head]
    });
    this.addMorph(this.ui.headCenter);
  }

  async initializeScale () {
    this.ui.scale = new Canvas({
      name: 'ruler/scale',
      extent: pt(this.timeline.ui.layerContainer.width, this.height)
    });
    this.ui.scaleContainer = new QinoqMorph({
      name: 'ruler/scale/container',
      position: pt(CONSTANTS.LAYER_INFO_WIDTH, 0),
      clipMode: 'hidden'
    });
    this.ui.scaleContainer.addMorph(this.ui.scale);
    this.addMorph(this.ui.scaleContainer);
    await this.ui.scale.whenRendered(); this.redrawScale();
  }

  updatePosition (newLocation) {
    const layerContainerScroll = this.timeline.ui.layerContainer.scroll.x;
    let diff = layerContainerScroll - newLocation;
    if (newLocation < layerContainerScroll) {
      // TODO: change appearance
      diff = 0;
    }
    if (newLocation > this.timeline.ui.layerContainer.width + layerContainerScroll) {
      diff = -this.timeline.ui.layerContainer.width;
    }

    this.ui.headCenter.position = pt(CONSTANTS.LAYER_INFO_WIDTH - diff - this.ui.headCenter.width / 2, this.ui.headCenter.position.y);
  }

  updateContainerScroll (layerContainerScroll) {
    this.updatePosition(this.timeline.ui.cursor.location);
    this.ui.scale.position = pt(CONSTANTS.SEQUENCE_INITIAL_X_OFFSET - layerContainerScroll + 2, 0);
  }

  updateExtent (newWidth) {
    this.ui.scale.width = newWidth;
    this.redraw();
  }

  async redraw () {
    await this.ui.scale.whenRendered(); this.redrawScale();
  }

  redrawScale (newWidth) {
    if (!this.ui.scale.context) return false;
    const style = { color: COLOR_SCHEME.KEYFRAME_FILL };
    this.ui.scale.clear(COLOR_SCHEME.ON_BACKGROUND_VARIANT);
    for (let i = 0; i <= this.interactive.length; i += 10) {
      const y = (i / 100 == parseInt(i / 100)) ? 0 : 5;
      this.ui.scale.line(pt(i * this.timeline.zoomFactor, y), pt(i * this.timeline.zoomFactor, 10), style);
    }
  }
}
