/* global it, describe */
import { expect } from 'mocha-es6';
import { Settings } from '../editor.js';

describe('Settings', () => {
  it('parses fractions and numbers in correct formats', () => {
    expect(Settings.matchNumberOrFraction('3')).to.be.equal(3);
    expect(Settings.matchNumberOrFraction('4/3')).to.be.equal(4 / 3);
    expect(Settings.matchNumberOrFraction('3.5')).to.be.equal(3.5);
    expect(Settings.matchNumberOrFraction('3123.123')).to.be.equal(3123.123);
    expect(Settings.matchNumberOrFraction('3123/123')).to.be.equal(3123 / 123);
  });

  it('parses fractions and numbers in incorrect formats', () => {
    expect(Settings.matchNumberOrFraction('123/456.789')).to.be.null;
    expect(Settings.matchNumberOrFraction('123.456/789')).to.be.null;
    expect(Settings.matchNumberOrFraction('3.')).to.be.null;
    expect(Settings.matchNumberOrFraction('3/')).to.be.null;
    expect(Settings.matchNumberOrFraction('[3/4]')).to.be.null;
    expect(Settings.matchNumberOrFraction('[3/')).to.be.null;
    expect(Settings.matchNumberOrFraction('{3/}')).to.be.null;
  });
});
