import { pt } from 'lively.graphics';
import { arr } from 'lively.lang';
import { Sequence } from './interactive.js';
import { easings, stringToEasing } from 'lively.morphic';
import { animatedProperties } from './properties.js';
import { newUUID } from 'lively.lang/string.js';
import { Bezier } from './bezierjs.js';

class Animation {
  constructor (targetMorph, property, useRelativeValues = false) {
    this.target = targetMorph;
    this.property = property;
    this.keyframes = [];
    this.useRelativeValues = useRelativeValues;
  }

  getKeyframeAt (position) {
    return this.sequence
      ? this.keyframes.find(keyframe => this.sequence.getAbsolutePositionFor(keyframe) === this.sequence.getAbsolutePosition(position))
      // this path should never be executed with an actual editor and interactive
      // without however it is not possible anymore to test the animations separately
      : this.keyframes.find(keyframe => keyframe.position === position);
  }

  addKeyframe (keyframe, doNotSort = false) {
    const existingKeyframe = this.getKeyframeAt(keyframe.position);
    if (existingKeyframe) {
      existingKeyframe.overwriteWithKeyframe(keyframe);
    } else {
      this.keyframes.push(keyframe);

      if (keyframe.hasDefaultName() && this.interactive) {
        keyframe.name = `Keyframe ${this.interactive.nextKeyframeNumber++}`;
      }
      if (this.sequence) this.sequence.onKeyframeAddedInAnimation({ keyframe, animation: this });
    }
    if (!doNotSort) {
      this._sortKeyframes();
    }
  }

  removeKeyframe (keyframe) {
    arr.remove(this.keyframes, keyframe);
    if (this.sequence) this.sequence.onKeyframeRemovedInAnimation({ keyframe, animation: this });
    if (this.keyframes.length === 0) Sequence.getSequenceOfMorph(this.target).removeAnimation(this);
  }

  addKeyframes (keyframes) {
    keyframes.forEach(keyframe => this.addKeyframe(keyframe, true));
    this._sortKeyframes();
  }

  _sortKeyframes () {
    this.keyframes.sort((a, b) => a.position - b.position);
  }

  getClosestKeyframes (progress) {
    if (this.keyframes.length === 0) {
      return {};
    }
    if (this.keyframes[0].position > progress) {
      return { end: this.keyframes[0] };
    }
    for (let i = 0; i < this.keyframes.length; i++) {
      if (this.keyframes[i].position > progress) {
        return { start: this.keyframes[i - 1], end: this.keyframes[i] };
      }
    }
    return { start: this.keyframes[this.keyframes.length - 1] };
  }

  get sequence () {
    if (!this._sequence) { this._sequence = Sequence.getSequenceOfMorph(this.target); }
    return this._sequence;
  }

  get interactive () {
    return this.sequence && this.sequence.interactive;
  }

  // Linear Interpolation
  set progress (progress) {
    this.target[this.property] = this.getValueForProgress(progress);
  }

  transformValue (value) {
    if (!this.useRelativeValues) { return value; }
    return this.transformRelativeValue(value);
  }

  // Linear Interpolation helper
  lerp (start, end, t) {
    return (t - start.position) / (end.position - start.position);
  }

  interpolate (progress, start, end) {
    // Subclass responsibility
    // Each animation type implements an interpolate method that interpolates the corresponding type
    throw new Error('Subclass responsibility');
  }

  getValueForProgress (progress, transformValue = true) {
    const { start, end } = this.getClosestKeyframes(progress);
    let value;
    if (!!start && !!end) {
      value = this.interpolate(progress, start, end);
    } else if (start) {
      value = start.value;
    } else if (end) {
      value = end.value;
    }

    return transformValue ? this.transformValue(value) : value;
  }

  getValues (sampling = 0.01, transformValue = false) {
    const values = {};
    for (let progress = 0; progress <= 1; progress += sampling) {
      values[progress] = this.getValueForProgress(progress, transformValue);
    }
    return values;
  }

  copy () {
    const copiedAnimation = createAnimationForPropertyType(this.type, this.target, this.property);
    copiedAnimation.useRelativeValues = this.useRelativeValues;
    const copiedKeyframes = this.keyframes.map(keyframe => keyframe.copy());
    copiedAnimation.addKeyframes(copiedKeyframes);
    return copiedAnimation;
  }

  get isAnimation () {
    return true;
  }

  get name () {
    return `${this.type} animation on ${this.property}`;
  }

  get type () {
    throw new Error('subclass responsibility');
  }
}

export function createAnimationForPropertyType (propertyType, targetMorph, property) {
  const additionalPropertySpec = animatedProperties[property];
  switch (propertyType) {
    case 'point':
      // extent and position need to be scalable with the interactive thus we use relative values
      return new PointAnimation(targetMorph, property, additionalPropertySpec && additionalPropertySpec.defaultRelative);
    case 'color':
      return new ColorAnimation(targetMorph, property);
    case 'number':
      return new NumberAnimation(targetMorph, property);
    case 'string':
      return new TypewriterAnimation(targetMorph, property);
  }
  $world.setStatusMessage('Could not match property type');
}
export class Keyframe {
  constructor (position, value, spec = {}) {
    const { name = 'aKeyframe', easing = 'inOutSine' } = spec;
    this.uuid = newUUID();
    this.position = position;
    this.value = value;
    this.name = name;
    this.setEasing(easing);
  }

  hasDefaultName () {
    return this.name == 'aKeyframe';
  }

  setEasing (easing = 'inOutSine') {
    this.easingName = easing;
    this.easing = stringToEasing(easings[easing]);
  }

  static get possibleEasings () {
    return Object.keys(easings);
  }

  get isKeyframe () {
    return true;
  }

  equals (keyframe) {
    return this.uuid === keyframe.uuid;
  }

  overwriteWithKeyframe (keyframe) {
    if (!keyframe.hasDefaultName()) this.name = keyframe.name;
    this.position = keyframe.position;
    this.value = keyframe.value;
    this.setEasing(keyframe.easingName);
  }

  copy () {
    return new Keyframe(this.position, this.value, { name: this.name, easing: this.easingName });
  }
}

export class NumberAnimation extends Animation {
  interpolate (progress, start, end) {
    const factor = end.easing(this.lerp(start, end, progress));
    return start.value + (end.value - start.value) * factor;
  }

  get type () {
    return 'number';
  }

  get max () {
    return Math.max(...this.keyframes.map(keyframe => keyframe.value));
  }

  get min () {
    return Math.min(...this.keyframes.map(keyframe => keyframe.value));
  }
}

export class PointPathAnimation extends Animation {
  constructor (targetMorph, property, useRelativeValues = false, curve) {
    super(targetMorph, property, useRelativeValues);
    this.LUT = curve.getLUT(102);
  }

  static example (target, property) {
    const animation = new PointPathAnimation(target, property, false, new Bezier(150, 40, 80, 30, 105, 150));
    const key1 = new Keyframe(0);
    const key2 = new Keyframe(1);
    animation.addKeyframe(key1);
    animation.addKeyframe(key2);
    return animation;
  }

  interpolate (progress, start, end) {
    const factor = end.easing(this.lerp(start, end, progress));
    const index = (progress != 0 && progress != 1) ? (progress * factor).toFixed(2) * 100 : progress * 100;
    const lookupResult = this.LUT[index];
    debugger;
    return pt(lookupResult.x, lookupResult.y);
  }

  get tye () {
    return 'path';
  }
}

export class PointAnimation extends Animation {
  static example (target, property) {
    const animation = new PointAnimation(target, property);
    const key1 = new Keyframe(0, pt(0, 0));
    const key2 = new Keyframe(1, pt(165, 110));
    animation.addKeyframe(key1);
    animation.addKeyframe(key2);

    return animation;
  }

  interpolate (progress, start, end) {
    const factor = end.easing(this.lerp(start, end, progress));
    return pt(start.value.x + (end.value.x - start.value.x) * factor,
      start.value.y + (end.value.y - start.value.y) * factor);
  }

  transformRelativeValue (relativeValue) {
    return pt(relativeValue.x * this.sequence.width, relativeValue.y * this.sequence.height);
  }

  getMax (attribute = 'x') {
    return Math.max(...this.keyframes.map(keyframe => keyframe.value[attribute]));
  }

  getMin (attribute = 'x') {
    return Math.min(...this.keyframes.map(keyframe => keyframe.value[attribute]));
  }

  get type () {
    return 'point';
  }
}

export class ColorAnimation extends Animation {
  interpolate (progress, start, end) {
    const factor = end.easing(this.lerp(start, end, progress));
    return start.value.interpolate(factor, end.value);
  }

  get type () {
    return 'color';
  }
}

export class TypewriterAnimation extends Animation {
  getTypewriterType (start, end) {
    if (end.value.startsWith(start.value)) {
      return 'forward';
    }
    if (start.value.startsWith(end.value)) {
      return 'reverse';
    }
    return 'no-interpolation';
  }

  interpolate (progress, start, end) {
    const factor = end.easing(this.lerp(start, end, progress));
    const typeWriterType = this.getTypewriterType(start, end);

    const lengthDifference = Math.abs(end.value.length - start.value.length);
    const shownChars = Math.round(lengthDifference * factor);
    let result;
    switch (typeWriterType) {
      case 'forward':
        return `${start.value}${end.value.slice(start.value.length, start.value.length + shownChars)}`;
      case 'reverse':
        return `${end.value}${start.value.slice(end.value.length, start.value.length - shownChars)}`;
      case 'no-interpolation':
        return start.value;
    }
  }

  get type () {
    return 'string';
  }
}
