import { Morph } from 'lively.morphic';
import { COLOR_SCHEME } from '../colors.js';
import { pt } from 'lively.graphics';
import { CONSTANTS } from './constants.js';
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
      keyframe: {
        set (keyframe) {
          this.setProperty('keyframe', keyframe);
          this.name = keyframe.name;
          this.position = this.getPositionFromProgress(this.keyframe.position);
        }
      },
      animation: {},
      name: {
        type: String,
        set (name) {
          this.setProperty('name', name);
          this.tooltip = this.name;
          if (this.keyframe) {
            this.keyframe.name = this.name;
          }
        }
      },
      position: {
        set (point) {
          this.setProperty('position', point);
          if (this.layer) this.keyframe.position = this.layer.timeline.getScrollFromPosition(this.position);
        }
      },
      draggable: {
        defaultValue: true
      },
      _editor: {}
    };
  }

  get editor () {
    return this._editor;
  }

  initialize (editor, keyframe, animation) {
    this._editor = editor;
    this.animation = animation;
    this.keyframe = keyframe;
    this.draggable = true;
    return this;
  }

  get layer () {
    return this.owner;
  }

  getPositionFromProgress (progress) {
    const x = (CONSTANTS.IN_EDIT_MODE_SEQUENCE_WIDTH * progress) + CONSTANTS.SEQUENCE_INITIAL_X_OFFSET;
    const y = (CONSTANTS.LAYER_HEIGHT / 2) - (Math.sqrt(2) * CONSTANTS.KEYFRAME_EXTENT.x / 2);
    return pt(x, y);
  }

  async rename () {
    const newName = await $world.prompt('Keyframe name:', { input: this.keyframe.name });
    if (newName) this.name = newName;
  }

  menuItems (evt) {
    return [
      ['Rename Keyframe', async () => await this.rename()],
      ['Delete Keyframe', () => this.remove()],
      ['Edit Keyframe Position (0 to 1)', async () => { await this.promptUserForNewPosition(); }]
    ];
  }

  async promptUserForNewPosition () {
    const newPosition = await $world.prompt('Keyframe position:', { input: this.keyframe.position });
    if (newPosition) {
      if (newPosition >= 0 && newPosition <= 1) {
        this.keyframe.position = newPosition;
        this.position = this.getPositionFromProgress(this.keyframe.position);
        this.editor.interactive.redraw();
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
    const scrollPosition = this.keyframe.calculatePositionInInteractive(this.animation.target);
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
    this.position = this.getPositionFromProgress(this.keyframe.position);
    this.editor.interactive.redraw();
  }

  get isTimelineKeyframe () {
    return true;
  }
}
