import { Polygon, Morph, Label } from 'lively.morphic';
import { COLOR_SCHEME } from '../colors.js';
import { pt, LinearGradient, rect } from 'lively.graphics';
import { connect, disconnect, disconnectAll } from 'lively.bindings';
import { TIMELINE_CONSTANTS } from './constants.js';
import { arr } from 'lively.lang';
import { singleSelectKeyPressed, rangeSelectKeyPressed } from '../keys.js';
import { QinoqMorph } from '../qinoq-morph.js';
import { error } from '../utilities/messages.js';

export class TimelineSequence extends QinoqMorph {
  static get properties () {
    return {
      acceptsDrops: {
        defaultValue: false
      },
      draggable: {
        defaultValue: true
      },
      clipMode: {
        defaultValue: 'hidden'
      },
      nativeCursor: {
        defaultValue: 'default'
      },
      borderWidth: {
        defaultValue: 1
      },
      borderColor: {
        defaultValue: COLOR_SCHEME.ON_BACKGROUND
      },
      borderRadius: {
        defaultValue: 3
      },
      caption: {
        after: ['submorphs'],
        set (caption) {
          if (!caption) return;
          this.setProperty('caption', caption);
          this.label.textString = caption;
          this.sequence.name = caption;
          this.tooltip = caption;
        }
      },
      sequence: {
        set (sequence) {
          this.setProperty('sequence', sequence);
        }
      },
      ui: {
        initialize () {
          if (!this._deserializing) this.ui = {};
        }
      },
      _lockModelUpdate: {
        // Needs to be true since otherwise the morph creation will trigger unwanted
        // calls to updateSequenceAfterArrangement.
        // Will be set to false after initialization.
        defaultValue: true
      },
      height: {
        defaultValue: TIMELINE_CONSTANTS.SEQUENCE_HEIGHT
      },
      timelineLayer: {
        set (timelineLayer) {
          this.setProperty('timelineLayer', timelineLayer);
          if (!this._lockModelUpdate && !this._deserializing) {
            this.onTimelineLayerChange(timelineLayer);
          }
        }
      },
      _snapIndicators: {
        defaultValue: []
      },
      extent: {
        set (extent) {
          this.setProperty('extent', extent);
          if (extent.x < TIMELINE_CONSTANTS.MINIMAL_SEQUENCE_WIDTH && this.hasResizers) this.removeResizers();
          else if (extent.x >= TIMELINE_CONSTANTS.MINIMAL_SEQUENCE_WIDTH && !this.hasResizers) this.restoreResizers();
          if (!this._lockModelUpdate && !this._deserializing) { this.updateSequenceAfterArrangement(); }
        }
      },
      position: {
        set (position) {
          this.setProperty('position', position);
          if (this.hasResizers) {
            this.ui.leftResizer.position = pt(0, 0);
            this.ui.rightResizer.position = pt(this.width - this.ui.rightResizer.width, 0);
          }
          if (!this._lockModelUpdate && !this._deserializing && !this.inMultiDrag) { this.updateSequenceAfterArrangement(); }
        }
      },
      isSelected: {
        defaultValue: false,
        type: 'Boolean',
        set (selected) {
          this.setProperty('isSelected', selected);
          this.onSelectionChange(selected);
        }
      },
      _editor: {
        after: ['timelineLayer', 'sequence', '_lockModelUpdate', 'height'],
        set (editor) {
          this.setProperty('_editor', editor);
          if (!this._deserializing) { this.initialize(); } // _editor should be set only once and then when deserializing
        }
      },
      isHidden: {
        defaultValue: false,
        set (isHidden) {
          this.setProperty('isHidden', isHidden);
          this.sequence.isHidden = isHidden;
          if (isHidden) this.fill = COLOR_SCHEME.ON_BACKGROUND_VARIANT;
          if (!isHidden) this.fill = COLOR_SCHEME.BACKGROUND;
        }
      },
      label: {}
    };
  }

  // Is automatically called on creation when "_editor" is set
  initialize () {
    const startPosition = this.timelineLayer.timeline.getPositionFromScroll(this.sequence.start);
    const endPosition = startPosition + this.timelineLayer.timeline.getWidthFromDuration(this.sequence.duration);
    this.position = pt(startPosition, TIMELINE_CONSTANTS.SEQUENCE_Y_OFFSET);
    this.width = endPosition - startPosition;
    this.label = new Label({
      padding: rect(5, 4, 0, 0),
      reactsToPointer: false
    });
    this.addMorph(this.label);
    this.timelineLayer.addMorph(this);
    this.caption = this.sequence.name;
    connect(this.sequence, 'name', this, 'caption');
    this.initializeResizers();
    this._lockModelUpdate = false;
    this.updateAppearance();
  }

  initializeResizers () {
    const resizerProps = {
      fill: COLOR_SCHEME.TRANSPARENT,
      width: 7,
      draggable: true,
      nativeCursor: 'ew-resize',
      height: this.height
    };

    this.ui.rightResizer = new QinoqMorph({
      name: 'right resizer',
      position: pt(this.width - resizerProps.width, 0),
      ...resizerProps
    });
    this.ui.leftResizer = new QinoqMorph({
      name: 'left resizer',
      position: pt(0, 0),
      ...resizerProps
    });

    connect(this.ui.rightResizer, 'onDrag', this, 'onResizeRight');
    connect(this.ui.rightResizer, 'onDragStart', this, 'onResizeStart');
    connect(this.ui.rightResizer, 'onDragEnd', this, 'onResizeEnd');
    connect(this.ui.leftResizer, 'onDrag', this, 'onResizeLeft');
    connect(this.ui.leftResizer, 'onDragStart', this, 'onResizeStart');
    connect(this.ui.leftResizer, 'onDragEnd', this, 'onResizeEnd');

    this.addMorphBack(this.ui.rightResizer);
    this.addMorphBack(this.ui.leftResizer);
  }

  get hasResizers () {
    // assumes that rightResizer and leftResizer are always in the same state
    return (this.ui && this.ui.rightResizer && this.ui.rightResizer.owner == this);
  }

  removeResizers () {
    this.ui.rightResizer.remove();
    this.ui.leftResizer.remove();
  }

  restoreResizers () {
    if (this.ui && this.ui.rightResizer) {
      this.addMorphBack(this.ui.rightResizer);
      this.addMorphBack(this.ui.leftResizer);
    }
  }

  onDoubleMouseDown (event) {
    this.openSequenceView();
  }

  openSequenceView () {
    return this.editor.initializeSequenceView(this.sequence);
  }

  get rectangularSelectionFilter () {
    return sequence => {
      const minX = Math.min(this.timeline._lastSelectedTimelineSequence.globalPosition.x, this.globalPosition.x);
      const maxX = Math.max(this.timeline._lastSelectedTimelineSequence.worldPoint(pt(this.timeline._lastSelectedTimelineSequence.width, 0)).x, this.worldPoint(pt(this.width, 0)).x);
      const minY = Math.min(this.timeline._lastSelectedTimelineSequence.globalPosition.y, this.globalPosition.y);
      const maxY = Math.max(this.timeline._lastSelectedTimelineSequence.globalPosition.y, this.globalPosition.y);
      return ((sequence.globalPosition.x >= minX && sequence.globalPosition.x <= maxX) ||
            (sequence.worldPoint(pt(sequence.width, 0)).x >= minX && sequence.worldPoint(pt(sequence.width, 0)).x <= maxX)) &&
        (sequence.globalPosition.y >= minY && sequence.globalPosition.y <= maxY);
    };
  }

  onMouseDown (event) {
    super.onMouseDown(event);
    if (!this.isSelected && !singleSelectKeyPressed(event) && !rangeSelectKeyPressed(event)) {
      this.timeline.deselectAllSequencesExcept(this);
      this.timeline._lastSelectedTimelineSequence = this;
      return;
    }
    if (event.leftMouseButtonPressed()) {
      if (rangeSelectKeyPressed(event) && !this.isSelected && this.timeline._lastSelectedTimelineSequence && this.timeline.getSelectedTimelineSequences().length > 0) {
        this.timeline.selectAllItems(this.rectangularSelectionFilter);
      } else if (rangeSelectKeyPressed(event) && this.isSelected && this.timeline._lastSelectedTimelineSequence) {
        this.timeline.deselectAllItems(this.rectangularSelectionFilter);
      } else if (singleSelectKeyPressed(event)) {
        this.toggleSelected();
      }
      this.timeline._lastSelectedTimelineSequence = this;
    }
  }

  toggleSelected () {
    this.isSelected = !this.isSelected;
  }

  onSelectionChange (selected) {
    this.borderColor = selected ? COLOR_SCHEME.PRIMARY : COLOR_SCHEME.ON_BACKGROUND;
  }

  onDragStart (event) {
    if (singleSelectKeyPressed(event)) return;
    this.isSelected = true;
    this._dragged = true;
    const undo = this.undoStart('move-timeline-sequence');
    event.hand.timelineSequenceStates = this.timeline.getSelectedTimelineSequences().map(timelineSequence => {
      undo.addTarget(timelineSequence);
      return {
        timelineSequence: timelineSequence,
        previousPosition: timelineSequence.position,
        previousWidth: timelineSequence.width,
        previousTimelineLayer: timelineSequence.timelineLayer,
        isMove: true
      };
    });
    const leftMostSequence = this.timeline.getSelectedTimelineSequences().sort((a, b) => a.sequence.start - b.sequence.start)[0];
    event.hand.leftMostSequenceStates = this.timeline.getSelectedTimelineSequences().map(timelineSequence => {
      if (timelineSequence.sequence.start == leftMostSequence.sequence.start) {
        return {
          timelineSequence: timelineSequence,
          previousPosition: timelineSequence.position
        };
      }
    }).filter(Boolean);
    event.hand.draggedSequence = this;

    this.prepareSnappingData(event);
  }

  onDragEnd (event) {
    if (singleSelectKeyPressed(event)) return;
    this.undoStop('move-timeline-sequence');
    this.handleOverlappingOtherSequence(event.hand.timelineSequenceStates);
    event.hand.leftMostSequenceStates.forEach(timelineSequenceState => timelineSequenceState.timelineSequence.hideWarning('left'));

    event.hand.timelineSequenceStates.forEach(timelineSequenceState => timelineSequenceState.timelineSequence.removeSnapIndicators());
    this.clearSnappingData();

    delete event.hand.timelineSequenceStates;
    delete event.hand.leftMostSequenceStates;
    delete event.hand.draggedSequence;
  }

  get dragSequenceStates () {
    return $world.firstHand.timelineSequenceStates;
  }

  get inMultiDrag () {
    return this.dragSequenceStates && this.dragSequenceStates.length > 1;
  }

  onDrag (event) {
    if (!event.hand.timelineSequenceStates) return;

    const { dragStartMorphPosition, absDragDelta } = event.state;
    this.position = pt(dragStartMorphPosition.x + absDragDelta.x, TIMELINE_CONSTANTS.SEQUENCE_Y_OFFSET);
    const dragDeltaX = absDragDelta.x;
    event.hand.timelineSequenceStates.filter(dragState => dragState.timelineSequence !== this).forEach(dragState => {
      dragState.timelineSequence.position = pt(dragState.previousPosition.x + dragDeltaX, TIMELINE_CONSTANTS.SEQUENCE_Y_OFFSET);
    });

    if (event.hand.leftMostSequenceStates[0].timelineSequence.position.x <= TIMELINE_CONSTANTS.SEQUENCE_INITIAL_X_OFFSET) {
      event.hand.leftMostSequenceStates[0].timelineSequence.position = pt(TIMELINE_CONSTANTS.SEQUENCE_INITIAL_X_OFFSET, TIMELINE_CONSTANTS.SEQUENCE_Y_OFFSET);
      event.hand.leftMostSequenceStates.forEach(timelineSequenceState => timelineSequenceState.timelineSequence.showWarning('left', event.hand.position.x));

      event.hand.timelineSequenceStates.forEach(dragState => {
        dragState.timelineSequence.position = pt(TIMELINE_CONSTANTS.SEQUENCE_INITIAL_X_OFFSET + dragState.previousPosition.x - event.hand.leftMostSequenceStates[0].previousPosition.x, TIMELINE_CONSTANTS.SEQUENCE_Y_OFFSET);
      });
    } else {
      event.hand.leftMostSequenceStates.forEach(timelineSequenceState => timelineSequenceState.timelineSequence.hideWarning('left'));
    }
    this.handleSnapping('drag', event.hand.timelineSequenceStates);
    event.hand.timelineSequenceStates.forEach(dragState => {
      dragState.timelineSequence.updateAppearance();
    });

    // when multiple sequences are dragged, the sequences are not arranged in the position setter
    if (this.inMultiDrag) this.updateDraggedSequencesAfterArrangement();
  }

  removeSnapIndicators () {
    this._snapIndicators.forEach(indicator => indicator.abandon());
    this._snapIndicators = [];
  }

  prepareSnappingData (event) {
    if (!this.editor.snappingEnabled) return;
    const otherTimelineSequences = this.allTimelineSequences.filter(sequence => !event.hand.timelineSequenceStates.map(timelineSequenceState => timelineSequenceState.timelineSequence).includes(sequence));
    this._otherTimelineSequencesSortedByStart = [...otherTimelineSequences].sort((a, b) => a.sequence.start - b.sequence.start);
    this._otherTimelineSequencesSortedByEnd = [...otherTimelineSequences].sort((a, b) => a.sequence.end - b.sequence.end);
  }

  clearSnappingData () {
    if (!this.editor.snappingEnabled) return;
    delete this._otherTimelineSequencesSortedByStart;
    delete this._otherTimelineSequencesSortedByEnd;
  }

  handleSnapping (mode, timelineSequenceStates) {
    if (!this.editor.snappingEnabled) return;

    timelineSequenceStates.forEach(timelineSequenceState => timelineSequenceState.timelineSequence.removeSnapIndicators());
    if (this._otherTimelineSequencesSortedByStart.length == 0) return;
    let positionsOfSnapTargets = [];
    switch (mode) {
      case 'drag': positionsOfSnapTargets = timelineSequenceStates.flatMap(timelineSequenceState => { return [timelineSequenceState.timelineSequence.sequence.start, timelineSequenceState.timelineSequence.sequence.end]; });
        break;
      case 'resizeLeft': positionsOfSnapTargets = [this.sequence.start];
        break;
      case 'resizeRight': positionsOfSnapTargets = [this.sequence.end];
        break;
    }

    const snapPosition = this.timeline.getPositionFromScroll(this.getSnappingPosition(positionsOfSnapTargets));
    if (snapPosition) timelineSequenceStates.forEach(timelineSequenceState => timelineSequenceState.timelineSequence.snapTo(snapPosition, mode));

    timelineSequenceStates.forEach(timelineSequenceState => timelineSequenceState.timelineSequence.buildSnapIndicators(mode));
  }

  getSnappingPosition (positionsOfSnapTargets) {
    const sequencesSortedByStart = this._otherTimelineSequencesSortedByStart;
    const sequencesSortedByEnd = this._otherTimelineSequencesSortedByEnd;

    let closestSequenceByStart;
    let closestSequenceByEnd;
    let diffByStart = -1;
    let diffByEnd = -1;

    positionsOfSnapTargets.forEach(snapTargetPosition => {
      const candidateByStart = arr.binarySearchFor(
        sequencesSortedByStart,
        snapTargetPosition,
        (element) => element.sequence.start,
        true
      );
      const candidateByEnd = arr.binarySearchFor(
        sequencesSortedByEnd,
        snapTargetPosition,
        (element) => element.sequence.end,
        true
      );

      const diffOfCandidateByStart = Math.abs(candidateByStart.sequence.start - snapTargetPosition);
      const diffOfCandidateByEnd = Math.abs(candidateByEnd.sequence.end - snapTargetPosition);

      if (!closestSequenceByStart || diffOfCandidateByStart < diffByStart) {
        closestSequenceByStart = candidateByStart;
        diffByStart = diffOfCandidateByStart;
      }

      if (!closestSequenceByEnd || diffOfCandidateByEnd < diffByEnd) {
        closestSequenceByEnd = candidateByEnd;
        diffByEnd = diffOfCandidateByEnd;
      }
    });

    return diffByEnd > diffByStart
      ? closestSequenceByStart.sequence.start
      : closestSequenceByEnd.sequence.end;
  }

  snapTo (snapPosition, mode) {
    const diffToStart = Math.abs(this.position.x - snapPosition);
    const diffToEnd = Math.abs(this.topRight.x - snapPosition);
    const startIsCloserThanEnd = diffToStart < diffToEnd;

    if (TIMELINE_CONSTANTS.SNAPPING_THRESHOLD < (startIsCloserThanEnd ? diffToStart : diffToEnd)) {
      return;
    }

    switch (mode) {
      case 'drag': {
        const snapTarget = startIsCloserThanEnd ? 'position' : 'topRight';

        this.timeline.getSelectedTimelineSequences(s => s !== this).forEach(timelineSequence =>
          timelineSequence[snapTarget] = pt(
            Math.abs(this[snapTarget].x - snapPosition - timelineSequence[snapTarget].x),
            TIMELINE_CONSTANTS.SEQUENCE_Y_OFFSET));

        this[snapTarget] = pt(snapPosition, TIMELINE_CONSTANTS.SEQUENCE_Y_OFFSET);
        break;
      }

      case 'resizeLeft': {
        if (!startIsCloserThanEnd) return;
        const newWidth = this.topRight.x - snapPosition;
        this.position = pt(snapPosition, TIMELINE_CONSTANTS.SEQUENCE_Y_OFFSET);
        this.width = newWidth;
        break;
      }

      case 'resizeRight': {
        if (startIsCloserThanEnd) return;
        this.width = Math.abs(this.position.x - snapPosition);
        break;
      }
    }
  }

  buildSnapIndicators (mode) {
    let buildRightIndicator, buildLeftIndicator;
    this.allTimelineSequences.filter(sequence => sequence !== this).forEach(timelineSequence => {
      const sequence = timelineSequence.sequence;
      if (sequence.start == this.sequence.start && mode != 'resizeRight') {
        buildLeftIndicator = true;
        this._snapIndicators.push(timelineSequence.buildLeftSnapIndicator());
      }
      if (sequence.start == this.sequence.end && mode != 'resizeLeft') {
        buildRightIndicator = true;
        this._snapIndicators.push(timelineSequence.buildLeftSnapIndicator());
      }
      if (sequence.end == this.sequence.end && mode != 'resizeLeft') {
        buildRightIndicator = true;
        this._snapIndicators.push(timelineSequence.buildRightSnapIndicator());
      }
      if (sequence.end == this.sequence.start && mode != 'resizeRight') {
        buildLeftIndicator = true;
        this._snapIndicators.push(timelineSequence.buildRightSnapIndicator());
      }
    });
    if (buildLeftIndicator) this._snapIndicators.push(this.buildLeftSnapIndicator());
    if (buildRightIndicator) this._snapIndicators.push(this.buildRightSnapIndicator());
  }

  onResizeRight (event) {
    const newSequenceWidth = this.ui.rightResizer.topRight.x;
    if (newSequenceWidth < TIMELINE_CONSTANTS.MINIMAL_SEQUENCE_WIDTH) {
      this.showWarning('right', event.hand.position.x);
      this.extent = pt(TIMELINE_CONSTANTS.MINIMAL_SEQUENCE_WIDTH, this.height);
    } else {
      this.width = newSequenceWidth;
      this.handleSnapping('resizeRight', event.hand.timelineSequenceStates);
    }

    this.updateAppearance();
  }

  onResizeLeft (event) {
    const sequenceState = event.hand.timelineSequenceStates[0];
    const dragDelta = this.ui.leftResizer.position.x;
    const newSequenceWidth = sequenceState.previousWidth - dragDelta;
    const previousTopRight = sequenceState.previousPosition.addXY(sequenceState.previousWidth, 0);

    // stop resizing due to minimal width
    if (newSequenceWidth < TIMELINE_CONSTANTS.MINIMAL_SEQUENCE_WIDTH) {
      this.showWarning('left', -dragDelta);
      this.extent = pt(TIMELINE_CONSTANTS.MINIMAL_SEQUENCE_WIDTH, this.height);
      this.position = pt(previousTopRight.x - TIMELINE_CONSTANTS.MINIMAL_SEQUENCE_WIDTH, TIMELINE_CONSTANTS.SEQUENCE_Y_OFFSET);
    }

    // stop resizing due to end of timeline
    else if (sequenceState.previousPosition.x + dragDelta < TIMELINE_CONSTANTS.SEQUENCE_INITIAL_X_OFFSET) {
      this.showWarning('left', dragDelta);
      this.position = pt(TIMELINE_CONSTANTS.SEQUENCE_INITIAL_X_OFFSET, TIMELINE_CONSTANTS.SEQUENCE_Y_OFFSET);
      this.extent = pt(previousTopRight.x - TIMELINE_CONSTANTS.SEQUENCE_INITIAL_X_OFFSET, this.height);
    } else {
      this.position = pt(sequenceState.previousPosition.x + dragDelta, TIMELINE_CONSTANTS.SEQUENCE_Y_OFFSET);
      this.extent = pt(newSequenceWidth, this.height);
      this.hideWarning('left');
    }
    this.handleSnapping('resizeLeft', event.hand.timelineSequenceStates);

    this.updateAppearance();
  }

  onResizeStart (event) {
    // because lively automatically records drag moves, we have to remove that drag move. Then we can record our own undo.
    this.env.undoManager.removeLatestUndo();
    this.undoStart('timeline-sequence-resize');

    this.timeline.deselectAllSequencesExcept(this);
    event.hand.timelineSequenceStates = [{
      timelineSequence: this,
      previousPosition: this.position,
      previousWidth: this.width,
      previousTimelineLayer: this.timelineLayer,
      isMove: false
    }];

    this.prepareSnappingData(event);
  }

  onResizeEnd (event) {
    this.undoStop('timeline-sequence-resize');
    this.hideWarning('left');
    this.handleOverlappingOtherSequence(event.hand.timelineSequenceStates);
    event.hand.timelineSequenceStates.forEach(timelineSequenceState => timelineSequenceState.timelineSequence.removeSnapIndicators());
    this.clearSnappingData();

    delete event.hand.timelineSequenceStates;
  }

  buildLeftSnapIndicator () {
    return this.owner.addMorph(this.buildSnapIndicator(pt(this.position.x - TIMELINE_CONSTANTS.SNAP_INDICATOR_WIDTH / 2, this.position.y - TIMELINE_CONSTANTS.SNAP_INDICATOR_SPACING)));
  }

  buildRightSnapIndicator () {
    return this.owner.addMorph(this.buildSnapIndicator(pt(this.topRight.x - TIMELINE_CONSTANTS.SNAP_INDICATOR_WIDTH / 2, this.position.y - TIMELINE_CONSTANTS.SNAP_INDICATOR_SPACING)));
  }

  buildSnapIndicator (position) {
    const spacing = TIMELINE_CONSTANTS.SNAP_INDICATOR_SPACING;
    const mid = TIMELINE_CONSTANTS.SNAP_INDICATOR_WIDTH / 2;
    const vertices = [pt(-mid, -spacing), pt(mid, -spacing), pt(mid / 4, 0), pt(mid / 4, TIMELINE_CONSTANTS.SEQUENCE_HEIGHT), pt(mid, TIMELINE_CONSTANTS.SEQUENCE_HEIGHT + spacing), pt(-mid, TIMELINE_CONSTANTS.SEQUENCE_HEIGHT + spacing), pt(-mid / 4, TIMELINE_CONSTANTS.SEQUENCE_HEIGHT), pt(-mid / 4, 0)];
    return new Polygon({ fill: COLOR_SCHEME.PRIMARY, position: position, vertices: vertices });
  }

  onTimelineLayerChange () {
    this.timelineLayer.addMorph(this);
    this.sequence.layer = this.timelineLayer.layer;
    this.updateSequenceAfterArrangement();
  }

  onGrabStart (hand) {
    connect(hand, 'position', this, 'updateGrabAppearance');
    connect(hand, 'cancelGrab', this, 'onGrabAbort');
    this._grabbingHand = hand;
  }

  onGrabAbort () {
    this.onGrabEnd();
    this.delete();
  }

  onGrabEnd () {
    this.setDefaultAppearance();
    disconnect(this._grabbingHand, 'position', this, 'updateGrabAppearance');
    disconnect(this._grabbingHand, 'cancelGrab', this, 'onGrabAbort');
    this._grabbingHand = null;
  }

  updateGrabAppearance () {
    const globalPositionCenter = pt(this.globalPosition.x + this.width / 2, this.globalPosition.y + this.height / 2);
    const morphBeneath = this.morphBeneath(globalPositionCenter);

    if (morphBeneath.isTimelineSequence || (morphBeneath.owner && morphBeneath.owner.isTimelineSequence)) {
      this.setOverlappingAppearance();
      return;
    }
    if (morphBeneath.isTimelineLayer) {
      const timelineLayer = morphBeneath.isTimelineLayer ? morphBeneath : morphBeneath.owner;
      const layer = timelineLayer.layer;

      // Check if it would be a valid position
      const newStart = this.getStartScrollOnGrab();
      if (this.interactive.sequenceWouldBeValidInLayer(this.sequence, newStart, this.sequence.duration, layer)) {
        this.setDefaultAppearance();
      } else {
        this.setOverlappingAppearance();
      }
      return;
    }
    this.setOutsideEditorAppearance();
  }

  getStartScrollOnGrab () {
    const start = this.globalPosition.x;
    const positionInTimeline = start - this.timelineLayer.globalPosition.x;
    return this.timeline.getScrollFromPosition(positionInTimeline);
  }

  onBeingDroppedOn (hand, recipient) {
    if (recipient.isTimelineLayer) {
      const positionInLayer = recipient.localize(hand.position).x;
      if (!this.morphBeneath(hand.position).isActiveArea && positionInLayer > TIMELINE_CONSTANTS.SEQUENCE_INITIAL_X_OFFSET) {
        this.sequence.start = this.interactive.length;
        const newSequencePosition = recipient.timeline.getPositionFromScroll(this.sequence.start);
        // it is important to calculate the position beforehand since adding the sequence will change the model
        recipient.addMorph(this);
        this.position = pt(newSequencePosition, TIMELINE_CONSTANTS.SEQUENCE_Y_OFFSET);
        this.timelineLayer = this.owner;
        this.onGrabEnd();
        return;
      }
      recipient.addMorph(this);
      const xPosition = Math.round(Math.max(this.position.x, TIMELINE_CONSTANTS.SEQUENCE_INITIAL_X_OFFSET));
      this.position = pt(xPosition, TIMELINE_CONSTANTS.SEQUENCE_Y_OFFSET);
      this.timelineLayer = this.owner;
      if (this.isOverlappingOtherSequence()) {
        error('Find a free spot!');
        hand.grab(this);
      } else {
        this.onGrabEnd();
      }
    } else {
      error('Drop it in the timeline!');
      hand.grab(this);
    }
  }

  get isTimelineSequence () {
    return true;
  }

  get mayBeSelected () {
    return true;
  }

  get timeline () {
    return this.timelineLayer.timeline;
  }

  setWidthAndUpdateResizers (width) {
    this.width = width;
    this.ui.rightResizer.position = pt(this.width - this.ui.rightResizer.width, 0);
  }

  updateSequenceAfterArrangement () {
    this.sequence.duration = this.timeline.getDurationFromWidth(this.width);
    this.sequence.start = this.timeline.getScrollFromPosition(this.position.x);
    this.interactive.updateInteractiveLength();
    this.interactive.redraw();
  }

  updateDraggedSequencesAfterArrangement () {
    this.dragSequenceStates.forEach(dragState => {
      const timelineSequences = dragState.timelineSequence;
      timelineSequences.sequence.duration = timelineSequences.timeline.getDurationFromWidth(timelineSequences.width);
      timelineSequences.sequence.start = timelineSequences.timeline.getScrollFromPosition(timelineSequences.position.x);
    });

    this.interactive.updateInteractiveLength();
    this.interactive.redraw();
  }

  createWarningMorph (morphSuffix, morphPosition, gradientVector) {
    return new Morph({
      name: `warning ${morphSuffix}`,
      position: morphPosition,
      extent: pt(TIMELINE_CONSTANTS.WARNING_WIDTH, TIMELINE_CONSTANTS.SEQUENCE_HEIGHT),
      fill: new LinearGradient({
        vector: gradientVector,
        stops: [
          { offset: 0, color: COLOR_SCHEME.SECONDARY.withA(1) },
          { offset: 1, color: COLOR_SCHEME.SECONDARY.withA(0) }
        ]
      })
    });
  }

  // direction must be one of ["left", "right"]
  showWarning (direction = 'left', dragValue, showImmediately = false) {
    const warningKey = (direction == 'left' ? 'warningStartLeft' : 'warningStartRight');
    const newWarning = !this[warningKey];
    if (newWarning) this[warningKey] = showImmediately ? 0 : dragValue;
    const currentDrag = Math.abs(this[warningKey] - dragValue);
    const strength = currentDrag / TIMELINE_CONSTANTS.FULL_WARNING_OPACITY_AT_DRAG_DELTA;
    const warningMorphPosition = (direction == 'left' ? pt(0, 0) : pt(this.width - TIMELINE_CONSTANTS.WARNING_WIDTH, 0));
    const warning = !newWarning
      ? this.getSubmorphNamed(`warning ${direction}`)
      : this.createWarningMorph(direction, warningMorphPosition, (direction == 'left' ? 'eastwest' : 'westeast'));
    warning.opacity = strength;
    this.addMorph(warning);
  }

  hideWarning (morphSuffix, fadeout = 1000) {
    if (morphSuffix == 'right') delete this.warningStartRight;
    if (morphSuffix == 'left') delete this.warningStartLeft;
    this.withAllSubmorphsDo(morph => {
      if (morph.name == `warning ${morphSuffix}`) morph.fadeOut(fadeout);
    });
  }

  setOverlappingAppearance () {
    this.fill = COLOR_SCHEME.ERROR;
    this.label.fontColor = COLOR_SCHEME.ON_SECONDARY;
  }

  setOutsideEditorAppearance () {
    this.fill = COLOR_SCHEME.BACKGROUND_VARIANT;
  }

  setDefaultAppearance () {
    this.fill = COLOR_SCHEME.SURFACE;
    this.label.fontColor = COLOR_SCHEME.ON_SURFACE;
  }

  setHiddenAppearance () {
    this.fill = COLOR_SCHEME.BACKGROUND_VARIANT;
  }

  updateAppearance () {
    if (this.sequence.layer.hidden) {
      this.setHiddenAppearance();
      return;
    }
    if (this.isOverlappingOtherSequence()) {
      this.setOverlappingAppearance();
    } else {
      this.setDefaultAppearance();
    }
  }

  get allTimelineSequences () {
    return this.timeline.timelineSequences;
  }

  isOverlappingOtherSequence () {
    return this.overlappingSequences.length > 0;
  }

  handleOverlappingOtherSequence (timelineSequenceStates) {
    if (timelineSequenceStates.some(timelineSequenceState => timelineSequenceState.timelineSequence.isOverlappingOtherSequence())) {
      timelineSequenceStates.forEach(timelineSequenceState => timelineSequenceState.timelineSequence.removeSnapIndicators());
      this.env.undoManager.undo();
    }
  }

  get overlappingSequences () {
    const overlappingSequences = this.timelineLayer.getAllSequencesIntersectingWith(this.bounds());
    return overlappingSequences.filter(sequence => sequence != this);
  }

  sequenceVisibilityMenuString () {
    if (this.timeline.selectedTimelineSequences.every(sequence => sequence.isHidden == false)) return '🙈 Hide Selected Sequences';
    if (this.timeline.selectedTimelineSequences.every(sequence => sequence.isHidden != false)) return '🐵 Show Selected Sequences';
    return (this.isHidden ? '🐵' : '🙈').concat('Toggle Visibility of Selected Sequences');
  }

  menuItems () {
    let items = [
      ['✏️ Rename Sequence', async () => await this.timeline.promptRenameForSelection()],
      ['❌ Delete Sequence', () => this.timeline.deleteSelectedItems()],
      ['🗐 Copy Sequence', () => this.editor.copySequence(this.sequence)],
      ['↔️ Edit duration', async () => await this.timeline.promptDurationForSelection()],
      ['🏁 Edit start position', async () => await this.timeline.promptStartForSelection()],
      [this.sequenceVisibilityMenuString(), () => this.timeline.toggleVisibilityForSelection()]];
    if (this.timeline.getSelectedTimelineSequences().length === 1) {
      items = items.concat([{ isDivider: true },
        ['🔍 View sequence', () => this.openSequenceView()],
        ['▶️ Go to start', () => this.editor.internalScrollChangeWithGUIUpdate(this.sequence.start)]
      ]);
    }
    return items;
  }

  disbandInteractiveConnections () {
    disconnect(this.sequence, 'name', this, 'caption');
  }

  abandon () {
    this.remove();

    if (this.ui.rightResizer) disconnectAll(this.ui.rightResizer);
    if (this.ui.leftResizer) disconnectAll(this.ui.leftResizer);

    const sequenceTab = this.editor.getTabFor(this.sequence);
    if (sequenceTab) {
      this.editor.ui.tabContainer.disbandConnectionsFor(sequenceTab);
      sequenceTab.close();
    }
    this.disbandInteractiveConnections();

    super.abandon();
  }

  delete () {
    this.interactive.removeSequence(this.sequence);
    this.abandon();
  }
}
