/* global it, describe, before, after */
import { expect } from 'mocha-es6';
import { Interactive, exampleInteractive, InteractivesEditor } from '../index.js';
import { pt } from 'lively.graphics';

describe('Editor', () => {
  let editor, interactive;
  before(async () => {
    editor = await new InteractivesEditor().initialize();
    interactive = await exampleInteractive();
    editor.interactive = interactive;
  });

  function timelineSequences () {
    return editor.withAllSubmorphsSelect(morph => morph.isTimelineSequence);
  }

  describe('with keybindings', () => {
    it('can select all and no sequences', () => {
      editor.simulateKeys('Ctrl-A');
      expect(timelineSequences().every(timelineSequence => timelineSequence.isSelected)).to.be.ok;
      editor.simulateKeys('Ctrl-A');
      expect(timelineSequences().every(timelineSequence => !timelineSequence.isSelected)).to.be.ok;
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
      nightBackgroundTimelineSequence.isSelected = true;
      editor.simulateKeys('Delete');
      expect(nightBackgroundTimelineSequence.world()).to.not.be.ok;
      expect(interactive.sequences).to.not.include(nightBackgroundSequence);
    });
  });

  it('moves scroll holder', () => {
    expect(interactive.scrollOverlay.globalPosition.equals(editor.preview.globalPosition)).to.be.ok;
    editor.window.moveBy(pt(100, 100));
    expect(interactive.scrollOverlay.globalPosition.equals(editor.preview.globalPosition)).to.be.ok;
  });

  it('removes scrollholder from world when minimized', () => {
    expect(interactive.scrollOverlay.world()).to.be.ok;
    editor.window.toggleMinimize();
    expect(interactive.scrollOverlay.world()).to.not.be.ok;
    editor.window.toggleMinimize();
    expect(interactive.scrollOverlay.world()).to.be.ok;
  });

  after(() => {
    editor.window.close();
  });
});
