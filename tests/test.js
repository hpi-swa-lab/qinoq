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
  it('is equal to itself', () => {
    const layer = new Layer();
    expect(layer.equals(layer)).to.be.true;
  });
  it('is not equal to another layer', () => {
    const layer = new Layer();
    const anotherLayer = new Layer();
    expect(layer.equals(anotherLayer)).to.be.false;
  });
});

describe('Interactive object', () => {
  let interactive;
  beforeEach(() => {
    interactive = new Interactive();
  });
  it('is an interactive', () => {
    expect(interactive.isInteractive).to.be.true;
  });
  it('correctly sorts sequences after their layer indizes', () => {
    interactive.initialize(pt(10, 10), 20);
    const sequenceOne = new Sequence();
    const sequenceTwo = new Sequence();
    sequenceOne.initialize(0, 10);
    sequenceTwo.initialize(10, 10);
    const foreground = new Layer();
    foreground.zIndex = 0;
    sequenceOne.layer = foreground;
    const background = new Layer();
    background.zIndex = 10;
    sequenceTwo.layer = background;

    interactive.addLayer(foreground);
    interactive.addLayer(background);

    interactive.addSequence(sequenceOne);
    interactive.addSequence(sequenceTwo);

    expect(interactive.sequences).equals([sequenceOne, sequenceTwo]);

    foreground.zIndex = 11;
    expect(interactive.sequences).equals([sequenceTwo, sequenceOne]);
  });
});
