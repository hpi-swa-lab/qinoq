/* global it, describe, beforeEach, afterEach */
import { expect } from 'mocha-es6';
import { serialize, deserialize } from 'lively.serializer2';
import { SocialMediaButton, PRESETS } from '../components/social-media-button.js';
import { Label, Icon } from 'lively.morphic';
import { TEST_PRESETS } from './social-media-button-test-utils.js';

describe('Social Media Button', () => {
  let button;

  beforeEach(() => {
    button = new SocialMediaButton();
    button.openInWorld();
  });

  afterEach(() => {
    button.abandon();
  });

  it('has Twitter preset by default', () => {
    expect(button.preset).to.equal(PRESETS.TWITTER);
  });

  it('sets correct preset by name', () => {
    expect(button.preset).to.equal(PRESETS.TWITTER);
    button.preset = 'Facebook';
    expect(button.preset).to.equal(PRESETS.FACEBOOK);
  });

  it('sets correct preset by preset object', () => {
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
    expect(button.textString).to.equal(referenceIcon.textString);
    button.preset = 'Facebook';
    Icon.setIcon(referenceIcon, PRESETS.FACEBOOK.icon);
    expect(button.textString).to.equal(referenceIcon.textString);
  });

  it('generates correct tokens from preset', () => {
    expect(Object.keys(button.tokens)).to.equal(['text', 'url']);
    expect(Object.values(button.tokens)).to.deep.equal([
      { symbol: 'text', value: '', active: true },
      { symbol: 'url', value: '', active: true }
    ]);

    button.preset = TEST_PRESETS.CUSTOM;
    expect(Object.keys(button.tokens)).to.equal(['text', 'url', 'textInput']);
    expect(Object.values(button.tokens)).to.deep.equal([
      { symbol: 'text', value: '', active: false },
      { symbol: 'url', value: '', active: true },
      { symbol: 'text input', value: '', active: true }
    ]);
  });

  it('changes tooltip depending on preset', () => {
    expect(button.tooltip).to.be.equal('Share via Twitter');
    button.preset = 'Facebook';
    expect(button.tooltip).to.be.equal('Share via Facebook');
  });

  it('generates correct link', () => {
    expect(button.link).to.be.equal('https://twitter.com/intent/tweet/?text=&url=');
    button.preset = TEST_PRESETS.CUSTOM;
    button.tokens.url.value = 'test.com';
    button.tokens.textInput.value = 'I announce: I like trains!';
    expect(button.link).to.be.equal('https://www.mycustomnetwork.com/share?u=test.com;t=I%20announce%3A%20I%20like%20trains!');
  });
});
