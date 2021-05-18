/* global it, describe, beforeEach, afterEach */
import { expect, assert } from 'mocha-es6';
import { serialize, deserialize } from 'lively.serializer2';
import { SocialMediaButton, PRESETS } from '../components/social-media-button.js';
import { Label, Icon } from 'lively.morphic';

describe('Social Media Button', () => {
  let button;

  beforeEach(() => {
    button = new SocialMediaButton();
  });

  it('has Twitter preset by default', () => {
    expect(button.preset).to.equal(PRESETS.TWITTER);
  });

  it('sets correct preset by name', () => {
    expect(button.preset).to.equal(PRESETS.TWITTER);
    button.preset = 'Facebook';
    expect(button.preset).to.equal(PRESETS.FACEBOOK);
  });

  it('sets correct preset by preset', () => {
    expect(button.preset).to.equal(PRESETS.TWITTER);
    button.preset = PRESETS.FACEBOOK;
    expect(button.preset).to.equal(PRESETS.FACEBOOK);
  });

  it('rejects invalid preset names', () => {
    expect(button.preset).to.equal(PRESETS.TWITTER);
    button.preset = 'Face';
    expect(button.preset).to.equal(PRESETS.TWITTER);
    expect(button.world()
      .submorphs
      .find(morph => morph.name === 'messageMorph' &&
            morph.message === 'Invalid preset: Face')
    ).to.exist;
  });

  it('changes icon depending on preset', () => {
    const referenceIcon = new Label();
    Icon.setIcon(referenceIcon, PRESETS.TWITTER.icon);
    expect(button.icon.textString).to.equal(referenceIcon.textString);
    Icon.setIcon();
    Icon.setIcon(referenceIcon, PRESETS.TWITTER.icon);
    expect(button.icon.textString).to.equal(referenceIcon.textString);
  });

  it('generates correct tokens from preset', () => {
    const preset = {
      name: 'Custom',
      icon: 'question',
      href: 'https://www.mycustomnetwork.com/share?u={url};t={text-input}'
    };
    expect(Object.keys(button.tokens)).to.equal(['url', 'textInput']);
    expect(Object.values(button.tokens)).to.equal([
      { symbol: 'url', value: '' },
      { symbol: 'text-input', value: '' }
    ]);
  });

  it('changes tooltip depending on preset', () => {

  });

  afterEach(() => {
    button.abandon();
  });
});
