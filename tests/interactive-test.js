/* global it, describe, beforeEach */
import { expect } from 'mocha-es6';
import { Interactive, Layer, Sequence } from 'qinoq';
import { pt } from 'lively.graphics';

describe('Interactive object', () => {
  let interactive;
  let sequenceOne, sequenceTwo;
  let foreground, background;

  beforeEach(() => {
    interactive = new Interactive();
    interactive.initialize(pt(10, 10), 20);

    sequenceOne = new Sequence();
    sequenceTwo = new Sequence();
    sequenceOne.initialize(0, 10);
    sequenceTwo.initialize(8, 10);

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
});
