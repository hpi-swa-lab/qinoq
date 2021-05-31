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
      extent: {
        defaultValue: pt(CONSTANTS.CURSOR_WIDTH, 0)
      },
      fill: {
        defaultValue: COLOR_SCHEME.SECONDARY
      },
      fontColor: {
        defaultValue: COLOR_SCHEME.ON_SECONDARY
      },
      name: {
        defaultValue: 'cursor'
      },
      timeline: {}
    };
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
          this.setProperty('extent', pt(point.x, 19));
          this.ui.scaleContainer.extent = pt(this.timeline.ui.layerContainer.width, 19);
        }
      },
      ui: {
        initialize () {
          if (this._deserializing) return;
          this.ui = {};
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
      name: 'ruler head text',
      fontSize: CONSTANTS.CURSOR_FONT_SIZE,
      fontColor: COLOR_SCHEME.ON_SECONDARY
    });
    this.ui.head = new QinoqMorph({
      name: 'ruler head',
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
      name: 'ruler head center',
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
      name: 'ruler scale',
      extent: pt(0, 19)
    });
    this.ui.scaleContainer = new QinoqMorph({
      name: 'ruler scale container',
      position: pt(CONSTANTS.LAYER_INFO_WIDTH, 0),
      extent: pt(0, 19),
      clipMode: 'hidden'
    });
    this.ui.scaleContainer.addMorph(this.ui.scale);
    this.addMorph(this.ui.scaleContainer);
    this.redraw();
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

  redraw () {
    this.ui.scale.whenRendered().then(() => this.redrawScale());
  }

  redrawScale (newWidth) {
    if (!this.ui.scale.context) return false;
    const style = { color: COLOR_SCHEME.KEYFRAME_FILL, width: 1 };
    this.ui.scale.clear(COLOR_SCHEME.BACKGROUND);
    for (let i = this.timeline.start; i <= this.timeline.end; i += 25) {
      const y = (i / 100 == parseInt(i / 100)) ? 0 : 5;
      let x = this.timeline.getPositionFromScroll(i) - CONSTANTS.SEQUENCE_INITIAL_X_OFFSET;
      if (i == 0) x = x + 1;
      if (i == this.timeline.end) x = x - 1;
      this.ui.scale.line(pt(x, y), pt(x, 10), style);
    }
  }
}
