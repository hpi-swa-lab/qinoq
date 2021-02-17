import { pt } from 'lively.graphics';
class Animation {
  constructor (targetMorph, property) {
    this.target = targetMorph;
    this.property = property;
    this.keyframes = [];
  }

  addKeyframe (keyframe) {
    this.keyframes.push(keyframe);
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

  // LERP
  linearInterpolation (progress, start, end) {
    return (progress - start.position) / (end.position - start.position);
  }

  set progress (progress) {
    // Do some math (subclass responsibility)
  }
}

export class Keyframe {
  constructor (position, value) {
    this.position = position;
    this.value = value;
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

  constructor (targetMorph, property, interpolation = this.linearInterpolation) {
    super(targetMorph, property);
    this.interpolation = interpolation;
  }

  set progress (progress) {
    const { start, end } = this.getClosestKeyframes(progress);
    if (start && end) {
      const factor = this.interpolation(progress, start, end);
      const value = pt(start.value.x + (end.value.x - start.value.x) * factor,
        start.value.y + (end.value.y - start.value.y) * factor);
      this.target[this.property] = value;
      return;
    }
    if (start) {
      this.target[this.property] = start.value;
    }
    if (end) {
      this.target[this.property] = end.value;
    }
  }
}
