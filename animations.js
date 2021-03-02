import { pt } from 'lively.graphics';
import { arr } from 'lively.lang';
class Animation {
  constructor (targetMorph, property) {
    this.target = targetMorph;
    this.property = property;
    this.keyframes = [];
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

  // Linear Interpolation
  set progress (progress) {
    const { start, end } = this.getClosestKeyframes(progress);
    if (!!start && !!end) {
      this.target[this.property] = this.interpolate(progress, start, end);
      return;
    }
    if (start) {
      this.target[this.property] = start.value;
    }
    if (end) {
      this.target[this.property] = end.value;
    }
  }

  // Linear Interpolation helper
  lerp (start, end, t) {
    return (t - start.position) / (end.position - start.position);
  }

  interpolate (progress, start, end) {
    // Subclass responsibility
    // Each animation type implements an interpolate type that interpolates the corresponding type
    throw new Error('Subclass responsibility');
  }
}

export function createAnimationForPropertyType (propType, targetMorph, property) {
  switch (propType) {
    case 'point':
      return new PointAnimation(targetMorph, property);
    case 'color':
      return new ColorAnimation(targetMorph, property);
    case 'number':
      return new NumberAnimation(targetMorph, property);
  }
  $world.setStatusMessage('Could not match property type');
}
export class Keyframe {
  constructor (position, value) {
    this.position = position;
    this.value = value;
  }
}

export class NumberAnimation extends Animation {
  interpolate (progress, end, start) {
    const factor = this.lerp(start, end, progress);
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

  interpolate (progress, end, start) {
    const factor = this.lerp(start, end, progress);
    return pt(start.value.x + (end.value.x - start.value.x) * factor,
      start.value.y + (end.value.y - start.value.y) * factor);
  }

  get type () {
    return 'point';
  }
}

export class ColorAnimation extends Animation {
  interpolate (progress, end, start) {
    const factor = this.lerp(start, end, progress);
    return start.value.interpolate(factor, end.value);
  }

  get type () {
    return 'color';
  }
}

// To add String, Number
