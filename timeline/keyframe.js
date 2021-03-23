import { Morph } from 'lively.morphic';
import { COLOR_SCHEME } from '../colors.js';
import { pt } from 'lively.graphics';
import { CONSTANTS } from './constants.js';
import { Keyframe } from 'interactives-editor';
import { ListPrompt } from 'lively.components/prompts.js';

export class TimelineKeyframe extends Morph {
  static get properties () {
    return {
      extent: {
        defaultValue: CONSTANTS.KEYFRAME_EXTENT
      },
      fill: {
        defaultValue: COLOR_SCHEME.SECONDARY
      },
      rotation: {
        defaultValue: Math.PI / 4
      },
      _keyframe: {
        set (keyframe) {
          this.setProperty('_keyframe', keyframe);
          this.name = keyframe.name;
        }
      },
      animation: {},
      name: {
        type: String,
        set (name) {
          this.setProperty('name', name);
          this.tooltip = this.name;
          if (this.keyframe) this.keyframe.name = this.name;
        }
      },
      position: {
        set (point) {
          this.setProperty('position', point);
          if (this._lockModelUpdate) return;
          if (this.layer) this.keyframe.position = this.layer.timeline.getScrollFromPosition(this.position);
        }
      },
      draggable: {
        defaultValue: true
      },
      _editor: {},
      _lockModelUpdate: {
        defaultValue: true
      }
    };
  }

  get keyframe () {
    return this._keyframe;
  }

  get editor () {
    return this._editor;
  }

  get timelineKeyframeY () {
    return (CONSTANTS.LAYER_HEIGHT / 2) - (Math.sqrt(2) * CONSTANTS.KEYFRAME_EXTENT.x / 2);
  }

  initialize (editor, keyframe, animation) {
    this._lockModelUpdate = true;
    this._editor = editor;
    this.animation = animation;
    this._keyframe = keyframe;
    this.draggable = true;
    this._lockModelUpdate = false;
    return this;
  }

  updatePosition () {
    this._lockModelUpdate = true;
    if (this.layer) this.position = pt(this.layer.timeline.getPositionFromKeyframe(this), this.timelineKeyframeY);
    this._lockModelUpdate = false;
  }

  get layer () {
    return this.owner;
  }

  async promptRename () {
    const newName = await $world.prompt('Keyframe name:', { input: this.keyframe.name });
    if (newName) {
      this.undoStart('rename keyframe');
      this.name = newName;
      this.undoStop('rename keyframe');
    }
  }

  async promptEasing () {
    const possibleEasings = Keyframe.possibleEasings;
    const preselectIndex = possibleEasings.indexOf(this.keyframe.easingName);
    const listPrompt = new ListPrompt({ label: 'Set Easing', items: possibleEasings });
    listPrompt.preselect = preselectIndex; // TODO: Make this work consistently (fails sometimes because building listprompt is not done yet (whenRendered is no option, this takes a few seconds))
    const result = await $world.openPrompt(listPrompt);
    if (result.selected.length > 0) {
      this.keyframe.setEasing(result.selected[0]);
    }
  }

  menuItems (evt) {
    return [
      ['Rename Keyframe', async () => await this.promptRename()],
      ['Delete Keyframe', () => this.remove()],
      ['Edit Keyframe Position (0 to 1)', async () => { await this.promptUserForNewPosition(); }],
      ['Set Easing', () => this.promptEasing()]
    ];
  }

  async promptUserForNewPosition () {
    const newPosition = await $world.prompt('Keyframe position:', { input: `${this.keyframe.position}` });
    if (newPosition) {
      if (newPosition >= 0 && newPosition <= 1) {
        this.undoStart('change keyframe position');
        this.keyframe.position = newPosition;
        this.updatePosition();
        this.editor.interactive.redraw();
        this.undoStop('change keyframe position');
      } else {
        await $world.inform('Enter a value between 0 and 1.');
        await this.promptUserForNewPosition();
      }
    }
  }

  remove () {
    this.animation.removeKeyframe(this.keyframe);
    this.removeMorph();
  }

  removeMorph () {
    super.remove();
  }

  onMouseUp (evt) {
    super.onMouseUp(evt);
    const scrollPosition = this.layer.timeline.getScrollFromKeyframe(this);
    this.editor.interactiveScrollPosition = scrollPosition;
  }

  onDragStart (event) {
    this.undoStart('keyframe-move');
    event.hand.dragKeyframeStates = [{
      timelineKeyframe: this,
      keyframe: this.keyframe,
      previousPosition: this.keyframe.position
    }];
  }

  onDragEnd (event) {
    this.undoStop('keyframe-move');
    this.editor.interactive.redraw();
    delete event.hand.dragKeyframeStates;
  }

  checkForValidDrag (dragStates) {
    let validDrag = true;
    dragStates.forEach(dragState => {
      if (dragState.keyframe.position < 0 || dragState.keyframe.position > 1) {
        validDrag = false;
        return true;
      }
    });
    return validDrag;
  }

  onDrag (event) {
    super.onDrag(event);
    if (this.keyframe.position < 0) this.keyframe.position = 0;
    if (this.keyframe.position > 1) this.keyframe.position = 1;
    this.updatePosition();
    this.editor.interactive.redraw();
  }

  get isTimelineKeyframe () {
    return true;
  }
}
