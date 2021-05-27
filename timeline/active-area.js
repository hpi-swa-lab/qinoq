import { TIMELINE_CONSTANTS } from './constants.js';
import { Canvas } from 'lively.components/canvas.js';
import { pt } from 'lively.graphics';
import { COLOR_SCHEME } from '../colors.js';

// To work as expected, instances of this class need to be submorphs of a Timeline Layer
// The main purpose of this class is acting as an event propagator that delegates Events from here to the owner (Layer).
// This is a cleaner way instead of just creating a morph and add the event delegating functions.
export class ActiveArea extends Canvas {
  static get properties () {
    return {
      position: {
        defaultValue: pt(TIMELINE_CONSTANTS.SEQUENCE_INITIAL_X_OFFSET, 0)
      },
      fill: {
        defaultValue: COLOR_SCHEME.SURFACE_VARIANT
      },
      name: {
        defaultValue: 'active area'
      },
      borderStyle: {
        defaultValue: { bottom: 'solid', left: 'none', right: 'none', top: 'solid' }
      },
      acceptsDrops: {
        defaultValue: false
      },
      halosEnabeld: {
        defaultValue: false
      }
    };
  }

  get isActiveArea () {
    return true;
  }

  onMouseDown (event) {
    this.owner.onMouseDown(event);
  }
}
