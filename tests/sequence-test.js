import { expect } from 'mocha-es6';
import { Sequence, Layer } from 'interactives-editor';

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
