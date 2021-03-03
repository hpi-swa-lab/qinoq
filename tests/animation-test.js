/* global it, describe, beforeEach */
import { expect } from 'mocha-es6';
import { Morph } from 'lively.morphic';
import { NumberAnimation, Keyframe } from '../animations.js';

// TODO:
// PointAnimation concrete implementation
// ColorAnimation concrete implementation (?)

describe('Animation object', () => {
  let animation, targetMorph, keyFrameOne, keyFrameTwo;

  const addKeyFrames = function () {
    keyFrameOne = new Keyframe(0, 1);
    keyFrameTwo = new Keyframe(10, 0);
    animation.addKeyframes([keyFrameOne, keyFrameTwo]);
  };

  beforeEach(() => {
    targetMorph = new Morph();
    animation = new NumberAnimation(targetMorph, 'opacity');
  });

  it('holds keyframes in correct order', () => {
    addKeyFrames();
    expect(animation.keyframes).equals([keyFrameOne, keyFrameTwo]);
  });

  it('respects not sorting when adding a new keyframe', () => {
    addKeyFrames();
    const newKeyframe = new Keyframe(5, 0.5);
    animation.addKeyframe(newKeyframe, true);
    expect(animation.keyframes[2]).equals(newKeyframe);
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
    expect(animation.lerp(keyFrameOne, keyFrameTwo, 0)).equals(0);
    expect(animation.lerp(keyFrameOne, keyFrameTwo, 5)).equals(0.5);
    expect(animation.lerp(keyFrameOne, keyFrameTwo, 10)).equals(1);
  });
});
