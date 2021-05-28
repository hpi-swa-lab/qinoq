/* global it, describe, beforeEach, afterEach */
import { expect } from 'mocha-es6';
import { Morph, Text, Icon, Label } from 'lively.morphic';
import { exampleInteractive, InteractivesEditor } from 'qinoq';
import { COLOR_SCHEME } from '../colors.js';
import { SocialMediaButton, PRESETS } from '../components/social-media-button.js';
import { TEST_PRESETS } from './social-media-button-test.js';

class InspectorTestMorph extends Morph {
  static get properties () {
    return {
      testProp: {
        animateAs: 'number',
        defaultValue: 0
      },
      testProp2: {

      }
    };
  }
}

describe('Inspector', () => {
  let morph, editor, interactive, inspector;

  function closeEditor () {
    editor.ui.window.close();
  }

  beforeEach(async () => {
    editor = await new InteractivesEditor().initialize();
    interactive = await exampleInteractive();
    editor.interactive = interactive;

    await new Promise(r => setTimeout(r, 10));
    morph = new InspectorTestMorph();
    inspector = editor.ui.inspector;
    interactive.sequences[0].addMorph(morph);
  });

  afterEach(() => {
    closeEditor();
  });

  function getDayBackgroundTimelineSequence () {
    return editor.withAllSubmorphsSelect(morph => morph.isTimelineSequence).find(timelineSequence => timelineSequence.sequence.name == 'day background');
  }

  describe('in the animations tab mode', () => {
    let animationsInspector;

    beforeEach(() => {
      animationsInspector = inspector.animationsInspector;
      inspector.targetMorph = morph;
    });

    it('can animate a predefined property', () => {
      expect('opacity' in animationsInspector.propertiesToDisplay).to.be.ok;
    });

    it('can animate a property defined as animateAs', () => {
      expect('testProp' in animationsInspector.propertiesToDisplay).to.be.ok;
      expect(animationsInspector.propertiesToDisplay.testProp).to.equal('number');
    });

    it('can not animate a new property not defined as animateAs', () => {
      expect('testProp2' in animationsInspector.propertiesToDisplay).to.not.be.ok;
    });

    it('targets a morph in the interactive when a halo is shown', async () => {
      const anotherMorph = new Morph({ name: 'morph in interactive' });
      interactive.sequences[0].addMorph(anotherMorph);
      $world.showHaloFor(anotherMorph);

      expect(inspector.targetMorph).to.equal(anotherMorph);

      anotherMorph.abandon();
    });

    it('does not target a morph in another interactive when a halo is shown', async () => {
      const anotherMorph = new Morph({ name: 'morph in interactive' });
      const anotherInteractive = await exampleInteractive();
      anotherInteractive.sequences[0].addMorph(anotherMorph);
      anotherInteractive.openInWorld();
      $world.showHaloFor(anotherMorph);

      expect(inspector.targetMorph).to.not.be.equal(anotherMorph);

      anotherMorph.abandon();
      anotherInteractive.abandon();
    });

    it('does not target a morph outside the interactive when a halo is shown', () => {
      const anotherMorph = new Morph();
      $world.showHaloFor(anotherMorph);

      expect(inspector.targetMorph).to.not.be.equal(anotherMorph);

      anotherMorph.abandon();
    });

    it('sets the targetMorph to null after deselect is called', () => {
      expect(inspector.targetMorph).to.be.ok;
      inspector.deselect();
      expect(inspector.targetMorph).to.be.null;
    });

    it('colors a keyframebutton if a keyframe resides exactly at the scrollposition', async () => {
      const dayBackgroundTimelineSequence = getDayBackgroundTimelineSequence();
      // sets the scrollPosition to the beginning of the day background
      await dayBackgroundTimelineSequence.openSequenceView();
      inspector.targetMorph = dayBackgroundTimelineSequence.sequence.submorphs[0];
      const keyFramebuttonForFill = animationsInspector.propertyControls.fill.keyframe;
      expect(keyFramebuttonForFill.fill).to.not.be.deep.equal(COLOR_SCHEME.KEYFRAME_FILL);
    });

    it('colors a keyframebutton if a keyframe resides at a position which results in the scrollposition', async () => {
      const dayBackgroundTimelineSequence = getDayBackgroundTimelineSequence();
      const dayBackgroundSequence = dayBackgroundTimelineSequence.sequence;
      // sequence is 250 long, therefore this results in a scrollposition which is not a whole number
      dayBackgroundSequence.animations[0].keyframes[0].position = 0.33;
      // sets the scrollPosition to the beginning of the day background
      await dayBackgroundTimelineSequence.openSequenceView();
      inspector.targetMorph = dayBackgroundSequence.submorphs[0];
      editor.internalScrollChangeWithGUIUpdate(333);
      const keyFramebuttonForFill = animationsInspector.propertyControls.fill.keyframe;
      expect(keyFramebuttonForFill.fill).to.not.be.deep.equal(COLOR_SCHEME.KEYFRAME_FILL);
    });

    describe('can not animate', () => {
      describe('on text morphs', () => {
        let text;

        beforeEach(() => {
          text = new Text();
          interactive.sequences[0].addMorph(text);
          inspector.targetMorph = text;
        });

        afterEach(() => {
          inspector.targetMorph = morph;
          text.abandon();
        });

        it('textString attribute', () => {
          expect(animationsInspector.displayedProperties).to.not.contain('textString');
        });

        it('fontSize attribute', () => {
          expect(animationsInspector.displayedProperties).to.not.contain('fontSize');
        });
      });

      describe('on labels with icons', () => {
        let label;

        beforeEach(() => {
          label = new Label();
          Icon.setIcon(label, 'question');
          interactive.sequences[0].addMorph(label);
          inspector.targetMorph = label;
        });

        afterEach(() => {
          inspector.targetMorph = morph;
          label.abandon();
        });

        it('textString attribute', () => {
          expect(animationsInspector.displayedProperties).to.not.contain('textString');
        });
      });
    });
  });

  describe('in the style tab mode', () => {
    let styleInspector, alignmentPanel, sharePanel;

    beforeEach(() => {
      styleInspector = inspector.styleInspector;
      alignmentPanel = styleInspector.ui.panels.alignment;
      sharePanel = styleInspector.ui.panels.share;
    });

    it('has alignment panel', () => {
      expect(styleInspector.submorphs).to.contain(alignmentPanel);
    });

    it('has no share panel', () => {
      expect(styleInspector.submorphs).to.not.contain(sharePanel);
    });

    it('disables alignment options when no targetMorph is set', () => {
      expect(alignmentPanel.enabled).to.be.false;
    });

    describe('with a selected morph', () => {
      beforeEach(() => {
        inspector.targetMorph = morph;
      });

      it('enables alignment panel', () => {
        expect(alignmentPanel.enabled).to.be.true;
      });

      it('still does not show share panel', () => {
        expect(styleInspector.submorphs).to.not.contain(sharePanel);
      });

      describe('which is a share button', () => {
        let shareButton, shareButtonWithValues;

        beforeEach(() => {
          shareButton = new SocialMediaButton();
          shareButtonWithValues = new SocialMediaButton({
            preset: TEST_PRESETS.CUSTOM,
            tokens: {
              url: {
                symbol: 'url',
                value: 'test.com'
              },
              textInput: {
                symbol: 'text input',
                value: 'I announce: I like trains!'
              }
            }
          });

          interactive.sequences[0].addMorph(shareButton);
          interactive.sequences[0].addMorph(shareButtonWithValues);

          inspector.targetMorph = shareButton;
        });

        afterEach(() => {
          inspector.targetMorph = morph;
          shareButton.abandon();
          shareButtonWithValues.abandon();
        });

        it('shows the share panel', () => {
          expect(styleInspector.submorphs).to.contain(sharePanel);
          expect(sharePanel.title).to.equal('Share Settings');
        });

        it('shows the share panel with the appropriate drop down menu', () => {
          const dropDownMenu = sharePanel.submorphs[1];

          expect(dropDownMenu.values).to.equal(shareButton.presetValues);
          expect(dropDownMenu.selectedValue).to.equal(shareButton.preset.name);

          inspector.targetMorph = shareButtonWithValues;

          expect(dropDownMenu.selectedValue).to.equal(shareButtonWithValues.preset.name);
        });

        it('shows the share panel with text fields for all changeable tokens', () => {
          const widgetContainer = sharePanel.submorphs[2];

          expect(widgetContainer.submorphs[0].textString).to.be.equal('Text');
          expect(widgetContainer.submorphs[1].name).to.be.equal('aStringWidget');
          expect(widgetContainer.submorphs[2].textString).to.be.equal('Url');
          expect(widgetContainer.submorphs[3].name).to.be.equal('aStringWidget');

          shareButton.preset = TEST_PRESETS.CUSTOM;
          inspector.targetMorph = morph; // trigger panel update
          inspector.targetMorph = shareButton;

          expect(widgetContainer.submorphs[0].textString).to.be.equal('Url');
          expect(widgetContainer.submorphs[1].name).to.be.equal('aStringWidget');
          expect(widgetContainer.submorphs[2].textString).to.be.equal('Text input');
          expect(widgetContainer.submorphs[3].name).to.be.equal('aStringWidget');

          shareButton.preset = 'Facebook';
          inspector.targetMorph = morph; // trigger panel update
          inspector.targetMorph = shareButton;

          expect(widgetContainer.submorphs[0].textString).to.be.equal('Url');
          expect(widgetContainer.submorphs[1].name).to.be.equal('aStringWidget');
        });

        it('shows the share panel with text fields which respect present token values', () => {
          inspector.targetMorph = shareButtonWithValues;

          const widgetContainer = sharePanel.submorphs[2];

          expect(widgetContainer.submorphs[0].textString).to.be.equal('Url');
          expect(widgetContainer.submorphs[1].textString).to.be.equal('test.com');
          expect(widgetContainer.submorphs[2].textString).to.be.equal('Text input');
          expect(widgetContainer.submorphs[3].textString).to.be.equal(
            'I announce: I like trains!');
        });

        it('shows share panel with drop down menu which changes the preset and updates the panel', () => {
          const dropDownMenu = sharePanel.submorphs[1];
          const widgetContainer = sharePanel.submorphs[2];

          dropDownMenu.selectedValue = 'Facebook';

          expect(shareButton.preset).to.be.equal(PRESETS.FACEBOOK);
          expect(widgetContainer.submorphs[0].textString).to.be.equal('Url');
          expect(widgetContainer.submorphs[1].textString).to.be.equal('');
        });

        it('shows share panel with text fields which change the share button tokens on input', () => {
          const widgetContainer = sharePanel.submorphs[2];

          expect(shareButton.tokens.url.value).to.be.equal('');

          widgetContainer.submorphs[3].textString = 'test.com';

          expect(shareButton.tokens.url.value).to.be.equal('test.com');
        });
      });
    });
  });
});
