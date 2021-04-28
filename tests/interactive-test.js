/* global it, describe, beforeEach, afterEach */
import { expect } from 'mocha-es6';
import { Interactive, Layer, Sequence } from '../index.js';
import { pt } from 'lively.graphics';
import { NumberAnimation } from '../index.js';
import { Keyframe } from '../index.js';
import { Morph } from 'lively.morphic';
import { serialize } from 'lively.serializer2';

describe('Interactive', () => {
  let interactive;
  let sequenceOne, sequenceTwo;
  let foreground, background;

  beforeEach(() => {
    interactive = new Interactive({ extent: pt(100, 100) });

    sequenceOne = new Sequence({ start: 0, duration: 10 });
    sequenceTwo = new Sequence({ start: 8, duration: 10 });

    background = new Layer();
    background.zIndex = 0;
    sequenceOne.layer = background;
    foreground = new Layer();
    foreground.zIndex = 10;
    sequenceTwo.layer = foreground;

    interactive.addLayer(foreground);
    interactive.addLayer(background);

    interactive.addSequence(sequenceOne);
    interactive.addSequence(sequenceTwo);
  });

  it('is an interactive', () => {
    expect(interactive.isInteractive).to.be.true;
  });

  it('correctly sorts sequences after their layer indizes', () => {
    expect(interactive.sequences).equals([sequenceOne, sequenceTwo]);
    background.zIndex = 11;
    expect(interactive.sequences).equals([sequenceTwo, sequenceOne]);
  });

  it('can show only one sequence/all sequences', () => {
    interactive.sequences.forEach(sequence => {
      expect(sequence.focused).to.be.true;
    });

    interactive.showOnly(sequenceTwo);
    expect(interactive.sequences[0].focused).to.be.false;
    expect(interactive.sequences[1].focused).to.be.true;

    interactive.showAllSequences();
    interactive.sequences.forEach(sequence => {
      expect(sequence.focused).to.be.true;
    });
  });

  it('propagates scrollPosition changes', () => {
    interactive.scrollPosition = 5;
    expect(sequenceOne.progress).equals(0.5);
    expect(interactive.submorphs.length).equals(1);
    interactive.scrollPosition = 8;
    expect(interactive.submorphs.length).equals(2);
  });

  it('can get sequence starts', () => {
    expect(interactive.getNextSequenceStart(5)).to.equal(8);
    expect(interactive.getPrevSequenceStart(5)).to.equal(0);
  });

  describe('with animations', () => {
    let animation1;
    let animation2;
    let morph;

    let keyframeA, keyframeB, keyframeC;
    let keyframeD, keyframeE;

    beforeEach(() => {
      morph = new Morph();

      animation1 = new NumberAnimation(morph, 'opacity');
      animation2 = new NumberAnimation(morph, 'grayscale');
      keyframeA = new Keyframe(0, 0, { name: 'keyframeA' });
      keyframeB = new Keyframe(0.5, 0.5, { name: 'keyframeB' });
      keyframeC = new Keyframe(1, 1, { name: 'keyframeC' });
      keyframeD = new Keyframe(0, 0, { name: 'keyframeD' });
      keyframeE = new Keyframe(1, 1, { name: 'keyframeE' });

      animation1.addKeyframes([keyframeA, keyframeB, keyframeC]);
      animation2.addKeyframes([keyframeD, keyframeE]);

      sequenceOne.addAnimation(animation1);
      sequenceOne.addAnimation(animation2);

      sequenceOne.addMorph(morph);
    });

    it('can find a keyframe', () => {
      expect(interactive.findKeyframe(keyframeA).sequence).to.be.equal(sequenceOne);
      expect(interactive.findKeyframe(keyframeB).animation).to.be.equal(animation1);
      expect(interactive.findKeyframe(keyframeD).animation).to.be.equal(animation2);
      expect(interactive.findKeyframe(new Keyframe(2, 2))).to.be.undefined;
    });

    it('automatically names new keyframes', () => {
      const newKeyframe1 = new Keyframe(0.3, 0.7);
      const newKeyframe2 = new Keyframe(0.4, 0.5);

      expect(newKeyframe1.hasDefaultName()).to.be.ok;

      animation2.addKeyframes([newKeyframe1, newKeyframe2]);

      expect(newKeyframe1.hasDefaultName()).to.not.be.ok;
      expect(newKeyframe1.name).to.not.be.equal(newKeyframe2.name);
    });
  });

  describe('serialization', () => {
    it('can be serialized', () => {
      serialize(interactive);
    });
  });

  describe('resizing', () => {
    let morph;
    beforeEach(() => {
      morph = new Morph({ extent: pt(20, 20) });
      sequenceOne.addMorph(morph);
      interactive.redraw();
      interactive.openInWorld(); // Layouting is only applied when the interactive is open
    });

    it('resizes sequences', () => {
      interactive.height = 200;
      expect(sequenceOne.height).to.be.equal(interactive.height);
      interactive.height = 300;
      expect(sequenceOne.height).to.be.equal(interactive.height);
    });

    it('resizes morphs', async () => {
      const initialMorphHeight = morph.height;
      interactive.height = interactive.height * 3;
      await new Promise(r => setTimeout(r, 5)); // Application of layout takes some time
      expect(morph.height).to.be.equal(initialMorphHeight * 3);
    });

    it('resizes with fixed aspect ratio', () => {
      const initialInteractiveWidth = interactive.width;
      interactive.height = interactive.height * 3;
      expect(interactive.width).to.be.equal(initialInteractiveWidth * 3);
    });

    it('does not resize with fixed aspect ratio when disabled', () => {
      interactive.fixedAspectRatio = null;
      const initialInteractiveWidth = interactive.width;
      interactive.height = interactive.height * 3;
      expect(interactive.width).to.not.be.equal(initialInteractiveWidth * 3);
    });
  });

  afterEach(() => {
    interactive.abandon();
  });
});
