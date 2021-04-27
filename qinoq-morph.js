import { DeserializationAwareMorph } from './utilities/deserialization-morph.js';

// QinoqMorphs are components of the editor
export class QinoqMorph extends DeserializationAwareMorph {
  static get properties () {
    return {
      _editor: {},
      halosEnabled: {
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

  menuItems () {
    if (this.editor && this.editor.debug) {
      return super.menuItems();
    }
    return [];
  }
}
