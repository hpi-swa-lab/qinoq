/* global it, describe, beforeEach, afterEach */
import { expect } from 'mocha-es6';
import { Morph } from 'lively.morphic';
import { exampleInteractive, InteractivesEditor } from 'qinoq';
import { COLOR_SCHEME } from '../colors.js';

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
  beforeEach(async () => {
    editor = await new InteractivesEditor().initialize();
    interactive = await exampleInteractive();
    editor.interactive = interactive;
    morph = new InspectorTestMorph();
    inspector = editor.ui.inspector;
    interactive.sequences[0].addMorph(morph);
    inspector.targetMorph = morph;
  });

  it('can animate a predefined property', () => {
    expect('opacity' in inspector.ui.animationsInspector.propertiesToDisplay).to.be.ok;
  });

  it('can animate a property defined as animateAs', () => {
    expect('testProp' in inspector.ui.animationsInspector.propertiesToDisplay).to.be.ok;
    expect(inspector.ui.animationsInspector.propertiesToDisplay.testProp).to.equal('number');
  });

  it('can not animate a new property not defined as animateAs', () => {
    expect('testProp2' in inspector.ui.animationsInspector.propertiesToDisplay).to.not.be.ok;
  });

  it('targets a morph in the interactive when a halo is shown', async () => {
    const anotherMorph = new Morph({ name: 'morph in interactive' });
    interactive.sequences[0].addMorph(anotherMorph);
    $world.showHaloFor(anotherMorph);

    expect(inspector.targetMorph).to.equal(anotherMorph);

    anotherMorph.abandon();
  });

  it('does not target a morph in another interactive when a halo is shown', async () => {
    const anotherMorph = new Morph({ name: 'morph in interactive' });
    const anotherInteractive = await exampleInteractive();
    anotherInteractive.sequences[0].addMorph(anotherMorph);
    anotherInteractive.openInWorld();
    $world.showHaloFor(anotherMorph);

    expect(inspector.targetMorph).to.not.be.equal(anotherMorph);

    anotherMorph.abandon();
    anotherInteractive.abandon();
  });

  it('does not target a morph outside the interactive when a halo is shown', () => {
    const anotherMorph = new Morph();
    $world.showHaloFor(anotherMorph);

    expect(inspector.targetMorph).to.not.be.equal(anotherMorph);

    anotherMorph.abandon();
  });

  it('sets the targetMorph to null after deselect is called', () => {
    expect(inspector.targetMorph).to.be.ok;
    inspector.deselect();
    expect(inspector.targetMorph).to.be.null;
  });

  it('colors a keyframebutton if a keyframe resides exactly at the scrollposition', async () => {
    const dayBackgroundTimelineSequence = editor.withAllSubmorphsSelect(morph => morph.isTimelineSequence).find(timelineSequence => timelineSequence.sequence.name == 'day background');
    // sets the scrollPosition to the beginning of the day background
    await dayBackgroundTimelineSequence.openSequenceView();
    inspector.targetMorph = dayBackgroundTimelineSequence.sequence.submorphs[0];
    const keyFramebuttonForFill = inspector.animationsInspector.propertyControls.fill.keyframe;
    expect(keyFramebuttonForFill.fill).to.not.be.deep.equal(COLOR_SCHEME.KEYFRAME_FILL);
  });

  it('colors a keyframebutton if a keyframe resides at a position which results in the scrollposition', async () => {
    const dayBackgroundTimelineSequence = editor.withAllSubmorphsSelect(morph => morph.isTimelineSequence).find(timelineSequence => timelineSequence.sequence.name == 'day background');
    const dayBackgroundSequence = dayBackgroundTimelineSequence.sequence;
    // sequence is 250 long, therefore this results in a scrollposition which is not a whole number
    dayBackgroundSequence.animations[0].keyframes[0].position = 0.33;
    // sets the scrollPosition to the beginning of the day background
    await dayBackgroundTimelineSequence.openSequenceView();
    inspector.targetMorph = dayBackgroundSequence.submorphs[0];
    editor.internalScrollChangeWithGUIUpdate(333);
    const keyFramebuttonForFill = inspector.animationsInspector.propertyControls.fill.keyframe;
    expect(keyFramebuttonForFill.fill).to.not.be.deep.equal(COLOR_SCHEME.KEYFRAME_FILL);
  });

  afterEach(() => {
    editor.owner.close();
  });
});
