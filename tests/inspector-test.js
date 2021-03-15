/* global it, describe, before, after */
import { expect } from 'mocha-es6';
import { Morph } from 'lively.morphic';
import { Interactive, InteractivesEditor } from 'interactives-editor';

class InspectorTestMorph extends Morph {
  static get properties () {
    return {
      testProp: {
        animateAs: 'number',
        defaultValue: 0
      },
      testProp2: {

      }
    };
  }
}

describe('Inspector', () => {
  let morph, editor, interactive, inspector;
  before(async () => {
    editor = await new InteractivesEditor().initialize();
    interactive = Interactive.example();
    editor.interactive = interactive;
    morph = new InspectorTestMorph();
    inspector = editor.inspector;
    interactive.sequences[0].addMorph(morph);
    inspector.targetMorph = morph;
  });

  it('can animate a predefined property', () => {
    expect('opacity' in inspector.propertiesToDisplay).to.be.ok;
  });

  it('can animate a property defined as animateAs', () => {
    expect('testProp' in inspector.propertiesToDisplay).to.be.ok;
    expect(inspector.propertiesToDisplay.testProp).to.equal('number');
  });

  it('can not animate a new property not defined as animateAs', () => {
    expect('testProp2' in inspector.propertiesToDisplay).to.not.be.ok;
  });

  after(() => {
    editor.owner.remove();
  });
});
