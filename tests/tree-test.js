/* global it, describe, before, beforeEach, after, afterEach */
import { exampleInteractive, InteractivesEditor } from '../index.js';
import { expect } from 'mocha-es6';

let editor, interactive;
function closeEditor () {
  editor.ui.window.close();
}

async function openNewEditorWithExampleInteractive () {
  editor = await new InteractivesEditor().initialize();
  interactive = await exampleInteractive();
  editor.interactive = interactive;
}

describe('Interactive graph', () => {
  before(async () => {
    await openNewEditorWithExampleInteractive();
  });

  beforeEach(() => {
    openGlobalTab();
  });

  function openGlobalTab () {
    editor.ui.globalTab.selected = true;
  }

  function graph () {
    return editor.ui.interactiveGraph;
  }

  function treeData () {
    return graph().tree.treeData;
  }

  function nodes () {
    return treeData().asList();
  }

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
    expect(interactive.sequences).to.be.equal(nodeSequences);
    interactive.removeSequence(newSequence);
    nodeSequences = nodes().filter(node => node.target.isSequence).map(node => node.target);
    expect(interactive.sequences).to.be.equal(nodeSequences);
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
