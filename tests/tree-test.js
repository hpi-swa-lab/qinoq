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

describe('Sequence graph', () => {
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
    return editor.ui.sequenceGraph;
  }

  function treeData () {
    return graph().tree.treeData;
  }

  function nodes () {
    return treeData().asList();
  }

  it('exists', () => {
    expect(editor.ui.sequenceGraph.isSequenceGraph).to.be.true;
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

  after(() => {
    editor.ui.window.close();
  });
});
