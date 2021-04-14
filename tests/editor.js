/* global it, describe, before, after */
import { expect } from 'mocha-es6';
import { Interactive, InteractivesEditor } from 'qinoq';

describe('Editor', () => {
  let editor, interactive;
  before(async () => {
    editor = await new InteractivesEditor().initialize();
    interactive = Interactive.example();
    editor.interactive = interactive;
  });

  function timelineSequences () {
    return editor.withAllSubmorphsSelect(morph => morph.isTimelineSequence);
  }

  it('can select all and no sequences', () => {
    editor.simulateKeys('Ctrl-A');
    expect(timelineSequences().every(timelineSequence => timelineSequence.selected)).to.be.ok;
    editor.simulateKeys('Ctrl-A');
    expect(timelineSequences().every(timelineSequence => !timelineSequence.selected)).to.be.ok;
  });

  it('can change interactive scroll position via arrow keys', () => {
    editor.interactiveScrollPosition = 50;
    editor.simulateKeys('Left');
    expect(editor.interactiveScrollPosition).to.be.equal(49);
    editor.simulateKeys('Right');
    editor.simulateKeys('Right');
    expect(editor.interactiveScrollPosition).to.be.equal(51);
  });

  it('can delete a sequence via Delete key', () => {
    const nightBackgroundSequence = interactive.sequences.find(sequence => sequence.name == 'night background');
    const nightBackgroundTimelineSequence = timelineSequences().find(timelineSequence => timelineSequence.sequence == nightBackgroundSequence);
    nightBackgroundTimelineSequence.selected = true;
    editor.simulateKeys('Delete');
    expect(nightBackgroundTimelineSequence.world()).to.not.be.ok;
    expect(interactive.sequences).to.not.include(nightBackgroundSequence);
  });

  after(() => {
    editor.window.close();
  });
});
