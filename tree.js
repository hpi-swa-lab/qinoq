import { QinoqMorph } from './qinoq-morph.js';
import { COLOR_SCHEME } from './colors.js';

export class SequenceTree extends QinoqMorph {
  static get properties () {
    return {
      name: {
        defaultValue: 'sequence overview'
      },
      borderColor: {
        defaultValue: COLOR_SCHEME.BACKGROUND_VARIANT
      }
    };
  }
}
