import { COLOR_SCHEME } from '../colors.js';
import { pt } from 'lively.graphics';
import { singleSelectKeyPressed } from '../keys.js';
import { getColorForProperty } from '../properties.js';
import { QinoqMorph } from '../qinoq-morph.js';
import { Polygon } from 'lively.morphic';
import { arr } from 'lively.lang';
import { TIMELINE_CONSTANTS } from './constants.js';

export class TimelineKeyframe extends QinoqMorph {
  static get properties () {
    return {
      extent: {
        defaultValue: TIMELINE_CONSTANTS.KEYFRAME_EXTENT
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
          if (this._deserializing || this._lockModelUpdate) return;
          if (this.layer) {
            this.keyframe.position = this.timeline.getScrollFromPosition(this.position);
            this.layer.redraw({ doNotRepositionKeyframes: true });
            this.editor.ui.inspector.animationsInspector.updateKeyframeButtonStyle(this.animation);
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

  updatePosition () {
    this._lockModelUpdate = true;
    if (this.layer) this.position = pt(this.timeline.getPositionFromKeyframe(this.keyframe), TIMELINE_CONSTANTS.KEYFRAME_Y_OFFSET);
    this._lockModelUpdate = false;
  }

  setTooltip () {
    this.tooltip = this.keyframe ? `${this.name}\nEasing: ${this.keyframe.easingName}` : this.name;
  }

  menuItems (event) {
    const multipleKeyframesSelected = this.timeline.selectedTimelineKeyframes.length > 1;
    return [
      ['✏️ Rename Selected Keyframes', async () => await this.timeline.promptRenameForSelection(multipleKeyframesSelected)],
      ['🗑️ Delete Selected Keyframes', () => this.timeline.deleteSelectedItems()],
      ['📏 Edit Selected Relative Keyframe Positions (0 to 1)', async () => { await this.timeline.promptUserForNewRelativePositionForSelection(multipleKeyframesSelected); }],
      ['📏 Edit Selected Absolute Keyframe Position', async () => { await this.timeline.promptUserForNewAbsolutePositionForSelection(multipleKeyframesSelected); }],
      ['📈 Set Easing for Selected Keyframes', () => this.timeline.promptEasingForSelection(multipleKeyframesSelected)]
    ];
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

    this.prepareSnappingData(event);
  }

  onDragEnd (event) {
    if (!event.hand.dragKeyframeStates) return;
    this.undoStop('move-keyframe');
    this._dragged = true;
    this.clearSnappingData();
    event.hand.dragKeyframeStates.forEach(dragKeyframeState => dragKeyframeState.timelineKeyframe.removeSnapIndicators());
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
    this.position = pt(dragStartMorphPosition.x + absDragDelta.x, TIMELINE_CONSTANTS.KEYFRAME_Y_OFFSET);

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
      this.handleSnapping(event.hand.dragKeyframeStates);
      event.hand.dragKeyframeStates.forEach(stateForKeyframe => {
        stateForKeyframe.previousPosition = stateForKeyframe.timelineKeyframe.position;
      });
    }
  }

  handleSnapping (dragKeyframeStates) {
    if (!this.editor.snappingEnabled) return;
    dragKeyframeStates.forEach(dragKeyframeState => dragKeyframeState.timelineKeyframe.removeSnapIndicators());
    if (this._otherKeyframesSortedByPosition.length == 0) return;
    const positionsOfSnapTargets = dragKeyframeStates.map(dragKeyframeState => dragKeyframeState.keyframe.position);

    const snapTarget = this.getClosestKeyframe(positionsOfSnapTargets);
    if (snapTarget) dragKeyframeStates.forEach(dragKeyframeState => dragKeyframeState.timelineKeyframe.snapTo(snapTarget));
    dragKeyframeStates.forEach(dragKeyframeState => dragKeyframeState.timelineKeyframe.buildSnapIndicators());
  }

  getClosestKeyframe (positionsOfSnapTargets) {
    let closestKeyframe;
    let diff = -1;

    positionsOfSnapTargets.forEach(snapTargetPosition => {
      const candidate = arr.binarySearchFor(
        this._otherKeyframesSortedByPosition,
        snapTargetPosition,
        (element) => element.position,
        true
      );

      const diffOfCandidate = Math.abs(candidate.position - snapTargetPosition);

      if (!closestKeyframe || diffOfCandidate < diff) {
        closestKeyframe = candidate;
        diff = diffOfCandidate;
      }
    });
    return closestKeyframe;
  }

  snapTo (keyframe) {
    const snapPositionOnTimeline = Math.round(this.timeline.getPositionFromKeyframe(keyframe));
    const diff = Math.abs(this.position.x - snapPositionOnTimeline);

    if (TIMELINE_CONSTANTS.SNAPPING_THRESHOLD < diff) return;
    this.timeline.selectedTimelineKeyframes.filter(otherKeyframe => !otherKeyframe.keyframe.equals(this.keyframe)).forEach(timelineKeyframe =>
      timelineKeyframe.position = pt(Math.abs(this.position.x - snapPositionOnTimeline - timelineKeyframe.position.x), TIMELINE_CONSTANTS.KEYFRAME_Y_OFFSET));

    this.position = pt(snapPositionOnTimeline, TIMELINE_CONSTANTS.KEYFRAME_Y_OFFSET);
  }

  prepareSnappingData (event) {
    if (!this.editor.snappingEnabled) return;
    const otherKeyframes = this.timeline.sequence.allKeyframes.filter(keyframe => !event.hand.dragKeyframeStates.map(dragKeyframeState => dragKeyframeState.keyframe).includes(keyframe));
    this._otherKeyframesSortedByPosition = [...otherKeyframes].sort((a, b) => a.position - b.position);
  }

  clearSnappingData () {
    if (!this.editor.snappingEnabled) return;
    delete this._otherKeyframesSortedByPosition;
  }

  removeSnapIndicators () {
    if (this._snapIndicators) this._snapIndicators.forEach(indicator => indicator.abandon());
    this._snapIndicators = [];

    if (this._snapLinesIndicators) this._snapLinesIndicators.forEach(indicator => indicator.fill = COLOR_SCHEME.KEYFRAME_BORDER);
    this._snapLinesIndicators = [];
  }

  buildSnapIndicators () {
    let snapIndicator = false;
    this.timeline.keyframes.filter(keyframe => !keyframe.keyframe.equals(this.keyframe)).forEach(timelineKeyframe => {
      if (this.position.x == timelineKeyframe.position.x) {
        snapIndicator = true;
        this._snapIndicators.push(timelineKeyframe.owner.addMorph(timelineKeyframe.buildSnapIndicator()));
      }
    });

    this.timeline.overviewLayers
      .flatMap(overviewLayer => overviewLayer.keyframeLines)
      .flatMap(keyframeLine => keyframeLine.keyframes.filter(keyframe => keyframe.position.x + keyframeLine.position.x == this.position.x))
      .forEach(keyframe => {
        keyframe.fill = COLOR_SCHEME.PRIMARY;
        this._snapLinesIndicators.push(keyframe);
        snapIndicator = true;
      });
    if (snapIndicator) this._snapIndicators.push(this.owner.addMorph(this.buildSnapIndicator()));
  }

  buildSnapIndicator () {
    const spacing = TIMELINE_CONSTANTS.KEYFRAME_SNAP_INDICATOR_SPACING;
    const mid = TIMELINE_CONSTANTS.SNAP_INDICATOR_WIDTH / 2;
    const vertices = [pt(-mid, -spacing), pt(mid, -spacing), pt(mid / 4, 0), pt(mid / 4, TIMELINE_CONSTANTS.KEYFRAME_HEIGHT), pt(mid, TIMELINE_CONSTANTS.KEYFRAME_HEIGHT + spacing), pt(-mid, TIMELINE_CONSTANTS.KEYFRAME_HEIGHT + spacing), pt(-mid / 4, TIMELINE_CONSTANTS.KEYFRAME_HEIGHT), pt(-mid / 4, 0)];
    return new Polygon({
      fill: COLOR_SCHEME.PRIMARY,
      position: pt(this.center.x - TIMELINE_CONSTANTS.SNAP_INDICATOR_WIDTH / 2,
        0),
      vertices
    });
  }

  get isTimelineKeyframe () {
    return true;
  }

  get mayBeSelected () {
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
        defaultValue: TIMELINE_CONSTANTS.KEYFRAME_LINE_HEIGHT
      }
    };
  }

  get timeline () {
    return this.layer.timeline;
  }

  get isKeyframeLine () {
    return true;
  }

  get keyframes () {
    return this.submorphs;
  }

  setTooltip () {
    this.tooltip = `Property: ${this.animation.property}`;
  }

  addKeyframes () {
    this.animation.keyframes.forEach(keyframe => {
      const position = pt(
        this.timeline.getPositionFromKeyframe(keyframe) - this.position.x,
        -TIMELINE_CONSTANTS.KEYFRAME_EXTENT.scaleBy(TIMELINE_CONSTANTS.KEYFRAME_LINE_KEYFRAME_SCALE).x / 2 / Math.sqrt(2));
      this.addMorph(new QinoqMorph({
        position,
        extent: TIMELINE_CONSTANTS.KEYFRAME_EXTENT.scaleBy(TIMELINE_CONSTANTS.KEYFRAME_LINE_KEYFRAME_SCALE),
        fill: COLOR_SCHEME.KEYFRAME_BORDER,
        rotation: Math.PI / 4,
        name: 'aKeyframeLineKeyframe'
      }));
    });
  }

  updatePosition () {
    const start = Math.min(...this.animation.keyframes.map(keyframe => this.timeline.getPositionFromKeyframe(keyframe)));
    const end = Math.max(...this.animation.keyframes.map(keyframe => this.timeline.getPositionFromKeyframe(keyframe)));
    this.width = end - start;
    this.position = pt(start, this.yPosition);
    this.keyframes.forEach(keyframe => keyframe.abandon());
    this.addKeyframes();
  }
}
