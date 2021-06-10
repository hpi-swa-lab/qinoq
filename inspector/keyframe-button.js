import { QinoqMorph } from '../qinoq-morph.js';
import { pt } from 'lively.graphics';
import { COLOR_SCHEME } from '../colors.js';
import { connect, disconnect } from 'lively.bindings';
import { Keyframe } from '../index.js';
import { getColorForProperty } from '../properties.js';

export class KeyframeButton extends QinoqMorph {
  static get properties () {
    return {
      extent: {
        defaultValue: pt(15, 15)
      },
      rotation: {
        defaultValue: Math.PI / 4
      },
      borderColor: {
        defaultValue: COLOR_SCHEME.KEYFRAME_BORDER
      },
      nativeCursor: {
        defaultValue: 'pointer'
      },
      borderWidth: {
        defaultValue: 1
      },
      tooltip: {
        defaultValue: 'Create a keyframe'
      },
      borderStyle: {
        defaultValue: 'solid'
      },
      fill: {
        defaultValue: COLOR_SCHEME.KEYFRAME_FILL
      },
      mode: {
        defaultValue: 'default',
        type: 'Enum',
        values: ['default', 'activated'],
        set (mode) {
          this.setProperty('mode', mode);
          this.styleSet = mode;
        }
      },
      animationsInspector: { },
      animation: {
        after: ['sequence', 'property', 'inspector'],
        initialize () {
          if (!this._deserializing) {
            this.animation = this.sequence.getAnimationForMorphProperty(this.target, this.property);
            this.setMode();
          }
        }
      },
      _editor: {
        set (_editor) {
          if (!this._deserializing) {
            connect(_editor, 'onScrollChange', this, 'setMode');
          }
          this.setProperty('_editor', _editor);
        }
      },
      sequence: {},
      property: {
        after: ['tooltip'],
        set (property) {
          this.setProperty('property', property);
          this.tooltip = `Create a keyframe for the ${property} property`;
        }
      },
      propertyType: {},
      styleSet: {
        defaultValue: 'default',
        set (styleSet) {
          this.setProperty('styleSet', styleSet);
          if (!this._deserializing) this.updateStyle();
        }
      }
    };
  }

  get target () {
    return this.animationsInspector.targetMorph;
  }

  get isKeyframeButton () {
    return true;
  }

  get currentValue () {
    return this.target[this.property];
  }

  async onMouseUp (event = {}) {
    if (event.domEvt && event.domEvt.button == 2) return;
    this.mode = 'activated';
    await this.addOrOverwriteKeyframe();
  }

  async addOrOverwriteKeyframe (relativePosition = this.sequence.progress) {
    const newKeyframe = new Keyframe(relativePosition, this.currentValue);
    this.animation = await this.sequence.addKeyframeForMorph(newKeyframe, this.target, this.property, this.propertyType, true);
    let timeline = this.editor.getTimelineForSequence(this.sequence);
    if (!timeline) {
      timeline = await this.editor.initializeSequenceView(this.sequence);
      return;
    }
    timeline.updateAnimationLayer(this.animation);
    this.editor.goto(newKeyframe);
    this.animationsInspector.resetHighlightingForProperty(this.property);
  }

  async promptForKeyframePosition () {
    const position = Number(await $world.prompt('Relative keyframe position:', { input: this.sequence.progress }));
    if (!isNaN(position)) {
      await this.addOrOverwriteKeyframe(position);
    }
  }

  updateAnimation () {
    this.animation = this.sequence.getAnimationForMorphProperty(this.target, this.property);
    this.setMode();
  }

  onMouseDown (event) {
    super.onMouseDown(event);
    this.styleSet = 'click';
  }

  menuItems () {
    return [
      ['◆ Add keyframe', () => this.addOrOverwriteKeyframe()],
      ['◆ Add keyframe at position', () => this.promptForKeyframePosition()]
    ];
  }

  onHoverIn () {
    this.styleSet = 'hover';
  }

  onHoverOut () {
    if (this.mode === 'activated') {
      this.styleSet = 'activated';
    } else {
      this.styleSet = 'default';
    }
  }

  updateStyle () {
    switch (this.styleSet) {
      case 'default':
        this.fill = COLOR_SCHEME.KEYFRAME_FILL;
        this.borderColor = COLOR_SCHEME.KEYFRAME_BORDER;
        break;
      case 'activated':
      case 'hover':
        this.fill = getColorForProperty(this.property);
        break;
      case 'click':
        this.fill = COLOR_SCHEME.TRANSPARENT;
    }
  }

  setMode () {
    if (this._updatingStyle) {
      return;
    }
    if (!this.animation) {
      return;
    }
    this._updatingStyle = true;
    const animationPosition = this.sequence.progress;

    if (animationPosition >= 0 && animationPosition <= 1 && this.animation.getKeyframeAt(animationPosition)) {
      this.mode = 'activated';
    } else {
      this.mode = 'default';
    }
    this._updatingStyle = false;
  }

  remove () {
    if (this.editor) disconnect(this.editor, 'onScrollChange', this, 'setMode');
    super.remove();
  }
}
