import { pt } from 'lively.graphics';
import { arr } from 'lively.lang';
import { Sequence } from 'interactives-editor';
import { easings, stringToEasing } from 'lively.morphic';

class Animation {
  constructor (targetMorph, property, useRelativeValues = false) {
    this.target = targetMorph;
    this.property = property;
    this.keyframes = [];
    this.useRelativeValues = useRelativeValues;
  }

  // TODO: Maybe use some epsilon to accept keyframes within an interval
  getKeyframeAt (position) {
    return this.keyframes.find(keyframe => keyframe.position === position);
  }

  addKeyframe (newKeyframe, doNotSort = false) {
    const existingKeyframe = this.getKeyframeAt(newKeyframe.position);
    if (existingKeyframe) {
      arr.remove(this.keyframes, existingKeyframe);
    }
    this.keyframes.push(newKeyframe);

    if (!doNotSort) {
      this._sortKeyframes();
    }
  }

  removeKeyframe (keyframe) {
    arr.remove(this.keyframes, keyframe);
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

  // Linear Interpolation
  set progress (progress) {
    const { start, end } = this.getClosestKeyframes(progress);
    if (!!start && !!end) {
      this.target[this.property] = this.transformValue(this.interpolate(progress, start, end));
      return;
    }
    if (start) {
      this.target[this.property] = this.transformValue(start.value);
    }
    if (end) {
      this.target[this.property] = this.transformValue(end.value);
    }
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
}

export function createAnimationForPropertyType (propType, targetMorph, property) {
  switch (propType) {
    case 'point':
      // extent and position need to be scalable with the interactive thus we use relative values
      return new PointAnimation(targetMorph, property, ['extent', 'position'].includes(property));
    case 'color':
      return new ColorAnimation(targetMorph, property);
    case 'number':
      return new NumberAnimation(targetMorph, property);
  }
  $world.setStatusMessage('Could not match property type');
}
export class Keyframe {
  constructor (position, value, spec = { name: 'aKeyframe', easing: 'linear' }) {
    const { name, easing } = spec;
    this.position = position;
    this.value = value;
    this.name = name;
    this.setEasing(easing);
  }

  setEasing (easing = 'linear') {
    this.easing = stringToEasing(easings[easing]);
  }

  static possibleEasings () {
    return Object.keys(easings);
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

  transformRelativeValue (value) {
    return pt(value.x * this.sequence.width, value.y * this.sequence.height);
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

// TODO: Add String, Number
