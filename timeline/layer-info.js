import { Morph, Label } from 'lively.morphic';
import { CONSTANTS } from './constants.js';

export class GlobalTimelineLayerInfo extends Morph {
  static get properties () {
    return {
      timelineLayer: {},
      ui: {
        after: ['timelineLayer'],
        initialize () {
          this.initialize();
        }
      },
      height: {
        defaultValue: CONSTANTS.LAYER_HEIGHT
      }
    };
  }

  get layer () {
    return this.timelineLayer.layer;
  }

  initialize () {
    this.ui = {};
    this.ui.label = new Label({
      textString: this.layer.name || this.timelineLayer.name
    });
    this.addMorph(this.ui.label);
  }
}
