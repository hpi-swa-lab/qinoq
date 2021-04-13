import { Morph, Polygon, Label } from 'lively.morphic';
import { COLOR_SCHEME } from '../colors.js';
import { pt, LinearGradient, rect } from 'lively.graphics';
import { connect, disconnect, disconnectAll } from 'lively.bindings';
import { CONSTANTS } from './constants.js';
import { arr } from 'lively.lang';
export class TimelineSequence extends Morph {
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
        set (caption) {
          if (!caption) return;
          this.setProperty('caption', caption);
          this.getSubmorphNamed('aLabel').textString = caption;
          this.sequence.name = caption;
          this.tooltip = caption;
        }
      },
      sequence: {
        set (sequence) {
          this.setProperty('sequence', sequence);
        }
      },
      _lockModelUpdate: {
        // Needs to be true since otherwise the morph creation will trigger unwanted
        // calls to updateSequenceAfterArrangement.
        // Will be set to false after initialization.
        defaultValue: true
      },
      height: {
        defaultValue: CONSTANTS.SEQUENCE_HEIGHT
      },
      timelineLayer: {
        set (timelineLayer) {
          this.setProperty('timelineLayer', timelineLayer);
          if (!this._lockModelUpdate) {
            this.onTimelineLayerChange();
          }
        }
      },
      _snapIndicators: {
        defaultValue: []
      },
      extent: {
        set (extent) {
          this.setProperty('extent', extent);
          if (!this._lockModelUpdate) { this.updateSequenceAfterArrangement(); }
        }
      },
      position: {
        set (position) {
          this.setProperty('position', position);
          if (!this._lockModelUpdate) { this.updateSequenceAfterArrangement(); }
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
          this.initialize(); // _editor should be set only once
        }
      }
    };
  }

  get editor () {
    return this._editor;
  }

  // Is automatically called on creation when "_editor" is set
  initialize () {
    const startPosition = this.timelineLayer.timeline.getPositionFromScroll(this.sequence.start);
    const endPosition = startPosition + this.timelineLayer.timeline.getWidthFromDuration(this.sequence.duration);
    this.position = pt(startPosition, CONSTANTS.SEQUENCE_LAYER_Y_OFFSET);
    this.width = endPosition - startPosition;
    this.addMorph(new Label({
      padding: rect(5, 4, 0, 0),
      reactsToPointer: false
    }));
    this.timelineLayer.addMorph(this);
    this.caption = this.sequence.name;
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

    this.rightResizer = new Morph({
      name: 'right resizer',
      position: pt(this.width - resizerProps.width, 0),
      ...resizerProps
    });
    this.leftResizer = new Morph({
      name: 'left resizer',
      position: pt(0, 0),
      ...resizerProps
    });

    connect(this.rightResizer, 'onDrag', this, 'onResizeRight');
    connect(this.rightResizer, 'onDragStart', this, 'onResizeStart');
    connect(this.rightResizer, 'onDragEnd', this, 'onResizeEnd');
    connect(this.leftResizer, 'onDrag', this, 'onResizeLeft');
    connect(this.leftResizer, 'onDragStart', this, 'onResizeStart');
    connect(this.leftResizer, 'onDragEnd', this, 'onResizeEnd');

    this.addMorphBack(this.rightResizer);
    this.addMorphBack(this.leftResizer);
  }

  onDoubleMouseDown (event) {
    this.openSequenceView();
  }

  openSequenceView () {
    this.editor.initializeSequenceView(this.sequence);
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
    if (!this.isSelected && !event.isShiftDown() && !event.isAltDown()) {
      this.timeline.deselectAllSequencesExcept(this);
      return;
    }
    if (event.leftMouseButtonPressed()) {
      if (event.isAltDown() && !this.isSelected && this.timeline._lastSelectedTimelineSequence && this.timeline.getSelectedSequences().length > 0) {
        this.timeline.selectAllSequences(this.rectangularSelectionFilter);
      } else if (event.isAltDown() && this.isSelected && this.timeline._lastSelectedTimelineSequence) {
        this.timeline.deselectAllSequences(this.rectangularSelectionFilter);
      } else if (event.isShiftDown()) {
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
    if (event.isShiftDown()) return;
    this.isSelected = true;
    this._dragged = true;
    const undo = this.undoStart('move-timeline-sequence');
    event.hand.timelineSequenceStates = this.timeline.getSelectedSequences().map(timelineSequence => {
      undo.addTarget(timelineSequence);
      return {
        timelineSequence: timelineSequence,
        previousPosition: timelineSequence.position,
        previousWidth: timelineSequence.width,
        previousTimelineLayer: timelineSequence.timelineLayer,
        isMove: true
      };
    });
    const leftMostSequence = this.timeline.getSelectedSequences().sort((a, b) => a.sequence.start - b.sequence.start)[0];
    event.hand.leftMostSequenceStates = this.timeline.getSelectedSequences().map(timelineSequence => {
      if (timelineSequence.sequence.start == leftMostSequence.sequence.start) {
        return {
          timelineSequence: timelineSequence,
          previousPosition: timelineSequence.position
        };
      }
    }).filter(i => i);
    event.hand.draggedSequence = this;

    this.prepareSnappingData(event);
  }

  onDragEnd (event) {
    if (event.isShiftDown()) return;
    this.undoStop('move-timeline-sequence');
    this.handleOverlappingOtherSequence(event.hand.timelineSequenceStates);
    event.hand.leftMostSequenceStates.forEach(timelineSequenceState => timelineSequenceState.timelineSequence.hideWarningLeft());

    event.hand.timelineSequenceStates.forEach(timelineSequenceState => timelineSequenceState.timelineSequence.removeSnapIndicators());
    this.clearSnappingData();
    delete event.hand.timelineSequenceStates;
    delete event.hand.leftMostSequenceStates;
    delete event.hand.draggedSequence;
  }

  onDrag (event) {
    if (!event.hand.timelineSequenceStates) return;
    super.onDrag(event);

    const referenceDragState = event.hand.timelineSequenceStates.find(dragState => dragState.timelineSequence === this);
    const prevPositionX = referenceDragState.previousPosition.x;
    const dragDeltaX = prevPositionX - this.position.x;

    event.hand.timelineSequenceStates.forEach(dragState => {
      if (dragState.timelineSequence != this) {
        dragState.timelineSequence.position = pt(dragState.previousPosition.x - dragDeltaX, CONSTANTS.SEQUENCE_LAYER_Y_OFFSET);
      }
    });

    if (event.hand.leftMostSequenceStates[0].timelineSequence.position.x <= CONSTANTS.SEQUENCE_INITIAL_X_OFFSET) {
      event.hand.leftMostSequenceStates[0].timelineSequence.position = pt(CONSTANTS.SEQUENCE_INITIAL_X_OFFSET, CONSTANTS.SEQUENCE_LAYER_Y_OFFSET);
      event.hand.leftMostSequenceStates.forEach(timelineSequenceState => timelineSequenceState.timelineSequence.showWarningLeft(event.hand.position.x));

      event.hand.timelineSequenceStates.forEach(dragState => {
        dragState.timelineSequence.position = pt(CONSTANTS.SEQUENCE_INITIAL_X_OFFSET + dragState.previousPosition.x - event.hand.leftMostSequenceStates[0].previousPosition.x, CONSTANTS.SEQUENCE_LAYER_Y_OFFSET);
      });
    } else {
      this.position = pt(this.position.x, CONSTANTS.SEQUENCE_LAYER_Y_OFFSET);
      event.hand.leftMostSequenceStates.forEach(timelineSequenceState => timelineSequenceState.timelineSequence.hideWarningLeft());
    }
    this.handleSnapping('drag', event);
    event.hand.timelineSequenceStates.forEach(dragState => {
      dragState.timelineSequence.updateAppearance();
      dragState.timelineSequence.updateSequenceAfterArrangement();
    });
  }

  removeSnapIndicators () {
    this._snapIndicators.forEach(indicator => indicator.abandon());
    this._snapIndicators = [];
  }

  prepareSnappingData (event) {
    const otherTimelineSequences = this.allTimelineSequences.filter(sequence => !event.hand.timelineSequenceStates.map(timelineSequenceState => timelineSequenceState.timelineSequence).includes(sequence));
    this._otherTimelineSequencesSortedByStart = [...otherTimelineSequences].sort((a, b) => a.sequence.start - b.sequence.start);
    this._otherTimelineSequencesSortedByEnd = [...otherTimelineSequences].sort((a, b) => a.sequence.end - b.sequence.end);
  }

  clearSnappingData () {
    delete this._otherTimelineSequencesSortedByStart;
    delete this._otherTimelineSequencesSortedByEnd;
  }

  handleSnapping (mode, event) {
    event.hand.timelineSequenceStates.forEach(timelineSequenceState => timelineSequenceState.timelineSequence.removeSnapIndicators());
    if (this._otherTimelineSequencesSortedByStart.length == 0) return;
    let positionsOfSnapTargets = [];
    switch (mode) {
      case 'drag': positionsOfSnapTargets = event.hand.timelineSequenceStates.flatMap(timelineSequenceState => { return [timelineSequenceState.timelineSequence.sequence.start, timelineSequenceState.timelineSequence.sequence.end]; });
        break;
      case 'resizeLeft': positionsOfSnapTargets = [this.sequence.start];
        break;
      case 'resizeRight': positionsOfSnapTargets = [this.sequence.end];
        break;
    }

    const snapPosition = this.timeline.getPositionFromScroll(this.getSnappingPosition(positionsOfSnapTargets));
    if (snapPosition) event.hand.timelineSequenceStates.forEach(timelineSequenceState => timelineSequenceState.timelineSequence.snapTo(snapPosition, mode));

    event.hand.timelineSequenceStates.forEach(timelineSequenceState => timelineSequenceState.timelineSequence.buildSnapIndicators(mode));
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

    if (CONSTANTS.SNAPPING_THRESHOLD < (startIsCloserThanEnd ? diffToStart : diffToEnd)) {
      return;
    }

    switch (mode) {
      case 'drag': {
        const snapTarget = startIsCloserThanEnd ? 'position' : 'topRight';
        this.timeline.getSelectedSequences(s => s !== this).forEach(timelineSequence => timelineSequence[snapTarget] = pt(Math.abs(this[snapTarget].x - snapPosition - timelineSequence[snapTarget].x), CONSTANTS.SEQUENCE_LAYER_Y_OFFSET));
        this[snapTarget] = pt(snapPosition, CONSTANTS.SEQUENCE_LAYER_Y_OFFSET);
        break;
      }

      case 'resizeLeft': {
        if (!startIsCloserThanEnd) return;
        const newWidth = this.topRight.x - snapPosition;
        this.position = pt(snapPosition, CONSTANTS.SEQUENCE_LAYER_Y_OFFSET);
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
    this.allTimelineSequences.filter(s => s !== this).forEach(timelineSequence => {
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
    const newSequenceWidth = this.rightResizer.topRight.x;
    if (newSequenceWidth < CONSTANTS.MINIMAL_SEQUENCE_WIDTH) {
      this.showWarningRight(event.hand.position.x);
      this.extent = pt(CONSTANTS.MINIMAL_SEQUENCE_WIDTH, this.height);
    } else {
      this.width = newSequenceWidth;
      this.handleSnapping('resizeRight', event);
    }

    this.updateAppearance();
    this.updateSequenceAfterArrangement();
  }

  onResizeLeft (event) {
    const sequenceState = event.hand.timelineSequenceStates[0];
    const dragDelta = this.leftResizer.position.x;
    const newSequenceWidth = sequenceState.previousWidth - dragDelta;
    const previousTopRight = sequenceState.previousPosition.addXY(sequenceState.previousWidth, 0);

    // stop resizing due to minimal width
    if (newSequenceWidth < CONSTANTS.MINIMAL_SEQUENCE_WIDTH) {
      this.showWarningLeft(-dragDelta);
      this.extent = pt(CONSTANTS.MINIMAL_SEQUENCE_WIDTH, this.height);
      this.position = pt(previousTopRight.x - CONSTANTS.MINIMAL_SEQUENCE_WIDTH, CONSTANTS.SEQUENCE_LAYER_Y_OFFSET);
    }

    // stop resizing due to end of timeline
    else if (sequenceState.previousPosition.x + dragDelta < CONSTANTS.SEQUENCE_INITIAL_X_OFFSET) {
      this.showWarningLeft(dragDelta);
      this.position = pt(CONSTANTS.SEQUENCE_INITIAL_X_OFFSET, CONSTANTS.SEQUENCE_LAYER_Y_OFFSET);
      this.extent = pt(previousTopRight.x - CONSTANTS.SEQUENCE_INITIAL_X_OFFSET, this.height);
    } else {
      this.position = pt(sequenceState.previousPosition.x + dragDelta, CONSTANTS.SEQUENCE_LAYER_Y_OFFSET);
      this.extent = pt(newSequenceWidth, this.height);
      this.hideWarningLeft();
    }
    this.handleSnapping('resizeLeft', event);

    this.updateAppearance();
    this.updateSequenceAfterArrangement();
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
    this.hideWarningLeft();
    this.handleOverlappingOtherSequence(event.hand.timelineSequenceStates);
    event.hand.timelineSequenceStates.forEach(timelineSequenceState => timelineSequenceState.timelineSequence.removeSnapIndicators());
    this.clearSnappingData();
    this.leftResizer.position = pt(0, 0);
    this.rightResizer.position = pt(this.width - this.rightResizer.width, 0);
    delete event.hand.timelineSequenceStates;
  }

  buildLeftSnapIndicator () {
    return this.owner.addMorph(this.buildSnapIndicator(pt(this.position.x - CONSTANTS.SNAP_INDICATOR_WIDTH / 2, this.position.y - CONSTANTS.SNAP_INDICATOR_SPACING)));
  }

  buildRightSnapIndicator () {
    return this.owner.addMorph(this.buildSnapIndicator(pt(this.topRight.x - CONSTANTS.SNAP_INDICATOR_WIDTH / 2, this.position.y - CONSTANTS.SNAP_INDICATOR_SPACING)));
  }

  buildSnapIndicator (position) {
    const spacing = CONSTANTS.SNAP_INDICATOR_SPACING;
    const mid = CONSTANTS.SNAP_INDICATOR_WIDTH / 2;
    const vertices = [pt(-mid, -spacing), pt(mid, -spacing), pt(mid / 4, 0), pt(mid / 4, CONSTANTS.SEQUENCE_HEIGHT), pt(mid, CONSTANTS.SEQUENCE_HEIGHT + spacing), pt(-mid, CONSTANTS.SEQUENCE_HEIGHT + spacing), pt(-mid / 4, CONSTANTS.SEQUENCE_HEIGHT), pt(-mid / 4, 0)];
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
    this.abandon();
  }

  onGrabEnd () {
    this.setDefaultAppearance();
    disconnect(this._grabbingHand, 'position', this, 'updateGrabAppearance');
    disconnect(this._grabbingHand, 'cancelGrab', this, 'onGrabAbort');
  }

  updateGrabAppearance () {
    const globalPositionCenter = pt(this.globalPosition.x + this.width / 2, this.globalPosition.y + this.height / 2);
    const morphBeneath = this.morphBeneath(globalPositionCenter);

    if (morphBeneath.isTimelineSequence || (morphBeneath.owner && morphBeneath.owner.isTimelineSequence)) {
      this.setOverlappingAppearance();
      return;
    }
    if (morphBeneath.name === 'active area' || morphBeneath.name === 'inactive area' || morphBeneath.isTimelineLayer) {
      const timelineLayer = morphBeneath.isTimelineLayer ? morphBeneath : morphBeneath.owner;
      const layer = timelineLayer.layer;

      // Check if it would be a valid position
      const newStart = this.getStartScrollOnGrab();
      if (this.editor.interactive.sequenceWouldBeValidInLayer(this.sequence, newStart, this.sequence.duration, layer)) {
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
      recipient.addMorph(this);

      this.position = pt(this.position.x, CONSTANTS.SEQUENCE_LAYER_Y_OFFSET);
      this.timelineLayer = this.owner;
      if (this.isOverlappingOtherSequence()) {
        $world.setStatusMessage('Find a free spot!', COLOR_SCHEME.ERROR);
        hand.grab(this);
      } else {
        this.onGrabEnd();
      }
    } else {
      $world.setStatusMessage('Drop it in the timeline!', COLOR_SCHEME.ERROR);
      hand.grab(this);
    }
  }

  get isTimelineSequence () {
    return true;
  }

  get timeline () {
    return this.timelineLayer.timeline;
  }

  get interactive () {
    return this.timeline.interactive;
  }

  setWidthAndUpdateResizers (width) {
    this.width = width;
    this.rightResizer.position = pt(this.width - this.rightResizer.width, 0);
  }

  updateSequenceAfterArrangement () {
    this.sequence.duration = this.timeline.getDurationFromWidth(this.width);
    this.sequence.start = this.timeline.getScrollFromPosition(this.position.x);
    this.editor.interactive.updateInteractiveLength();
    this.editor.interactive.redraw();
  }

  createWarningMorph (morphSuffix, morphPosition, gradientVector) {
    return new Morph({
      name: `warning ${morphSuffix}`,
      position: morphPosition,
      extent: pt(CONSTANTS.WARNING_WIDTH, CONSTANTS.SEQUENCE_HEIGHT),
      fill: new LinearGradient({
        vector: gradientVector,
        stops: [
          { offset: 0, color: COLOR_SCHEME.SECONDARY.withA(1) },
          { offset: 1, color: COLOR_SCHEME.SECONDARY.withA(0) }
        ]
      })
    });
  }

  showWarningLeft (dragValue, showImmediately = false) {
    const newWarning = !this.warningStartLeft;
    if (newWarning) this.warningStartLeft = showImmediately ? 0 : dragValue;
    const currentDrag = Math.abs(this.warningStartLeft - dragValue);
    const strength = currentDrag / CONSTANTS.FULL_WARNING_OPACITY_AT_DRAG_DELTA;
    const warning = !newWarning
      ? this.getSubmorphNamed('warning left')
      : this.createWarningMorph('left', pt(0, 0), 'eastwest');
    warning.opacity = strength;
    this.addMorph(warning);
  }

  showWarningRight (dragValue, showImmediately = false) {
    const newWarning = !this.warningStartRight;
    if (newWarning) this.warningStartRight = showImmediately ? 0 : dragValue;
    const currentDrag = Math.abs(this.warningStartRight - dragValue);
    const strength = currentDrag / CONSTANTS.FULL_WARNING_OPACITY_AT_DRAG_DELTA;
    const warning = !newWarning
      ? this.getSubmorphNamed('warning right')
      : this.createWarningMorph('right', pt(this.width - CONSTANTS.WARNING_WIDTH, 0), 'westeast');
    warning.opacity = strength;
    this.addMorph(warning);
  }

  hideWarning (morphSuffix, fadeout = 1000) {
    this.withAllSubmorphsDo(morph => {
      if (morph.name == `warning ${morphSuffix}`) morph.fadeOut(fadeout);
    });
  }

  hideWarningLeft (fadeout = 1000) {
    delete this.warningStartLeft;
    this.hideWarning('left', fadeout);
  }

  hideWarningRight (fadeout = 1000) {
    delete this.warningStartRight;
    this.hideWarning('right', fadeout);
  }

  setOverlappingAppearance () {
    this.fill = COLOR_SCHEME.ERROR;
  }

  setOutsideEditorAppearance () {
    this.fill = COLOR_SCHEME.BACKGROUND_VARIANT;
  }

  setDefaultAppearance () {
    this.fill = COLOR_SCHEME.SURFACE;
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
    return this.timeline.timelineLayers.flatMap(timelineLayer => timelineLayer.timelineSequences);
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

  menuItems (evt) {
    let items = [
      ['✏️ Rename Sequence', async () => await this.timeline.promptRenameForSelection()],
      ['❌ Delete Sequence', () => this.timeline.deleteSelectedItems()],
      ['↔️ Edit duration', async () => await this.timeline.promptDurationForSelection()],
      ['🏁 Edit start position', async () => await this.timeline.promptStartForSelection()]];
    if (!(this.timeline.getSelectedSequences().length > 1)) {
      items = items.concat([{ isDivider: true },
        ['🔍 View sequence', () => this.openSequenceView()],
        ['▶️ Go to start', () => this.editor.interactiveScrollPosition = this.sequence.start]
      ]);
    }
    return items;
  }

  disbandInteractiveConnections () {
    disconnect(this.sequence, 'name', this, 'caption');
  }

  abandon () {
    this.remove();

    if (this.rightResizer) disconnectAll(this.rightResizer);
    if (this.leftResizer) disconnectAll(this.leftResizer);

    const sequenceTab = this.editor.getTabFor(this.sequence);
    if (sequenceTab) {
      this.editor.tabContainer.disbandConnectionsFor(sequenceTab);
      sequenceTab.close();
    }
    this.disbandInteractiveConnections();
    this.editor.interactive.removeSequence(this.sequence);
    this.updateSequenceAfterArrangement();
    super.abandon();
  }
}
