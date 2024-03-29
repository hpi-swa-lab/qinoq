/* global it, describe, beforeEach */
import { expect } from 'mocha-es6';
import { Sequence, Interactive, Layer } from '../index.js';
import { Morph } from 'lively.morphic';
import { Keyframe, NumberAnimation } from '../animations.js';
import { pt } from 'lively.graphics';

describe('Sequence object', () => {
  // TODO: test focusedEffect and its setting logic

  let sequence;
  const start = 0;
  const duration = 10;

  beforeEach(function () {
    sequence = new Sequence({ name: 'test sequence', start, duration });
    sequence.layer = new Layer();
  });

  it('returns the end value', () => {
    expect(sequence.end).equals(start + duration);
  });

  it('calculates the progress', () => {
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
    sequence.updateProgress(15);
    expect(sequence.isDisplayed()).to.be.false;
    sequence.layer.hidden = true;
    sequence.updateProgress(0);
    expect(sequence.isDisplayed()).to.be.false;
  });

  it('is never displayed when hidden', () => {
    sequence.isHidden = true;
    sequence.updateProgress(0);
    expect(sequence.isDisplayed()).to.be.false;
    sequence.updateProgress(10);
    expect(sequence.isDisplayed()).to.be.false;
  });

  describe('with animations', () => {
    let morph, opacityAnimation, keyframe;

    beforeEach(() => {
      morph = new Morph();
      sequence.addMorph(morph);
      opacityAnimation = new NumberAnimation(morph, 'opacity');
      keyframe = new Keyframe(0, 1);
      opacityAnimation.addKeyframe(keyframe);
    });

    it('can calculate the absolute position for a keyframe', () => {
      expect(sequence.getAbsolutePositionFor(keyframe)).to.equal(0);
    });

    it('can calculate the relative position for a scrollPosition', () => {
      expect(sequence.getRelativePositionFor(0)).to.equal(0);
      expect(sequence.getRelativePositionFor(5)).to.equal(0.5);
      expect(sequence.getRelativePositionFor(10)).to.equal(1);
      expect(sequence.getRelativePositionFor(20)).to.equal(2);
      sequence.start = 5;
      expect(sequence.getRelativePositionFor(0)).to.equal(-0.5);
    });

    it('return an animation for a morph for a property', () => {
      expect(sequence.getAnimationForMorphProperty(morph, 'opacity')).to.be.undefined;
      sequence.addAnimation(opacityAnimation);
      expect(sequence.getAnimationForMorphProperty(morph, 'opacity')).to.deep.equal(opacityAnimation);
    });

    describe('the addKeyframeForMorph method', () => {
      it('adds a new keyframe to a new animation', async () => {
        sequence.addAnimation(opacityAnimation);
        const newKeyframe = new Keyframe(0.8, 0.8);
        await sequence.addKeyframeForMorph(newKeyframe, morph, 'rotation', 'number');
        expect(sequence.getAnimationsForMorph(morph)).to.have.length(2);
      });

      it('adds a new keyframe to an existing animation', async () => {
        sequence.addAnimation(opacityAnimation);
        const newKeyframe = new Keyframe(0.8, 0.8);
        await sequence.addKeyframeForMorph(newKeyframe, morph, 'opacity', 'number');
        expect(sequence.getAnimationsForMorph(morph)).to.have.length(1);
      });

      it('overwrites a keyframe with new data', async () => {
        sequence.addAnimation(opacityAnimation);
        const newKeyframe = new Keyframe(0, 0.8);
        await sequence.addKeyframeForMorph(newKeyframe, morph, 'opacity', 'number');
        expect(sequence.animations[0].keyframes).to.have.length(1);
        expect(sequence.animations[0].keyframes[0]).to.be.equal(keyframe);
        expect(keyframe.value).to.be.equal(newKeyframe.value);
      });

      it('does not transform a keyframe if not specified', async () => {
        const newKeyframe = new Keyframe(0, pt(100, 100));
        await sequence.addKeyframeForMorph(newKeyframe, morph, 'position', 'point');
        expect(newKeyframe.value).to.be.equal(pt(100, 100));
      });

      it('transforms a keyframe if parameter is set', async () => {
        const newKeyframe = new Keyframe(0, pt(100, 100));
        await sequence.addKeyframeForMorph(newKeyframe, morph, 'position', 'point', true);
        expect(newKeyframe.value).to.be.equal(pt(100 / sequence.width, 100 / sequence.height));
      });

      it('transforms a keyframe while overwriting if parameter is set', async () => {
        const newKeyframe = new Keyframe(0, pt(100, 100));
        await sequence.addKeyframeForMorph(newKeyframe, morph, 'position', 'point', true);
        const anotherKeyframe = new Keyframe(0, pt(200, 200));
        await sequence.addKeyframeForMorph(anotherKeyframe, morph, 'position', 'point', true);
        expect(newKeyframe.value).to.not.be.equal(pt(200 / sequence.width, 200 / sequence.height));
      });
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

      expect(sequence.getNextKeyframePositionForAbsolutePosition(15)).to.be.undefined;
      expect(sequence.getNextKeyframePositionForAbsolutePosition(7.5)).to.be.equal(0.8);
      expect(sequence.getNextKeyframePositionForAbsolutePosition(5)).to.be.equal(0.7);
      expect(sequence.getNextKeyframePositionForAbsolutePosition(0.5)).to.be.equal(0.1);
    });
  });

  describe('in interactive', () => {
    let interactive;
    let anotherSequence;
    let mainLayer;

    beforeEach(() => {
      interactive = new Interactive();

      mainLayer = sequence.layer;
      interactive.addLayer(mainLayer);
      interactive.addSequence(sequence);

      anotherSequence = new Sequence({ start: 50, duration: 100 });
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
