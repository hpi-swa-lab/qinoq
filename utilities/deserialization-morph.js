import { Morph } from 'lively.morphic';

export class DeserializationAwareMorph extends Morph {
  __deserialize__ (snapshot, objRef, serializedMap, pool) {
    this._deserializing = true;
    super.__deserialize__(snapshot, objRef, serializedMap, pool);
  }

  __after_deserialize__ (snapshot, ref, pool) {
    delete this._deserializing;
    super.__after_deserialize__(snapshot, ref, pool);
  }
}
