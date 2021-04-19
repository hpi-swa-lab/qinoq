import { Morph } from 'lively.morphic';
import { COLOR_SCHEME } from '../colors.js';
import { pt } from 'lively.graphics';
import { CONSTANTS } from './constants.js';
import { singleSelectKeyPressed } from '../keys.js';
import { getColorForProperty } from '../properties.js';

export class TimelineKeyframe extends Morph {
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
          if (this.keyframe) this.keyframe.name = this.name;
          this.setTooltip();
        }
      },
      position: {
        set (point) {
          this.setProperty('position', point);
          if (this._lockModelUpdate) return;
          if (this.layer) {
            this.keyframe.position = this.layer.timeline.getScrollFromPosition(this.position);
            this.editor.interactive.redraw();
            this.layer.redraw();
          }
        }
      },
      draggable: {
        defaultValue: true
      },
      layer: {},
      _editor: {},
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
        set (easing) {
          this.setProperty('easing', easing);
          this.keyframe.setEasing(this.easing);
          this.setTooltip();
          if (this.layer) this.layer.redraw();
        }
      }
    };
  }

  get keyframe () {
    return this._keyframe;
  }

  get editor () {
    return this._editor;
  }

  get timeline () {
    return this.layer.timeline;
  }

  get timelineKeyframeY () {
    return (CONSTANTS.LAYER_HEIGHT / 2) - (Math.sqrt(2) * CONSTANTS.KEYFRAME_EXTENT.x / 2);
  }

  updatePosition () {
    this._lockModelUpdate = true;
    if (this.layer) this.position = pt(this.layer.timeline.getPositionFromKeyframe(this.keyframe), this.timelineKeyframeY);
    this._lockModelUpdate = false;
  }

  get inOverviewLayer () {
    return this.layer.isOverviewLayer;
  }

  setTooltip () {
    if (this.inOverviewLayer) {
      this.tooltip = this.animation ? `${this.name}\nProperty: ${this.animation.property}` : this.name;
    } else {
      this.tooltip = this.keyframe ? `${this.name}\nEasing: ${this.keyframe.easingName}` : this.name;
    }
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
    this.editor.interactive.redraw();
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
    const scrollPosition = this.layer.timeline.getScrollFromKeyframe(this);
    this.editor.interactiveScrollPosition = scrollPosition;
  }

  onMouseUp (event) {
    if (!this._dragged && !event.isShiftDown()) {
      this.timeline.deselectAllTimelineKeyframesExcept(this);
    } else {
      this._dragged = false;
    }
  }

  toggleSelection () {
    this.isSelected = !this.isSelected;
  }

  onDragStart (event) {
    if (singleSelectKeyPressed(event)) return;
    const undo = this.undoStart('move-keyframe');
    event.hand.dragKeyframeStates = this.timeline.selectedTimelineKeyframes.map(timelinekeyframe => {
      undo.addTarget(timelinekeyframe);
      return {
        timelineKeyframe: timelinekeyframe,
        previousPosition: timelinekeyframe.position,
        keyframe: timelinekeyframe.keyframe
      };
    });
  }

  onDragEnd (event) {
    if (!event.hand.dragKeyframeStates) return;
    this.undoStop('move-keyframe');
    this._dragged = true;
    delete event.hand.dragKeyframeStates;
  }

  isValidDrag (dragStates) {
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
    if (!event.hand.dragKeyframeStates) return;
    super.onDrag(event);
    this.position = pt(this.position.x, this.timelineKeyframeY);

    const referenceDragState = event.hand.dragKeyframeStates.filter(dragState => dragState.timelineKeyframe == this)[0];
    const prevPositionX = referenceDragState.previousPosition.x;
    const dragDeltaX = prevPositionX - this.position.x;

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

    this.editor.interactive.redraw();
  }

  get isTimelineKeyframe () {
    return true;
  }

  updateAppearance () {
    this.borderColor = this.isSelected ? COLOR_SCHEME.PRIMARY : COLOR_SCHEME.KEYFRAME_BORDER;
  }
}

export class KeyframeLine extends Morph {
  static get properties () {
    return {
      animation: {
        set (animation) {
          this.setProperty('animation', animation);
          this.fill = getColorForProperty(animation.property);
          this.setTooltip();
        }
      },
      y: {
        after: ['animation', 'layer'],
        set (y) {
          this.setProperty('y', y);
          this.updatePosition();
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
      this.addMorph(new Morph({
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
    this.position = pt(start, this.y);
  }
}
