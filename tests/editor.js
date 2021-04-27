/* global it, describe, before, beforeEach, after, afterEach */
import { expect } from 'mocha-es6';
import { Interactive, exampleInteractive, InteractivesEditor } from '../index.js';
import { pt } from 'lively.graphics';
import { QinoqMorph } from '../qinoq-morph.js';

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
      editor.internalScrollChangeWithGUIUpdate(50);
      editor.simulateKeys('Left');
      expect(editor.interactive.scrollPosition).to.be.equal(49);
      editor.simulateKeys('Right');
      editor.simulateKeys('Right');
      expect(editor.interactive.scrollPosition).to.be.equal(51);
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

  describe('with qinoq morph', () => {
    let qinoqMorph;

    beforeEach(() => {
      qinoqMorph = new QinoqMorph({ _editor: editor, name: 'Qinoq test morph' });
      editor.addMorph(qinoqMorph);
    });

    it('is qinoq morph', () => {
      expect(qinoqMorph.isQinoqMorph).to.be.ok;
    });

    it('has no menu items', () => {
      expect(qinoqMorph.menuItems().length).to.be.equal(0);
    });

    it('has halos disabled', () => {
      expect(qinoqMorph.halosEnabled).to.not.be.ok;
    });

    it('has reference to interactive', () => {
      expect(qinoqMorph.interactive).to.be.equal(interactive);
    });

    describe('in editor debug mode', () => {
      beforeEach(() => {
        editor.debug = true;
      });

      it('has menu items', () => {
        expect(qinoqMorph.menuItems().length).to.be.greaterThan(0);
      });

      it('has halos enabled', () => {
        expect(qinoqMorph.halosEnabled).to.be.ok;
      });

      afterEach(() => {
        editor.debug = false;
      });
    });

    afterEach(() => {
      qinoqMorph.abandon();
    });
  });

  it('changes scroll position when changing tab', () => {
    // TODO adjust as soon as #537 is merged
  });
  
  after(() => {
    editor.window.close();
  });
});
