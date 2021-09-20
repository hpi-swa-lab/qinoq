/* global it, describe, beforeEach, afterEach */
import { expect } from 'mocha-es6';
import { InteractivesEditor, exampleInteractive } from 'qinoq';
import { delay } from 'lively.lang/promise.js';

describe('Keyboard Shortcut Cheatsheet', () => {
  let editor, interactive;
  beforeEach(async () => {
    editor = await new InteractivesEditor().initialize();
    interactive = await exampleInteractive();
    editor.interactive = interactive;
  });

  it('can be opened', () => {
    editor.ui.menuBar.ui.showKeybindingList.onMouseUp();
    expect(editor.owner.get('fader')).to.be.truthy;
  });

  it('has content', async () => {
    editor.ui.menuBar.ui.showKeybindingList.onMouseUp();
    // necessary to ensure customized fader is ready
    await delay(1);
    expect(editor.owner.get('fader').submorphs.length).to.equal(2);
  });

  it('closes when clicked', async () => {
    editor.ui.menuBar.ui.showKeybindingList.onMouseUp();
    // necessary to ensure customized fader is ready
    await delay(1);
    editor.owner.get('fader').onMouseDown();
    expect(editor.owner.get('fader')).to.be.falsy;
  });

  afterEach(() => editor.ui.window.close());
});
