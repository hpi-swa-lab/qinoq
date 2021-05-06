/* global it, describe, before */
import { expect } from 'mocha-es6';
import { Clipboard } from '../utilities/clipboard.js';

describe('Clipboard', () => {
  let clipboard;
  before(() => {
    clipboard = new Clipboard();
  });

  it('holds a morph with animations for multiple accesses', () => {
    const morph = 'Morph';
    const animations = 'Animations';
    clipboard.addMorph(morph, animations);
    expect(clipboard.content).to.be.deep.equal({ morph, animations });
    expect(clipboard.content).to.be.deep.equal({ morph, animations });
  });

  it('says it holds a morph', () => {
    const morph = 'Morph';
    const animations = 'Animations';
    clipboard.addMorph(morph, animations);
    expect(clipboard.containsMorph).to.be.ok;
    clipboard.clear();
    expect(clipboard.containsMorph).to.not.be.ok;
  });

  it('can be cleared', () => {
    const morph = 'Morph';
    const animations = 'Animations';
    clipboard.addMorph(morph, animations);
    clipboard.clear();
    expect(clipboard.content).to.be.equal(null);
  });
});
