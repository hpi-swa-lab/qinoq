/* global it, describe, beforeEach, afterEach */
import { expect } from 'mocha-es6';
import { Settings } from '../editor.js';
import { InteractivesEditor, exampleInteractive } from 'qinoq';
import { DEFAULT_SCROLLOVERLAY_OPACITY } from '../interactive.js';
import { delay } from 'lively.lang/promise.js';

describe('Settings', () => {
  it('parses fractions and numbers in correct formats', () => {
    expect(Settings.matchNumberOrFraction('3')).to.be.equal(3);
    expect(Settings.matchNumberOrFraction('4/3')).to.be.equal(4 / 3);
    expect(Settings.matchNumberOrFraction('3.5')).to.be.equal(3.5);
    expect(Settings.matchNumberOrFraction('3123.123')).to.be.equal(3123.123);
    expect(Settings.matchNumberOrFraction('3123/123')).to.be.equal(3123 / 123);
  });

  it('parses fractions and numbers in incorrect formats', () => {
    expect(Settings.matchNumberOrFraction('123/456.789')).to.be.null;
    expect(Settings.matchNumberOrFraction('123.456/789')).to.be.null;
    expect(Settings.matchNumberOrFraction('3.')).to.be.null;
    expect(Settings.matchNumberOrFraction('3/')).to.be.null;
    expect(Settings.matchNumberOrFraction('[3/4]')).to.be.null;
    expect(Settings.matchNumberOrFraction('[3/')).to.be.null;
    expect(Settings.matchNumberOrFraction('{3/}')).to.be.null;
  });

  describe('dialogue', () => {
    let editor, interactive;
    beforeEach(async () => {
      editor = await new InteractivesEditor().initialize();
      interactive = await exampleInteractive();
      editor.interactive = interactive;
      editor.ui.menuBar.ui.settingsButton.onMouseUp();
    });

    it('can be opened', () => {
      expect(editor.ui.settings.isSettings()).to.be.true;
    });

    it('can be used to rename the interactive', async () => {
      editor.ui.settings.get('renameButton').onMouseUp();
      await delay(5);
      const prompt = $world.get('aTextPrompt');
      prompt.get('input').textString = 'newName';
      prompt.get('ok button').trigger();
      await delay(5);
      expect(editor.interactive.name).to.equal('newName');
    });

    it('can be used to toggle the interactives scrollbar', () => {
      editor.ui.settings.get('scrollBarBox').checked = true;
      expect(interactive.scrollOverlay.opacity).to.equal(1);
      editor.ui.settings.get('scrollBarBox').checked = false;
      expect(interactive.scrollOverlay.opacity).to.equal(DEFAULT_SCROLLOVERLAY_OPACITY);
    });

    it('can be used to eject the interactive', () => {
      expect(interactive.owner).to.deep.equal(editor.get('interactive holder'));
      editor.ui.settings.get('ejectButton').onMouseUp();
      expect(interactive.owner).to.deep.equal($world);
      interactive.abandon();
    });

    it('can be used to toggle fixed aspect ratio for the interactive', () => {
      const aspectRatioDropDown = editor.ui.settings.get('aspectRatioDropDown');
      const customRatioInput = editor.ui.settings.get('customRatioInput');
      const fixedRatioBox = editor.ui.settings.get('fixedRatioBox');

      fixedRatioBox.checked = false;
      expect(interactive.fixedAspectRatio).to.be.null;
      expect(aspectRatioDropDown.visible).to.be.false;
      expect(customRatioInput.visible).to.be.false;

      fixedRatioBox.checked = true;
      expect(interactive.fixedAspectRatio).to.equal(16 / 9);
      expect(aspectRatioDropDown.visible).to.be.true;
      expect(customRatioInput.visible).to.be.false;

      expect(aspectRatioDropDown.values).to.equal(['21/9', '16/9', '4/3', 'Custom']);
      aspectRatioDropDown.selectedValue = '21/9';
      expect(interactive.fixedAspectRatio).to.equal(21 / 9);

      aspectRatioDropDown.selectedValue = 'Custom';
      expect(customRatioInput.visible).to.be.true;
      customRatioInput.textString = '1';
      customRatioInput.acceptInput();
      expect(interactive.fixedAspectRatio).to.equal(1);
    });

    afterEach(() => editor.ui.window.close());
  });
});
