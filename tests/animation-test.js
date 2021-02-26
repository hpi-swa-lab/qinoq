/* global it, describe, beforeEach */
import { expect } from 'mocha-es6';
import { Morph } from 'lively.morphic';
import { PointAnimation, Keyframe } from '../animations.js';
import { pt } from 'lively.graphics';

// TODO:
// PointAnimation concrete implementation
// ColorAnimation concrete implementation (?)

describe('Animation object', () => {
  let animation, targetMorph, keyFrameOne, keyFrameTwo;

  const addKeyFrames = function () {
    keyFrameOne = new Keyframe(0, 1);
    keyFrameTwo = new Keyframe(10, 0);
    animation.addKeyframe(keyFrameOne);
    animation.addKeyframe(keyFrameTwo);
  };

  beforeEach(() => {
    targetMorph = new Morph();
    animation = new PointAnimation(targetMorph, 'opacity');
  });

  it('holds keyframes in correct order', () => {
    addKeyFrames();
    expect(animation.keyframes).equals([keyFrameOne, keyFrameTwo]);
  });

  it('finds the closest keyframe', () => {
    expect(animation.getClosestKeyframes()).to.be.empty.and.to.be.an('object');
    keyFrameOne = new Keyframe(10, 0);
    animation.addKeyframe(keyFrameOne);
    expect(animation.getClosestKeyframes(9)).to.deep.equal({ end: keyFrameOne });
    expect(animation.getClosestKeyframes(10)).to.deep.equal({ start: keyFrameOne });
    keyFrameTwo = new Keyframe(12, 0);
    animation.addKeyframe(keyFrameTwo);
    expect(animation.getClosestKeyframes(11)).to.deep.equal({ start: keyFrameOne, end: keyFrameTwo });
  });

  it('interpolates linearly', () => {
    addKeyFrames();
    expect(PointAnimation.lerp(0, keyFrameOne, keyFrameTwo)).equals(0);
    expect(PointAnimation.lerp(5, keyFrameOne, keyFrameTwo)).equals(0.5);
    expect(PointAnimation.lerp(10, keyFrameOne, keyFrameTwo)).equals(1);
  });
});
