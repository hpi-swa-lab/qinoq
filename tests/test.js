import { expect } from 'mocha-es6';
import { Sequence, Interactive, Layer } from 'interactives-editor';
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
});
describe('Layer object', () => {
  let layer;
  beforeEach(() => {
    layer = new Layer();
  });

  it('is equal to itself', () => {
    expect(layer.equals(layer)).to.be.true;
  });
  it('is not equal to another layer', () => {
    const anotherLayer = new Layer();
    expect(layer.equals(anotherLayer)).to.be.false;
  });
});

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

    foreground = new Layer();
    foreground.zIndex = 0;
    sequenceOne.layer = foreground;
    background = new Layer();
    background.zIndex = 10;
    sequenceTwo.layer = background;

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
    foreground.zIndex = 11;
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
});
