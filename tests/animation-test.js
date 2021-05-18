/* global it, describe, beforeEach */
import { expect } from 'mocha-es6';
import { Morph } from 'lively.morphic';
import { NumberAnimation, TypewriterAnimation, Keyframe } from '../animations.js';

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

describe('Typewriter animation', () => {
  let stringAnimation;
  const string1 = 'Hello';
  const string2 = 'Hello World';
  const string3 = 'Something else';
  let mockMorph;
  beforeEach(() => {
    mockMorph = {
      textString: 'Something'
    };
    stringAnimation = new TypewriterAnimation(mockMorph, 'textString');
  });

  it('interpolates between strings forward', () => {
    const keyframe1 = new Keyframe(0, string1, { name: 'Keyframe 1' });
    const keyframe2 = new Keyframe(1, string2, { name: 'Keyframe 2' });
    stringAnimation.addKeyframes([keyframe1, keyframe2]);
    stringAnimation.progress = 0;
    expect(mockMorph.textString).to.be.equal('Hello');
    stringAnimation.progress = 0.5;
    expect(mockMorph.textString).to.be.equal('Hello Wo');
    stringAnimation.progress = 1;
    expect(mockMorph.textString).to.be.equal('Hello World');
  });

  it('interpolates between strings in reverse', () => {
    const keyframe1 = new Keyframe(0, string2, { name: 'Keyframe 1' });
    const keyframe2 = new Keyframe(1, string1, { name: 'Keyframe 2' });
    stringAnimation.addKeyframes([keyframe1, keyframe2]);
    stringAnimation.progress = 1;
    expect(mockMorph.textString).to.be.equal('Hello');
    stringAnimation.progress = 0.5;
    expect(mockMorph.textString).to.be.equal('Hello Wo');
    stringAnimation.progress = 0;
    expect(mockMorph.textString).to.be.equal('Hello World');
  });

  it('can not interpolate between strings with no matching starts or ends', () => {
    const keyframe1 = new Keyframe(0.1, string1, { name: 'Keyframe 1' });
    const keyframe2 = new Keyframe(0.9, string3, { name: 'Keyframe 2' });
    stringAnimation.addKeyframes([keyframe1, keyframe2]);
    stringAnimation.progress = 0;
    expect(mockMorph.textString).to.be.equal(string1);
    stringAnimation.progress = 0.5;
    expect(mockMorph.textString).to.be.equal(string1);
    stringAnimation.progress = 1;
    expect(mockMorph.textString).to.be.equal(string3);
  });
});
