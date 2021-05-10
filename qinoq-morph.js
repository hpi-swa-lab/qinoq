import { DeserializationAwareMorph } from './utilities/deserialization-morph.js';
import { singleSelectKeyPressed, rangeSelectKeyPressed } from './keys.js';

// QinoqMorphs are components of the editor
export class QinoqMorph extends DeserializationAwareMorph {
  static get properties () {
    return {
      _editor: {},
      halosEnabled: {
        get () {
          return this.editor && this.editor.debug;
        }
      },
      acceptsDrops: {
        defaultValue: false
      }
    };
  }

  get isQinoqMorph () {
    return true;
  }

  get editor () {
    return this._editor;
  }

  get interactive () {
    return this.editor.interactive;
  }

  onMouseDown (event) {
    super.onMouseDown(event);
    if (!event.targetMorph.isTimelineSequence && !event.targetMorph.isTimelineKeyframe) this.world().get('interactives editor').execCommand('deselect all items');
  }

  menuItems () {
    if (this.editor && this.editor.debug) {
      return super.menuItems();
    }
    return [];
  }
}
