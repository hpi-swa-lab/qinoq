/* global it, describe, before, beforeEach, after, afterEach */
import { expect } from 'mocha-es6';
import { exampleInteractive, Interactive, InteractivesEditor } from '../index.js';
import { pt } from 'lively.graphics';
import { Clipboard } from '../utilities/clipboard.js';
import { QinoqMorph } from '../qinoq-morph.js';
import { serialize, deserialize } from 'lively.serializer2';
import { LottieMorph } from '../interactive-morphs/lottie-morph.js';
import { Morph } from 'lively.morphic';

let editor, interactive;
function closeEditor () {
  editor.ui.window.close();
}

async function openNewEditorWithExampleInteractive () {
  editor = await new InteractivesEditor().initialize();
  interactive = await exampleInteractive();
  editor.interactive = interactive;
}

describe('Editor', () => {
  before(async () => {
    await openNewEditorWithExampleInteractive();
  });

  beforeEach(() => {
    openGlobalTab();
  });

  function openGlobalTab () {
    editor.ui.globalTab.selected = true;
  }

  function timelineSequences () {
    return editor.withAllSubmorphsSelect(morph => morph.isTimelineSequence);
  }

  describe('with global timeline', () => {
    it('sets _lastSelectedTimelineSequence on the first click on a single sequence', () => {
      const nightBackgroundTimelineSequence = timelineSequences().find(timelineSequence => timelineSequence.sequence.name == 'night background');
      const timeline = nightBackgroundTimelineSequence.timeline;
      const event = {
        isShiftDown: () => { return false; },
        isAltDown: () => { return false; },
        targetMorph: nightBackgroundTimelineSequence,
        state: {
          prevClick:
                {
                  clickCount: 0
                }
        }
      };
      expect(timeline._lastSelectedTimelineSequence).to.not.be.ok;
      nightBackgroundTimelineSequence.onMouseDown(event);
      expect(timeline._lastSelectedTimelineSequence).to.be.deep.equal(nightBackgroundTimelineSequence);
    });

    it('removes sequence resizers when sequences are too small', () => {
      const nightBackgroundTimelineSequence = timelineSequences().find(timelineSequence => timelineSequence.sequence.name == 'night background');
      expect(nightBackgroundTimelineSequence.hasResizers).to.be.ok;
      const initialWidth = nightBackgroundTimelineSequence.width;
      nightBackgroundTimelineSequence.width = 3;
      expect(nightBackgroundTimelineSequence.hasResizers).to.not.be.ok;
      nightBackgroundTimelineSequence.width = initialWidth;
      expect(nightBackgroundTimelineSequence.hasResizers).to.be.ok;
    });
  });

  describe('with sequence timeline', () => {
    beforeEach(async () => {
      closeEditor();
      await openNewEditorWithExampleInteractive();
    });

    it('shows placeholder if empty sequence is opened', async () => {
      const dayBackgroundTimelineSequence = timelineSequences().find(timelineSequence => timelineSequence.sequence.name == 'day background');
      dayBackgroundTimelineSequence.sequence.submorphs.forEach(submorph => submorph.remove());
      await dayBackgroundTimelineSequence.openSequenceView();
      const placeholder = editor.getSubmorphNamed('placeholder');
      expect(placeholder).to.be.ok;
    });

    it('inserts placeholder when last morph in sequence is removed', async () => {
      const dayBackgroundTimelineSequence = timelineSequences().find(timelineSequence => timelineSequence.sequence.name == 'day background');
      await dayBackgroundTimelineSequence.openSequenceView();
      expect(editor.getSubmorphNamed('placeholder')).to.not.be.ok;
      editor.removeMorphFromInteractive(dayBackgroundTimelineSequence.sequence.submorphs[0]);
      expect(editor.getSubmorphNamed('placeholder')).to.be.ok;
    });

    it('removes placeholder when morph is added to the sequence', async () => {
      const dayBackgroundTimelineSequence = timelineSequences().find(timelineSequence => timelineSequence.sequence.name == 'day background');
      dayBackgroundTimelineSequence.sequence.submorphs.forEach(submorph => submorph.remove());
      await dayBackgroundTimelineSequence.openSequenceView();
      editor.addMorphToInteractive(new Morph());
      expect(editor.getSubmorphNamed('placeholder')).to.not.be.ok;
    });

    it('does not insert placeholder when morph(s) remain in the sequence', async () => {
      const dayBackgroundTimelineSequence = timelineSequences().find(timelineSequence => timelineSequence.sequence.name == 'tree sequence');
      await dayBackgroundTimelineSequence.openSequenceView();
      editor.removeMorphFromInteractive(dayBackgroundTimelineSequence.sequence.submorphs[0]);
      expect(editor.getSubmorphNamed('placeholder')).to.not.be.ok;
    });

    it('a layer with keyframes can be expanded', async () => {
      const dayBackgroundTimelineSequence = timelineSequences().find(timelineSequence => timelineSequence.sequence.name == 'day background');
      await dayBackgroundTimelineSequence.openSequenceView();
      const layerInfo = editor.displayedTimeline.getSubmorphNamed('anOverviewTimelineLayer').layerInfo;
      expect(layerInfo.menuItems().some(menuItem => menuItem[0] == '➕ Expand view')).to.be.true;
      editor.getTabFor(dayBackgroundTimelineSequence.sequence).close();
    });

    it('a layer without keyframes cannot be expanded', async () => {
      const nightBackgroundTimelineSequence = timelineSequences().find(timelineSequence => timelineSequence.sequence.name == 'night background');
      await nightBackgroundTimelineSequence.openSequenceView();
      const layerInfo = editor.displayedTimeline.getSubmorphNamed('anOverviewTimelineLayer').layerInfo;
      expect(layerInfo.menuItems().some(menuItem => menuItem[0] == '➕ Expand view')).to.be.false;
      editor.getTabFor(nightBackgroundTimelineSequence.sequence).close();
    });

    it('a layer can be expanded after adding a keyframe', async () => {
      const nightBackgroundTimelineSequence = timelineSequences().find(timelineSequence => timelineSequence.sequence.name == 'night background');
      await nightBackgroundTimelineSequence.openSequenceView();
      const timelineLayer = editor.displayedTimeline.getSubmorphNamed('anOverviewTimelineLayer');
      const layerInfo = timelineLayer.layerInfo;
      expect(layerInfo.menuItems().some(menuItem => menuItem[0] == '➕ Expand view')).to.be.false;
      const clickEvent = {
        state: {
          clickedMorph: null,
          prevClick:
                {
                  clickCount: 0
                }
        },
        targetMorphs: [timelineLayer],
        targetMorph: timelineLayer
      };
      timelineLayer.onMouseDown(clickEvent);
      await editor.getSubmorphNamed('aKeyframeButton').onMouseUp();
      expect(layerInfo.menuItems().some(menuItem => menuItem[0] == '➕ Expand view')).to.be.true;
      editor.getTabFor(nightBackgroundTimelineSequence.sequence).close();
    });

    describe('cutting a morph', () => {
      let morphToCut;

      class CutTestMorph extends Morph {
        abandon (bool) {
          this._abandonHasBeenCalled = true;
          super.abandon(bool);
        }
      }

      beforeEach(async () => {
        const nightBackgroundTimelineSequence = timelineSequences().find(timelineSequence => timelineSequence.sequence.name == 'night background');
        await nightBackgroundTimelineSequence.openSequenceView();
        morphToCut = new CutTestMorph();
        editor.addMorphToInteractive(morphToCut);
      });

      it('does not trigger abandon', () => {
        expect(morphToCut._abandonHasBeenCalled).to.not.be.ok;
        editor.cutMorph(morphToCut);
        expect(morphToCut._abandonHasBeenCalled).to.not.be.ok;
        morphToCut.abandon();
        expect(morphToCut._abandonHasBeenCalled).to.be.ok;
      });

      it('removes morph from interactive', () => {
        expect(editor.currentSequence.submorphs).to.include(morphToCut);
        editor.cutMorph(morphToCut);
        expect(editor.currentSequence.submorphs).to.not.include(morphToCut);
      });

      it('removes morph animations from sequence', () => {
        expect(editor.currentSequence.submorphs).to.include(morphToCut);
        editor.cutMorph(morphToCut);
        expect(editor.currentSequence.submorphs).to.not.include(morphToCut);
      });

      it('places morph in clipboard', async () => {
        const { Keyframe } = await System.import('qinoq/animations.js');
        const someKeyframe = new Keyframe(0, 0);
        const animation = await editor.currentSequence.addKeyframeForMorph(someKeyframe, morphToCut, 'opacity', 'number');
        expect(editor.currentSequence.animations).to.include(animation);
        editor.cutMorph(morphToCut);
        expect(editor.currentSequence.animations).not.to.include(animation);
      });
    });

    after(async () => {
      closeEditor();
      await openNewEditorWithExampleInteractive();
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
    it('can be serialized without an interactive', async () => {
      const emptyEditor = await new InteractivesEditor().initialize();
      deserialize(serialize(emptyEditor));
      emptyEditor.ui.window.close();
    });

    it('can be serialized with an interactive', () => {
      deserialize(serialize(editor));
    });
  });

  describe('with menu bar buttons', () => {
    describe(', the create sequence button', () => {
      let createSequenceButton;

      before(() => {
        createSequenceButton = editor.withAllSubmorphsSelect(submorph => submorph.tooltip == 'Create a new sequence')[0];
      });

      it('exists', () => {
        expect(createSequenceButton).to.be.ok;
      });

      it('creates a new sequence', () => {
        const sequenceCount = interactive.sequences.length;
        createSequenceButton.onMouseUp();
        expect(interactive.sequences.length).to.be.equal(sequenceCount + 1);
        $world.firstHand.cancelGrab();
        expect(interactive.sequences.length).to.be.equal(sequenceCount);
      });

      it('cancels sequence creation with Escape', () => {
        const sequenceCount = interactive.sequences.length;
        createSequenceButton.onMouseUp();
        expect(interactive.sequences.length).to.be.equal(sequenceCount + 1);
        $world.firstHand.submorphs[0].simulateKeys('Escape');
        $world.simulateKeys('Escape');
        expect(interactive.sequences.length).to.be.equal(sequenceCount);
      });
    });

    describe(', the create layer button', () => {
      let createLayerButton;

      before(() => {
        createLayerButton = editor.withAllSubmorphsSelect(submorph => submorph.tooltip == 'Create a new layer')[0];
      });

      it('exists', () => {
        expect(createLayerButton).to.be.ok;
      });

      it('creates a new layer', () => {
        const layerCount = interactive.layers.length;
        createLayerButton.onMouseUp();
        expect(interactive.layers.length).to.be.equal(layerCount + 1);
        const newLayer = interactive.layers[interactive.layers.length - 1];
        const timelineLayer = editor.ui.globalTimeline.timelineLayers.find(timelineLayer => timelineLayer.layer == newLayer);
        expect(timelineLayer).to.be.ok;
        timelineLayer.layerInfo.removeLayer();
        expect(interactive.layers.length).to.be.equal(layerCount);
      });
    });

    describe(', the zoom to fit timeline button', () => {
      let zoomToFitTimelineButton;

      before(() => {
        zoomToFitTimelineButton = editor.withAllSubmorphsSelect(submorph => submorph.tooltip == 'Zoom to fit timeline')[0];
      });

      it('exists', () => {
        expect(zoomToFitTimelineButton).to.be.ok;
      });

      it('changes zoom in global timeline', () => {
        editor.updateZoomInputNumber(1);
        expect(editor.ui.menuBar.ui.zoomInput.number).to.be.equal(100);
        zoomToFitTimelineButton.onMouseUp();
        expect(editor.ui.menuBar.ui.zoomInput.number).to.be.greaterThan(100);
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

  it('changes scroll position when changing tab', async () => {
    expect(editor.interactive.scrollPosition).to.be.equal(0);
    await timelineSequences()[2].openSequenceView();
    expect(editor.interactive.scrollPosition).to.be.equal(250);
  });

  it('zoom input changes timeline zoom', () => {
    editor.ui.menuBar.ui.zoomInput.number = 100;
    expect(editor.ui.globalTimeline.zoomFactor).to.be.equal(1.0);
    editor.ui.menuBar.ui.zoomInput.number = 150;
    expect(editor.ui.globalTimeline.zoomFactor).to.be.equal(1.5);
    editor.ui.menuBar.ui.zoomInput.number = 100;
  });

  it('adds an animation when adding a lottie morph', async () => {
    const lm = new LottieMorph();
    const treeTimelineSequence = timelineSequences().find(timelineSequence => timelineSequence.sequence.name == 'tree sequence');
    await treeTimelineSequence.openSequenceView();
    const sequence = treeTimelineSequence.sequence;
    const previousAnimationCount = sequence.animations.length;
    editor.addMorphToInteractive(lm);
    expect(sequence.animations.length).to.be.equal(previousAnimationCount + 1);
    const newAnimation = sequence.animations[sequence.animations.length - 1];
    expect(newAnimation.property).to.be.equal('progress');
    expect(newAnimation.keyframes.length).to.be.equal(2);
  });

  it('does not add an animation when adding a lottie morph which already has an animation', async () => {
    const skyTimelineSequence = timelineSequences().find(timelineSequence => timelineSequence.sequence.name == 'sky sequence');
    const skySequence = skyTimelineSequence.sequence;
    await skyTimelineSequence.openSequenceView();
    editor.copyMorph(skySequence.get('lottie stars'));
    const pastedMorph = editor.pasteMorphFromClipboard();
    const progressAnimations = skySequence.getAnimationsForMorph(pastedMorph).filter(animation => animation.property == 'progress');
    expect(progressAnimations.length).to.be.equal(1);
  });

  after(() => {
    editor.ui.window.close();
  });
});

describe('Qinoq morph', () => {
  let qinoqMorph;

  before(async () => {
    await openNewEditorWithExampleInteractive();
  });

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

  after(() => {
    closeEditor();
  });
});

describe('Editor and Interactive connections', () => {
  before(async () => {
    editor = await new InteractivesEditor().initialize();
    interactive = await exampleInteractive();
    interactive.openInWorld();
  });

  it('do not exist when both are opened', () => {
    expect(interactiveHasOutsideConnections()).to.be.false;
    expect(editorHasConnectionsToInteractive()).to.be.false;
  });

  it('exist when interactive is loaded in editor', () => {
    editor.interactive = interactive;
    expect(interactiveHasOutsideConnections()).to.be.true;
    expect(editorHasConnectionsToInteractive()).to.be.true;
    interactive.remove();
  });

  it('do not exist after interactive has been removed from editor', async () => {
    editor.interactive = interactive;
    await performEditorActions();
    interactive.remove();
    interactive.openInWorld();
    expect(interactiveHasOutsideConnections()).to.be.false;
    expect(editorHasConnectionsToInteractive()).to.be.false;
  });

  async function performEditorActions () {
    const someTimelineSequence = editor.withAllSubmorphsSelect(morph => morph.isTimelineSequence)[0];
    await someTimelineSequence.openSequenceView();
    editor.ui.inspector.targetMorph = someTimelineSequence.sequence.submorphs[0];
  }

  function interactiveConnections () {
    const connections = [];
    interactive.withAllSubmorphsDo(morphInInteractive => {
      if (morphInInteractive.attributeConnections) {
        connections.push(...morphInInteractive.attributeConnections);
      }
    });
    if (interactive.scrollOverlay.attributeConnections) connections.concat(interactive.scrollOverlay.attributeConnections);
    if (interactive.scrollOverlay.submorphs[0].attributeConnections) connections.concat(interactive.scrollOverlay.submorphs[0].attributeConnections);
    return connections;
  }

  function editorConnections () {
    const connections = [];
    editor.withAllSubmorphsDo(morph => {
      if (morph.attributeConnections) {
        connections.push(...morph.attributeConnections);
      }
    });
    return connections;
  }

  function interactiveHasOutsideConnections () {
    const connections = interactiveConnections();

    return connections.map(connection => {
      const source = connection.sourceObj;
      const target = connection.targetObj;
      const sourceInInteractive = Interactive.isMorphInInteractive(source) || source == interactive.scrollOverlay || source.owner == interactive.scrollOverlay;
      const targetInInteractive = Interactive.isMorphInInteractive(target) || target == interactive.scrollOverlay || target.owner == interactive.scrollOverlay;
      return sourceInInteractive && targetInInteractive;
    }
    ).some(bool => !bool);
  }

  function editorHasConnectionsToInteractive () {
    const connections = editorConnections();
    return connections.map(connection => {
      const target = connection.targetObj;
      const targetInInteractive = Interactive.isMorphInInteractive(target) || target == interactive.scrollOverlay || target.owner == interactive.scrollOverlay;
      return targetInInteractive;
    }
    ).some(bool => bool);
  }

  after(() => {
    closeEditor();
    interactive.abandon();
  });
});
