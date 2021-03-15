/* global it, describe, beforeEach */
import { expect } from 'mocha-es6';
import { Sequence, Interactive, Layer } from 'interactives-editor';
import { Morph } from 'lively.morphic';
import { Keyframe, NumberAnimation } from '../animations.js';
import { clone } from 'lively.lang/object.js';
import { pt } from 'lively.graphics';

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

  describe('Animations', () => {
    let morph, opacityAnimation, keyframe;

    beforeEach(() => {
      morph = new Morph();
      sequence.addMorph(morph);
      opacityAnimation = new NumberAnimation(morph, 'opacity');
      keyframe = new Keyframe(0, 1);
      opacityAnimation.addKeyframe(keyframe);
    });

    it('return an animation for a morph for a property', () => {
      expect(sequence.getAnimationForMorphProperty(morph, 'opacity')).to.be.undefined;
      sequence.addAnimation(opacityAnimation);
      expect(sequence.getAnimationForMorphProperty(morph, 'opacity')).to.deep.equal(opacityAnimation);
    });

    it('adds a new keyframe to an existing animation', () => {
      sequence.addAnimation(opacityAnimation);
      const newKeyframe = new Keyframe(0.8, 0.8);
      sequence.addKeyframeForMorph(newKeyframe, morph, 'opacity', 'number');
      expect(sequence.getAnimationsForMorph(morph)).to.have.length(1);
    });

    it('adds a new keyframe to a new animation', () => {
      sequence.addAnimation(opacityAnimation);
      const newKeyframe = new Keyframe(0.8, 0.8);
      sequence.addKeyframeForMorph(newKeyframe, morph, 'rotation', 'number');
      expect(sequence.getAnimationsForMorph(morph)).to.have.length(2);
    });

    it('removes an animation when the last keyframe is deleted', () => {
      sequence.addAnimation(opacityAnimation);
      opacityAnimation.removeKeyframe(keyframe);
      expect(sequence.getAnimationsForMorph(morph)).to.have.length(0);
    });

    it('can get keyframe positions across animations', () => {
      opacityAnimation.addKeyframes([new Keyframe(0.5, 0.8), new Keyframe(0.8, 0.5)]);
      sequence.addAnimation(opacityAnimation);
      const morph2 = new Morph();
      sequence.addMorph(morph);
      const grayscaleAnimation = new NumberAnimation(morph2, 'grayscale');
      grayscaleAnimation.addKeyframes([new Keyframe(0.1, 1), new Keyframe(0.7, 0.3)]);
      sequence.addAnimation(grayscaleAnimation);

      expect(sequence.getNextKeyframePosition(1.5)).to.be.undefined;
      expect(sequence.getNextKeyframePosition(0.75)).to.equal(0.8);
      expect(sequence.getNextKeyframePosition(0.5)).to.be.equal(0.7);
      expect(sequence.getPrevKeyframePosition(0.5)).to.be.equal(0.1);
    });
  });

  describe('in interactive', () => {
    let interactive;
    let anotherSequence;
    let mainLayer;

    beforeEach(() => {
      interactive = new Interactive();
      interactive.initialize(pt(100, 50), 500);

      mainLayer = sequence.layer;
      interactive.addLayer(mainLayer);
      interactive.addSequence(sequence);

      anotherSequence = new Sequence();
      anotherSequence.initialize(50, 100);
      anotherSequence.layer = mainLayer;
      interactive.addSequence(anotherSequence);
    });

    it('has interactive saved', () => {
      expect(sequence.interactive === interactive).to.be.ok;
    });

    it('interactive can get sequences in layer between values', () => {
      expect(interactive.getSequencesInLayerBetween(mainLayer, 0, 20)).to.have.length(1);
      expect(interactive.getSequencesInLayerBetween(mainLayer, 20, 30)).to.have.length(0);
      expect(interactive.getSequencesInLayerBetween(mainLayer, 0, 60)).to.have.length(2);
    });

    it('interactive can get sequences in layer after position', () => {
      expect(interactive.getSequenceInLayerAfter(sequence)).to.deep.equal(anotherSequence);
      expect(interactive.getSequenceInLayerAfter(anotherSequence)).to.be.undefined;
    });

    it('can determine valid starts', () => {
      expect(interactive.validSequenceStart(sequence, undefined)).to.not.be.ok;
      expect(interactive.validSequenceStart(sequence, 0)).to.be.ok;
      expect(interactive.validSequenceStart(sequence, 45)).to.not.be.ok; // Would intersect with anotherSequence
      expect(interactive.validSequenceStart(sequence, -1)).to.not.be.ok;
    });

    it('can determine valid durations', () => {
      expect(interactive.validSequenceDuration(sequence, NaN)).to.not.be.ok;
      expect(interactive.validSequenceDuration(sequence, 10)).to.be.ok;
      expect(interactive.validSequenceDuration(sequence, 70)).to.not.be.ok; // Would intersect with anotherSequence
      expect(interactive.validSequenceDuration(sequence, -1)).to.not.be.ok;
    });
  });
});
