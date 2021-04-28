/* global it, describe, before, beforeEach, after, afterEach */
import { expect } from 'mocha-es6';
import { exampleInteractive, InteractivesEditor } from '../index.js';
import { pt } from 'lively.graphics';
import { Clipboard } from '../utilities/clipboard.js';
import { QinoqMorph } from '../qinoq-morph.js';
import { serialize, deserialize } from 'lively.serializer2';

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

  describe('with timeline', () => {
    it('sets _lastSelectedTimelineSequence on the first click on a single sequence', () => {
      const nightBackgroundSequence = interactive.sequences.find(sequence => sequence.name == 'night background');
      const nightBackgroundTimelineSequence = timelineSequences().find(timelineSequence => timelineSequence.sequence == nightBackgroundSequence);
      const timeline = nightBackgroundTimelineSequence.timeline;
      const event = {
        isShiftDown: () => { return false; },
        isAltDown: () => { return false; }
      };
      expect(timeline._lastSelectedTimelineSequence).to.not.be.ok;
      nightBackgroundTimelineSequence.onMouseDown(event);
      expect(timeline._lastSelectedTimelineSequence).to.be.deep.equal(nightBackgroundTimelineSequence);
    });
  });

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

  describe('serialization', () => {
    it('can be serialized with interactive', () => {
      deserialize(serialize(editor));
    });
  });

  describe('menu bar buttons', () => {
    describe('creating a new sequence', () => {
      let createSequenceButton;

      before(() => {
        createSequenceButton = editor.withAllSubmorphsSelect(submorph => submorph.tooltip == 'Create a new sequence')[0];
      });

      it('has a button to create a new sequence', () => {
        expect(createSequenceButton).to.be.ok;
      });

      it('creates a new sequence', () => {
        const sequenceCount = interactive.sequences.length;
        createSequenceButton.onMouseUp();
        expect(interactive.sequences.length).to.be.equal(sequenceCount + 1);
        $world.firstHand.cancelGrab();
        expect(interactive.sequences.length).to.be.equal(sequenceCount);
      });

      it('creating a sequence can be cancelled with Escape', () => {
        const sequenceCount = interactive.sequences.length;
        createSequenceButton.onMouseUp();
        expect(interactive.sequences.length).to.be.equal(sequenceCount + 1);
        $world.firstHand.submorphs[0].simulateKeys('Escape');
        $world.simulateKeys('Escape');
        expect(interactive.sequences.length).to.be.equal(sequenceCount);
      });
    });

    describe('creating a new layer', () => {
      let createLayerButton;

      before(() => {
        createLayerButton = editor.withAllSubmorphsSelect(submorph => submorph.tooltip == 'Create a new layer')[0];
      });

      it('has a button to create a new layer', () => {
        expect(createLayerButton).to.be.ok;
      });

      it('creates a new layer', () => {
        const layerCount = interactive.layers.length;
        createLayerButton.onMouseUp();
        expect(interactive.layers.length).to.be.equal(layerCount + 1);
        const newLayer = interactive.layers[interactive.layers.length - 1];
        const timelineLayer = editor.globalTimeline.timelineLayers.find(timelineLayer => timelineLayer.layer == newLayer);
        expect(timelineLayer).to.be.ok;
        interactive.removeLayer(newLayer);
        editor.globalTimeline.abandonTimelineLayer(timelineLayer);
        expect(interactive.layers.length).to.be.equal(layerCount);
      });
    });
  });

  it('moves scroll holder', () => {
    expect(interactive.scrollOverlay.globalPosition.equals(editor.ui.preview.globalPosition)).to.be.ok;
    editor.ui.window.moveBy(pt(100, 100));
    expect(interactive.scrollOverlay.globalPosition.equals(editor.ui.preview.globalPosition)).to.be.ok;
  });

  it('removes scrollholder from world when minimized', () => {
    expect(interactive.scrollOverlay.world()).to.be.ok;
    editor.ui.window.toggleMinimize();
    expect(interactive.scrollOverlay.world()).to.not.be.ok;
    editor.ui.window.toggleMinimize();
    expect(interactive.scrollOverlay.world()).to.be.ok;
  });

  it('changes scroll position when changing tab', () => {
    expect(editor.interactive.scrollPosition).to.be.equal(0);
    editor.getTimelineFor(editor.ui.globalTab).timelineSequences[2].openSequenceView();
    expect(editor.interactive.scrollPosition).to.be.equal(250);
  });

  it('shows zoom in the menu bar', () => {
    expect(editor.ui.menuBar.ui.zoomInput.number).to.be.equal(100);
    editor.ui.globalTimeline.zoomFactor = 1.5;
    expect(editor.ui.menuBar.ui.zoomInput.number).to.be.equal(150);
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

  after(() => {
    editor.ui.window.close();
  });
});

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
