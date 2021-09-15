/* global Keyframe */
/* global it, describe, before, beforeEach, after, afterEach */
import { exampleInteractive, ColorAnimation, Layer, Sequence, Interactive, InteractivesEditor, Keyframe } from '../index.js';
import { expect } from 'mocha-es6';
import { Morph } from 'lively.morphic';
import { Color } from 'lively.graphics';

let editor, interactive, layer, morph;

function closeEditor () {
  editor.ui.window.close();
}

async function openNewEditorWithExampleInteractive () {
  editor = await new InteractivesEditor().initialize();
  interactive = await exampleInteractive();
  editor.interactive = interactive;
}

async function openNewEditorWithEmptyInteractive () {
  editor = await new InteractivesEditor().initialize();
  interactive = new Interactive();
  layer = new Layer();
  interactive.addLayer(layer);
  editor.interactive = interactive;
}

function openGlobalTab () {
  editor.ui.globalTab.selected = true;
}

function graph () {
  return editor.ui.interactiveGraph;
}

function treeData () {
  return tree().treeData;
}

function tree () {
  return graph().tree;
}

function nodes () {
  return treeData().asList();
}

describe('Rendered tree for the graph', () => {
  // need to run as a whole describe blog
  before(async () => {
    await openNewEditorWithEmptyInteractive();
  });

  it('holds non-expandable item for an empty sequence', () => {
    const sequence = new Sequence({ start: 0, duration: 10 });
    sequence.layer = layer;
    interactive.addSequence(sequence);
    // Tree always holds one last, empty item
    expect(tree().document.root.children.length).to.equal(2);
    expect(tree().document.root.children[0].textAndAttributes[2].trim()).to.equal('');
  });

  it('has expandable node for sequence after adding a sequence and a morph to it', () => {
    morph = new Morph();
    interactive.sequences[0].addMorph(morph);
    expect(tree().document.root.children[0].textAndAttributes[2].includes('\uf0da')).to.be.true;
  });

  it('has expandable node for morph after adding a morph and animating it', () => {
    // expand sequence so that morph is visible
    treeData().root.children[0].isCollapsed = false;
    tree().update();
    const kf = new Keyframe(0, Color.rgbHex('#ff4d00'));
    const animation = new ColorAnimation(morph, 'fill');
    animation.addKeyframe(kf);
    interactive.sequences[0].addAnimation(animation);
    expect(tree().document.root.children.length).to.equal(3);
    // sequence is expanded
    expect(tree().document.root.children[0].textAndAttributes[2].includes('\uf0d7')).to.be.true;
    // morph can be expanded
    expect(tree().document.root.children[1].textAndAttributes[2].includes('\uf0da')).to.be.true;
  });

  after(() => {
    closeEditor();
  });
});

describe('Interactive graph', () => {
  before(async () => {
    await openNewEditorWithExampleInteractive();
  });

  beforeEach(() => {
    openGlobalTab();
  });

  it('exists', () => {
    expect(editor.ui.interactiveGraph.isInteractiveGraph).to.be.true;
  });

  it('has nodes for all sequences', () => {
    const nodeSequences = nodes().filter(node => node.target.isSequence).map(node => node.target);
    expect(interactive.sequences).to.be.equal(nodeSequences);
  });

  it('has nodes for all sequences after adding new sequence', () => {
    const newSequence = editor.execCommand('create new sequence', {});
    expect(interactive.sequences).to.include(newSequence);
    let nodeSequences = nodes().filter(node => node.target.isSequence).map(node => node.target);
    expect(interactive.sequences).to.have.members(nodeSequences);
    interactive.removeSequence(newSequence);
    nodeSequences = nodes().filter(node => node.target.isSequence).map(node => node.target);
    expect(interactive.sequences).to.be.equal(nodeSequences);
  });

  it('does not add keyframes to original animation when copying a sequence', () => {

  });

  it('updates tree after a single keyframe was removed in a copied sequence', () => {

  });

  describe('item container', () => {
    let dayBackgroundSequence;
    let dayBackgroundNode;
    let dayBackgroundNodeContainer;
    before(() => {
      dayBackgroundSequence = interactive.sequences.find(sequence => sequence.name == 'day background');
      dayBackgroundNode = nodes().find(node => node.target == dayBackgroundSequence);
      dayBackgroundNodeContainer = dayBackgroundNode.container;
    });

    it('exists', () => {
      expect(dayBackgroundNodeContainer).to.be.ok;
    });

    it('changes label when the sequence is renamed', () => {
      expect(dayBackgroundNodeContainer.label.value).to.be.equal(dayBackgroundSequence.name);
      dayBackgroundSequence.name = 'A new name';
      expect(dayBackgroundNodeContainer.label.value).to.be.equal(dayBackgroundSequence.name);
      dayBackgroundSequence.name = 'day background';
    });

    it('takes one to the sequence tab when selected', async () => {
      expect(editor.currentSequence).to.not.be.ok;
      await dayBackgroundNodeContainer.toggleSelected(true);
      expect(editor.currentSequence).to.be.equal(dayBackgroundSequence);
    });
  });

  after(() => {
    editor.ui.window.close();
  });
});
