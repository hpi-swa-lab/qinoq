/* global it, describe, beforeEach */
import { expect } from 'mocha-es6';
import { Sequence, Layer } from 'interactives-editor';
import { Morph } from 'lively.morphic';
import { Keyframe, NumberAnimation } from '../animations.js';
import { clone } from 'lively.lang/object.js';

describe('Sequence object', () => {
  // TODO: test functions regarding animations
  // TODO: test focusedEffect and its setting logic

  let sequence;
  const start = 0;
  const duration = 10;

  beforeEach(function () {
    sequence = new Sequence({ name: 'test sequence' });
    sequence.initialize(start, duration);
    sequence.layer = new Layer();
  });

  it('returns the end value', () => {
    expect(sequence.end).equals(start + duration);
  });

  it('calculates the progres', () => {
    expect(sequence.progress).equals(0);
    sequence.updateProgress(5);
    expect(sequence.progress).equals(0.5);
    sequence.updateProgress(10);
    expect(sequence.progress).equals(1);
  });

  it('decides to be displayed', () => {
    sequence.updateProgress(0);
    expect(sequence.isDisplayed()).to.be.true;
    sequence.updateProgress(10);
    expect(sequence.isDisplayed()).to.be.false;
    sequence.layer.hidden = true;
    sequence.updateProgress(0);
    expect(sequence.isDisplayed()).to.be.false;
  });

  it('return an animation for a morph for a property', () => {
    const morph = new Morph();
    sequence.addMorph(morph);
    const opacityAnimation = new NumberAnimation(morph, 'opacity');
    const keyFrame = new Keyframe(0, 1);
    opacityAnimation.addKeyframe(keyFrame);
    expect(sequence.getAnimationForMorphProperty(morph, 'opacity')).to.be.undefined;
    sequence.addAnimation(opacityAnimation);
    expect(sequence.getAnimationForMorphProperty(morph, 'opacity')).to.deep.equal(opacityAnimation);
  });

  it('adds a new keyframe to an existing animation', () => {
    const morph = new Morph();
    sequence.addMorph(morph);
    const opacityAnimation = new NumberAnimation(morph, 'opacity');
    const keyFrame = new Keyframe(0, 1);
    opacityAnimation.addKeyframe(keyFrame);
    sequence.addAnimation(opacityAnimation);
    const newKeyframe = new Keyframe(0.8, 0.8);
    sequence.addKeyframeForMorph(newKeyframe, morph, 'opacity', 'number');
    expect(sequence.getAnimationsForMorph(morph)).to.have.length(1);
  });

  it('adds a new keyframe to a new animation', () => {
    const morph = new Morph();
    sequence.addMorph(morph);
    const opacityAnimation = new NumberAnimation(morph, 'opacity');
    const keyFrame = new Keyframe(0, 1);
    opacityAnimation.addKeyframe(keyFrame);
    sequence.addAnimation(opacityAnimation);
    const newKeyframe = new Keyframe(0.8, 0.8);
    sequence.addKeyframeForMorph(newKeyframe, morph, 'rotation', 'number');
    expect(sequence.getAnimationsForMorph(morph)).to.have.length(2);
  });
});
