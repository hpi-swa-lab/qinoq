/* global it, describe, beforeEach */
import { expect } from 'mocha-es6';
import { Layer, Interactive } from 'qinoq';

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

  it('hides sequences when hidden', async () => {
    const interactive = await Interactive.base();
    const sequenceInInteractive = interactive.sequences[0];
    const layerInInteractive = sequenceInInteractive.layer;
    expect(interactive.layers).to.include(layerInInteractive);
    expect(sequenceInInteractive.isDisplayed()).to.be.ok;
    layerInInteractive.hidden = true;
    expect(sequenceInInteractive.isDisplayed()).to.not.be.ok;
  });
});
