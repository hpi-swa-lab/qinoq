import { COLOR_SCHEME } from '../colors.js';
import { pt } from 'lively.graphics';
import { CONSTANTS } from './constants.js';
import { singleSelectKeyPressed } from '../keys.js';
import { getColorForProperty } from '../properties.js';
import { QinoqMorph } from '../qinoq-morph.js';

export class TimelineKeyframe extends QinoqMorph {
  static get properties () {
    return {
      extent: {
        defaultValue: CONSTANTS.KEYFRAME_EXTENT
      },
      fill: {
        defaultValue: COLOR_SCHEME.KEYFRAME_FILL
      },
      rotation: {
        defaultValue: Math.PI / 4
      },
      _keyframe: {
        after: ['name'],
        set (keyframe) {
          this.setProperty('_keyframe', keyframe);
          this.name = keyframe.name;
          // will not trigger change propagation in the easing setter
          this.setProperty('easing', keyframe.easingName);
        }
      },
      animation: {},
      name: {
        after: ['layer'],
        type: String,
        set (name) {
          this.setProperty('name', name);
          if (this._deserializing) return;
          if (this.keyframe) this.keyframe.name = this.name;
          this.setTooltip();
        }
      },
      position: {
        set (point) {
          this.setProperty('position', point);
          if (this._deserializing) return;
          if (this._lockModelUpdate) return;
          if (this.layer) {
            this.keyframe.position = this.timeline.getScrollFromPosition(this.position);
            this.layer.redraw({ doNotRepositionKeyframes: true });
            if (this.currentDragStates && !this.isPrimaryDragTarget) return; // No need for redraw for all dragged keyframes
            this.editor.interactive.redraw();
          }
        }
      },
      draggable: {
        defaultValue: true
      },
      layer: {},
      _lockModelUpdate: {
        after: ['animation', '_editor', '_keyframe'],
        defaultValue: true,
        initialize () {
          this._lockModelUpdate = false;
        }
      },
      isSelected: {
        defaultValue: false,
        set (isSelected) {
          this.setProperty('isSelected', isSelected);
          if (this._deserializing) return;
          this.updateAppearance();
        }
      },
      borderColor: {
        defaultValue: COLOR_SCHEME.KEYFRAME_BORDER
      },
      borderWidth: {
        defaultValue: 2
      },
      easing: {
        after: ['_keyframe', 'layer'],
        set (easing) {
          this.setProperty('easing', easing);
          if (!this._deserializing) {
            this.keyframe.setEasing(this.easing);
            this.setTooltip();
            if (this.layer) this.layer.redraw();
          }
        }
      }
    };
  }

  get keyframe () {
    return this._keyframe;
  }

  get timeline () {
    return this.layer.timeline;
  }

  get timelineKeyframeY () {
    return (CONSTANTS.LAYER_HEIGHT / 2) - (Math.sqrt(2) * CONSTANTS.KEYFRAME_EXTENT.x / 2);
  }

  updatePosition () {
    this._lockModelUpdate = true;
    if (this.layer) this.position = pt(this.timeline.getPositionFromKeyframe(this.keyframe), this.timelineKeyframeY);
    this._lockModelUpdate = false;
  }

  setTooltip () {
    this.tooltip = this.keyframe ? `${this.name}\nEasing: ${this.keyframe.easingName}` : this.name;
  }

  async promptRename () {
    const newName = await $world.prompt('Keyframe name:', { input: this.keyframe.name });
    if (newName) {
      this.undoStart('rename keyframe');
      this.name = newName;
      this.undoStop('rename keyframe');
    }
  }

  menuItems (event) {
    const multipleKeyframesSelected = this.timeline.selectedTimelineKeyframes.length > 1;
    return [
      ['✏️ Rename Selected Keyframes', async () => await this.timeline.promptRenameForSelection(multipleKeyframesSelected)],
      ['❌ Delete Selected Keyframes', () => this.timeline.deleteSelectedItems()],
      ['📏 Edit Selected Relative Keyframe Positions (0 to 1)', async () => { await this.timeline.promptUserForNewRelativePositionForSelection(multipleKeyframesSelected); }],
      ['📏 Edit Selected Absolute Keyframe Position', async () => { await this.timeline.promptUserForNewAbsolutePositionForSelection(multipleKeyframesSelected); }],
      ['📈 Set Easing for Selected Keyframes', () => this.timeline.promptEasingForSelection(multipleKeyframesSelected)]
    ];
  }

  changeKeyframePosition (newPosition, undoable = true) {
    if (undoable) this.undoStart('move-keyframe');
    this.keyframe.position = newPosition;
    this.updatePosition();
    this.layer.redraw();
    this.interactive.redraw();
    if (undoable) this.undoStop('move-keyframe');
  }

  abandon () {
    this.layer.redraw();
    super.abandon();
  }

  delete () {
    this.animation.removeKeyframe(this.keyframe);
    this.remove();
    this.layer.onNumberOfKeyframesChanged();
    this.abandon();
  }

  onMouseDown (event) {
    super.onMouseDown(event);
    if (event.leftMouseButtonPressed() && singleSelectKeyPressed(event)) {
      this.toggleSelection();
    } else if (!this.isSelected) {
      this.timeline.deselectAllTimelineKeyframesExcept(this);
    }
  }

  onDoubleMouseDown () {
    const scrollPosition = this.layer.timeline.getScrollFromKeyframe(this.keyframe);
    this.editor.internalScrollChangeWithGUIUpdate(scrollPosition);
  }

  onMouseUp (event) {
    if (event.leftMouseButtonPressed()) {
      if (!this._dragged && !singleSelectKeyPressed(event)) {
        this.timeline.deselectAllTimelineKeyframesExcept(this);
      } else {
        this._dragged = false;
      }
    }
  }

  toggleSelection () {
    this.isSelected = !this.isSelected;
  }

  onDragStart (event) {
    if (singleSelectKeyPressed(event)) return;
    const undo = this.undoStart('move-keyframe');
    event.hand.dragKeyframeStates = this.timeline.selectedTimelineKeyframes.map(timelineKeyframe => {
      undo.addTarget(timelineKeyframe);
      const state = {
        timelineKeyframe,
        previousPosition: timelineKeyframe.position,
        keyframe: timelineKeyframe.keyframe
      };
      if (timelineKeyframe == this) {
        state.isPrimaryDragTarget = true;
      }
      return state;
    });
  }

  onDragEnd (event) {
    if (!event.hand.dragKeyframeStates) return;
    this.undoStop('move-keyframe');
    this._dragged = true;
    delete event.hand.dragKeyframeStates;
  }

  get currentDragStates () {
    return $world.firstHand.dragKeyframeStates;
  }

  get isPrimaryDragTarget () {
    return this.currentDragStates && this.currentDragStates.find(state => state.isPrimaryDragTarget).timelineKeyframe == this;
  }

  isValidDrag (dragStates) {
    return !dragStates.some(dragState => (dragState.keyframe.position < 0 || dragState.keyframe.position > 1));
  }

  onDrag (event) {
    if (!event.hand.dragKeyframeStates) return;

    const { dragStartMorphPosition, absDragDelta } = event.state;
    this.position = pt(dragStartMorphPosition.x + absDragDelta.x, this.timelineKeyframeY);

    const referenceDragState = event.hand.dragKeyframeStates.find(dragState => dragState.timelineKeyframe == this);

    const prevPositionX = referenceDragState.previousPosition.x;
    const dragDeltaX = prevPositionX - this.position.x;

    // Handle dragging when multiple keyframes are dragged together
    event.hand.dragKeyframeStates.forEach(dragState => {
      if (dragState.timelineKeyframe != this) {
        dragState.timelineKeyframe.position = pt(dragState.previousPosition.x - dragDeltaX, dragState.previousPosition.y);
      }
    });

    if (!this.isValidDrag(event.hand.dragKeyframeStates)) {
      event.hand.dragKeyframeStates.forEach(stateForKeyframe => {
        stateForKeyframe.timelineKeyframe.position = stateForKeyframe.previousPosition;
      });
    } else {
      event.hand.dragKeyframeStates.forEach(stateForKeyframe => {
        stateForKeyframe.previousPosition = stateForKeyframe.timelineKeyframe.position;
      });
    }
  }

  get isTimelineKeyframe () {
    return true;
  }

  updateAppearance () {
    this.borderColor = this.isSelected ? COLOR_SCHEME.PRIMARY : COLOR_SCHEME.KEYFRAME_BORDER;
  }
}

export class KeyframeLine extends QinoqMorph {
  static get properties () {
    return {
      animation: {
        set (animation) {
          this.setProperty('animation', animation);
          if (!this._deserializing) {
            this.fill = getColorForProperty(animation.property);
            this.setTooltip();
          }
        }
      },
      yPosition: {
        after: ['animation', 'layer'],
        set (yPosition) {
          this.setProperty('yPosition', yPosition);
          if (!this._deserializing) {
            this.updatePosition();
          }
        }
      },
      layer: {},
      _editor: {},
      height: {
        defaultValue: CONSTANTS.KEYFRAME_LINE_HEIGHT
      }
    };
  }

  get timeline () {
    return this.layer.timeline;
  }

  get isKeyframeLine () {
    return true;
  }

  setTooltip () {
    this.tooltip = `Property: ${this.animation.property}`;
  }

  addKeyframes () {
    this.animation.keyframes.forEach(keyframe => {
      const position = pt(this.timeline.getPositionFromKeyframe(keyframe) - this.position.x,
        -CONSTANTS.KEYFRAME_EXTENT.scaleBy(CONSTANTS.KEYFRAME_LINE_KEYFRAME_SCALE).x / 2 / Math.sqrt(2));
      this.addMorph(new QinoqMorph({
        position,
        extent: CONSTANTS.KEYFRAME_EXTENT.scaleBy(CONSTANTS.KEYFRAME_LINE_KEYFRAME_SCALE),
        fill: COLOR_SCHEME.KEYFRAME_BORDER,
        rotation: Math.PI / 4,
        name: 'aKeyframeLineKeyframe'
      }));
    });
  }

  updatePosition () {
    this.submorphs.forEach(keyframe => keyframe.abandon());
    this.addKeyframes();
    const start = Math.min(...this.animation.keyframes.map(keyframe => this.timeline.getPositionFromKeyframe(keyframe)));
    const end = Math.max(...this.animation.keyframes.map(keyframe => this.timeline.getPositionFromKeyframe(keyframe)));
    this.width = end - start;
    this.position = pt(start, this.yPosition);
  }
}
