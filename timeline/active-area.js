import { CONSTANTS } from './constants.js';
import { Canvas } from 'lively.components/canvas.js';
import { pt } from 'lively.graphics';
import { COLOR_SCHEME } from '../colors.js';

export class ActiveArea extends Canvas {
  static get properties () {
    return {
      extent: {
        defaultValue: pt(CONSTANTS.IN_EDIT_MODE_SEQUENCE_WIDTH, CONSTANTS.LAYER_HEIGHT)
      },
      position: {
        defaultValue: pt(CONSTANTS.SEQUENCE_INITIAL_X_OFFSET, 0)
      },
      reactsToPointer: {
        defaultValue: false
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
      }
    };
  }
}
