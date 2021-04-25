import { Morph } from 'lively.morphic';

export class QinoqMorph extends Morph {
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

  __deserialize__ (snapshot, objRef, serializedMap, pool) {
    this._deserializing = true;
    super.__deserialize__(snapshot, objRef, serializedMap, pool);
  }

  __after_deserialize__ (snapshot, ref, pool) {
    delete this._deserializing;
    super.__after_deserialize__(snapshot, ref, pool);
  }
}
