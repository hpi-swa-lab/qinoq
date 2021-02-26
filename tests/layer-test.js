/* global it, describe, beforeEach */
import { expect } from 'mocha-es6';
import { Layer } from 'interactives-editor';

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
