/* global it, describe, beforeEach, afterEach */
import { expect } from 'mocha-es6';
import { Interactive, Layer, Sequence } from '../index.js';
import { pt } from 'lively.graphics';
import { NumberAnimation } from '../index.js';
import { Keyframe } from '../index.js';
import { Morph, Text } from 'lively.morphic';
import { serialize, deserialize } from 'lively.serializer2';

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

  it('cannot be zoomed', () => {
    interactive.openInWorld();
    const originalExtent = interactive.extent;
    const event = {
      domEvt: {
        deltaY: 10,
        ctrlKey: true
      }
    };
    interactive.scrollOverlay.onMouseWheel(event);
    expect(interactive.extent).to.be.equal(originalExtent);
  });

  it('is an interactive', () => {
    expect(interactive.isInteractive).to.be.true;
  });

  it('correctly sorts sequences after their layer indices', () => {
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

  it('can get sequence starts and ends', () => {
    let sequenceThree = new Sequence({ start: 10, duration: 5 });
    interactive.addSequence(sequenceThree);

    // | - - - sequenceOne - - - - 10|
    //                          |8 - - - sequenceTwo - - - - - 18 |
    //                               |10 sequenceThree 15|

    expect(interactive.getNextSequenceStartOrEnd(0)).to.equal(8);
    expect(interactive.getNextSequenceStartOrEnd(5)).to.equal(8);
    expect(interactive.getNextSequenceStartOrEnd(8)).to.equal(10);
    expect(interactive.getNextSequenceStartOrEnd(10)).to.equal(15);
    expect(interactive.getNextSequenceStartOrEnd(15)).to.equal(18);
    expect(interactive.getNextSequenceStartOrEnd(18)).to.be.undefined;

    expect(interactive.getPrevSequenceStartOrEnd(20)).to.equal(18);
    expect(interactive.getPrevSequenceStartOrEnd(18)).to.equal(15);
    expect(interactive.getPrevSequenceStartOrEnd(15)).to.equal(10);
    expect(interactive.getPrevSequenceStartOrEnd(10)).to.equal(8);
    expect(interactive.getPrevSequenceStartOrEnd(5)).to.equal(0);
    expect(interactive.getPrevSequenceStartOrEnd(0)).to.be.undefined;
  });

  describe('with morph notifications', () => {
    let morph;
    let sequenceEnterCount;
    let sequenceLeaveCount;
    beforeEach(() => {
      morph = new Morph();
      sequenceTwo.addMorph(morph);

      sequenceEnterCount = 0;
      sequenceLeaveCount = 0;

      morph.onSequenceEnter = () => sequenceEnterCount++;
      morph.onSequenceLeave = () => sequenceLeaveCount++;
    });

    it('notifies morphs when they enter the interactive', () => {
      interactive.scrollPosition = 0;
      interactive.redraw();
      expect(sequenceEnterCount).to.be.equal(0);
      interactive.scrollPosition = 5;
      expect(sequenceEnterCount).to.be.equal(0);
      interactive.scrollPosition = 9;
      expect(sequenceEnterCount).to.be.equal(1);
      interactive.scrollPosition = 5;
      expect(sequenceEnterCount).to.be.equal(1);
      interactive.scrollPosition = 9;
      expect(sequenceEnterCount).to.be.equal(2);
    });

    it('notifies morphs when they leave the interactive', () => {
      interactive.scrollPosition = 0;
      interactive.redraw();
      expect(sequenceLeaveCount).to.be.equal(0);
      interactive.scrollPosition = 5;
      expect(sequenceLeaveCount).to.be.equal(0);
      interactive.scrollPosition = 9;
      expect(sequenceLeaveCount).to.be.equal(0);
      interactive.scrollPosition = 5;
      expect(sequenceLeaveCount).to.be.equal(1);
      interactive.scrollPosition = 9;
      expect(sequenceLeaveCount).to.be.equal(1);
      interactive.scrollPosition = 5;
      expect(sequenceLeaveCount).to.be.equal(2);
    });

    it('notifies morphs with current scroll position', () => {
      interactive.scrollPosition = 0;
      interactive.redraw();
      let morphScrollPosition;
      morph.onInteractiveScrollChange = (value) => morphScrollPosition = value;
      interactive.scrollPosition = 1;
      expect(morphScrollPosition).to.be.equal(1);
      interactive.scrollPosition = 5;
      expect(morphScrollPosition).to.be.equal(5);
      interactive.scrollPosition = 9;
      expect(morphScrollPosition).to.be.equal(9);
    });

    afterEach(() => {
      morph.abandon();
    });
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
      deserialize(serialize(interactive));
    });
  });

  describe('resizing', () => {
    let morph;
    beforeEach(() => {
      morph = new Text({ extent: pt(20, 20), name: 'text morph' });
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

    it('scales text depending on own height', () => {
      const initialInteractiveHeight = interactive.height;
      const initialFontSize = morph.fontSize;
      interactive.height = interactive.height * 3;
      expect(morph.fontSize > initialFontSize).to.be.true;
      interactive.height = initialInteractiveHeight;
      expect(morph.fontSize).to.be.equal(initialFontSize);
    });

    it('does not change text sizes when saved and loaded', () => {
      // this assumes that the DeserializationAwareMorph works as expected
      // just calling deserialize(serialize(interactive)) did not achieve the same behavior as reloading the world in the browser
      interactive.height = interactive.height * 3;
      const initialFontSize = morph.fontSize;
      interactive._deserializing = true;
      interactive.height = interactive.height / 3;
      expect(interactive.get('text morph').fontSize).to.be.equal(initialFontSize);
    });
  });

  afterEach(() => {
    interactive.abandon();
  });
});
