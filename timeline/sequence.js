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
          this.getSubmorphNamed('aLabel').textString = caption;
        }
      },
      sequence: {
        set (sequence) {
          this.setProperty('sequence', sequence);
          this.tooltip = sequence.name;
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
          if (!this._lockModelUpdate) { this.updateSequenceAfterArrangement(); }
        }
      },
      position: {
        set (position) {
          this.setProperty('position', position);
          if (!this._lockModelUpdate) { this.updateSequenceAfterArrangement(); }
        }
      },
      selected: {
        defaultValue: false,
        type: 'Boolean',
        set (selected) {
          this.setProperty('selected', selected);
          this.onSelectionChange(selected);
        }
      },
      _editor: {}
    };
  }

  get editor () {
    return this._editor;
  }

  initialize (editor, sequence, timelineLayer) {
    this._lockModelUpdate = true;
    this._editor = editor;
    this.sequence = sequence;
    this.timelineLayer = timelineLayer;

    const startPosition = timelineLayer.timeline.getPositionFromScroll(this.sequence.start);
    const endPosition = startPosition + timelineLayer.timeline.getWidthFromDuration(this.sequence.duration);
    this.position = pt(startPosition, CONSTANTS.SEQUENCE_LAYER_Y_OFFSET);
    this.width = endPosition - startPosition;
    this.addMorph(new Label({
      padding: rect(5, 4, 0, 0),
      reactsToPointer: false
    }));
    timelineLayer.addMorph(this);
    this.caption = sequence.name;
    this.initializeResizers();
    this._lockModelUpdate = false;
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

  onMouseDown (event) {
    super.onMouseDown(event);
    this.timeline.deselectAllSequences();
    this.selected = true;
    this.bringToFront();
  }

  onSelectionChange (selected) {
    this.borderColor = selected ? COLOR_SCHEME.PRIMARY : COLOR_SCHEME.ON_BACKGROUND;
  }

  onDragStart (event) {
    this.undoStart('timeline-sequence-move');
    event.hand.timelineSequenceStates = [{
      timelineSequence: this,
      previousPosition: this.position,
      previousTimelineLayer: this.timelineLayer
    }];
    this.prepareSnappingData();
  }

  onDragEnd (event) {
    this.undoStop('timeline-sequence-move');
    if (this.isOverlappingOtherSequence()) {
      const sequenceStates = event.hand.timelineSequenceStates;
      sequenceStates.forEach(sequenceState => {
        const sequence = sequenceState.timelineSequence;
        sequence.position = sequenceState.previousPosition;
        sequence.remove();
        sequence.timelineLayer = sequenceState.previousTimelineLayer;
        sequence.updateAppearance();
        this.env.undoManager.removeLatestUndo();
      });
    }
    this.hideWarningLeft();
    this.hideWarningRight();
    this.removeSnapIndicators();
    this.clearSnappingData();
    delete event.hand.timelineSequenceStates;
  }

  onDrag (event) {
    super.onDrag(event);
    if (this.position.x <= CONSTANTS.SEQUENCE_INITIAL_X_OFFSET) {
      this.position = pt(CONSTANTS.SEQUENCE_INITIAL_X_OFFSET, CONSTANTS.SEQUENCE_LAYER_Y_OFFSET);
      this.showWarningLeft(event.hand.position.x);
    } else {
      this.position = pt(this.position.x, CONSTANTS.SEQUENCE_LAYER_Y_OFFSET);
      this.hideWarningLeft();
    }
    this.handleSnapping('drag');

    this.updateAppearance();
    this.updateSequenceAfterArrangement();
  }

  removeSnapIndicators () {
    this._snapIndicators.forEach(indicator => indicator.remove());
    this._snapIndicators = [];
  }

  prepareSnappingData () {
    const otherTimelineSequences = this.allTimelineSequences.filter(sequence => sequence != this);
    this._otherTimelineSequencesSortedByStart = otherTimelineSequences.sort((a, b) => a.sequence.start - b.sequence.start);
    this._otherTimelineSequencesSortedByEnd = otherTimelineSequences.sort((a, b) => a.sequence.end - b.sequence.end);
  }

  clearSnappingData () {
    delete this._otherTimelineSequencesSortedByStart;
    delete this._otherTimelineSequencesSortedByEnd;
  }

  handleSnapping (mode) {
    this.removeSnapIndicators();

    let positionsOfSnapTargets = [];
    switch (mode) {
      case 'drag': positionsOfSnapTargets = [this.sequence.start, this.sequence.end];
        break;
      case 'resizeLeft': positionsOfSnapTargets = [this.sequence.start];
        break;
      case 'resizeRight': positionsOfSnapTargets = [this.sequence.end];
        break;
    }

    const snapPosition = this.timeline.getPositionFromScroll(
      this.getSnappingPosition(positionsOfSnapTargets)
    );

    this.snapTo(snapPosition, mode);

    this.buildSnapIndicators();
  }

  getSnappingPosition (positionsOfSnapTargets) {
    const sequencesSortedByStart = this._otherTimelineSequencesSortedByStart;
    const sequencesSortedByEnd = this._otherTimelineSequencesSortedByEnd;

    if (!sequencesSortedByStart || !sequencesSortedByEnd) {
      // both arrays should have the same number of elements,
      //   so it is already something wrong if only one is undefined
      return undefined;
    }

    let closestSequenceByStart;
    let closestSequenceByEnd;
    let diffByStart = -1;
    let diffByEnd = -1;

    positionsOfSnapTargets.forEach(snapTargetPosition => {
      const candidateByStart = arr.binarySearchFor(
        sequencesSortedByStart,
        snapTargetPosition,
        (elm) => elm.sequence.start,
        true
      );
      const candidateByEnd = arr.binarySearchFor(
        sequencesSortedByEnd,
        snapTargetPosition,
        (elm) => elm.sequence.end,
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
    if (!snapPosition) return;

    const diffToStart = Math.abs(this.position.x - snapPosition);
    const diffToEnd = Math.abs(this.topRight.x - snapPosition);
    const startIsCloserThanEnd = diffToStart < diffToEnd;

    if (CONSTANTS.SNAPPING_THRESHOLD < (startIsCloserThanEnd ? diffToStart : diffToEnd)) {
      return;
    }

    switch (mode) {
      case 'drag': {
        const snapTarget = startIsCloserThanEnd ? 'position' : 'topRight';
        this[snapTarget] = pt(snapPosition, this.position.y);
        break;
      }

      case 'resizeLeft': {
        if (!startIsCloserThanEnd) return;
        const newWidth = this.topRight.x - snapPosition;
        this.position = pt(snapPosition, this.position.y);
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

  buildSnapIndicators () {
    let buildRightIndicator, buildLeftIndicator;
    this._otherTimelineSequencesSortedByStart.forEach(timelineSequence => {
      const sequence = timelineSequence.sequence;
      if (sequence.start == this.sequence.start) {
        buildLeftIndicator = true;
        this._snapIndicators.push(timelineSequence.buildLeftSnapIndicator());
      }
      if (sequence.start == this.sequence.end) {
        buildRightIndicator = true;
        this._snapIndicators.push(timelineSequence.buildLeftSnapIndicator());
      }
      if (sequence.end == this.sequence.end) {
        buildRightIndicator = true;
        this._snapIndicators.push(timelineSequence.buildRightSnapIndicator());
      }
      if (sequence.end == this.sequence.start) {
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
      this.rightResizer.position = pt(CONSTANTS.MINIMAL_SEQUENCE_WIDTH - this.rightResizer.width, 0);
      this.updateSequenceAfterArrangement();
    } else {
      this.width = newSequenceWidth;
      this.handleSnapping('resizeRight');
      this.rightResizer.position = pt(this.width - this.rightResizer.width, 0);
      this.updateSequenceAfterArrangement();
    }
  }

  onResizeLeft (event) {
    const sequenceState = event.hand.timelineSequenceResizeStates[0];
    const dragDelta = this.leftResizer.position.x;
    const newSequenceWidth = sequenceState.previousWidth - dragDelta;
    // stop resizing due to minimal width
    if (newSequenceWidth < CONSTANTS.MINIMAL_SEQUENCE_WIDTH) {
      this.showWarningLeft(-dragDelta);
      this.extent = pt(CONSTANTS.MINIMAL_SEQUENCE_WIDTH, this.height);
      this.position = pt(sequenceState.previousTopRight.x - CONSTANTS.MINIMAL_SEQUENCE_WIDTH, CONSTANTS.SEQUENCE_LAYER_Y_OFFSET);
    }
    // stop resizing due to end of timeline
    else if (sequenceState.previousPosition.x + dragDelta < CONSTANTS.SEQUENCE_INITIAL_X_OFFSET) {
      this.showWarningLeft(dragDelta);
      this.position = pt(CONSTANTS.SEQUENCE_INITIAL_X_OFFSET, CONSTANTS.SEQUENCE_LAYER_Y_OFFSET);
      this.extent = pt(sequenceState.previousTopRight.x - CONSTANTS.SEQUENCE_INITIAL_X_OFFSET, this.height);
    } else {
      this.position = pt(sequenceState.previousPosition.x + dragDelta, CONSTANTS.SEQUENCE_LAYER_Y_OFFSET);
      this.extent = pt(newSequenceWidth, this.height);
      this.hideWarningLeft();
    }
    this.handleSnapping('resizeLeft');
    this.leftResizer.position = pt(0, 0);
    this.rightResizer.position = pt(this.width - this.rightResizer.width, 0);
    this.updateSequenceAfterArrangement();
  }

  onResizeStart (event) {
    this.env.undoManager.removeLatestUndo();
    this.undoStart('timeline-sequence-resize');
    event.hand.timelineSequenceResizeStates = [{
      timelineSequence: this,
      previousPosition: this.position,
      previousWidth: this.width,
      previousTopRight: this.topRight
    }];
    this.prepareSnappingData();
  }

  onResizeEnd (event) {
    this.undoStop('timeline-sequence-resize');
    this.hideWarningLeft();
    this.hideWarningRight();
    this.removeSnapIndicators();
    this.clearSnappingData();
    delete event.hand.timelineSequenceResizeStates;
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

  onTimelineLayerChange (timelineLayer) {
    this.timelineLayer.addMorph(this);
    this.sequence.layer = this.timelineLayer.layer;
    this.updateSequenceAfterArrangement();
  }

  onGrabStart (hand) {
    connect(hand, 'position', this, 'updateGrabAppearance');
  }

  updateGrabAppearance () {
    const globalPositionCenter = pt(this.globalPosition.x + this.width / 2, this.globalPosition.y + this.height / 2);
    const morphBeneath = this.morphBeneath(globalPositionCenter);

    if (morphBeneath.isTimelineSequence || (morphBeneath.owner && morphBeneath.owner.isTimelineSequence)) {
      this.setOverlappingAppearance();
      return;
    }
    if (morphBeneath.name === 'active area') {
      const timelineLayer = morphBeneath.owner;
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
        disconnect(hand, 'position', this, 'updateGrabAppearance');
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

  showWarningLeft (dragValue) {
    const newWarning = !this.warningStartLeft;
    if (newWarning) this.warningStartLeft = dragValue;
    const currentDrag = Math.abs(this.warningStartLeft - dragValue);
    const strength = currentDrag / CONSTANTS.FULL_WARNING_OPACITY_AT_DRAG_DELTA;
    const warning = !newWarning
      ? this.getSubmorphNamed('warning left')
      : this.createWarningMorph('left', pt(0, 0), 'eastwest');
    warning.opacity = strength;
    this.addMorph(warning);
  }

  showWarningRight (dragValue) {
    const newWarning = !this.warningStartRight;
    if (newWarning) this.warningStartRight = dragValue;
    const currentDrag = this.warningStartRight - dragValue;
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
    this.borderColor = COLOR_SCHEME.ON_BACKGROUND;
  }

  updateAppearance () {
    if (this.isOverlappingOtherSequence()) {
      this.setOverlappingAppearance();
    } else {
      this.setDefaultAppearance();
    }
  }

  get allTimelineSequences () {
    return this.timeline.timelineLayers.reduce(
      (timelineSequences, timelineLayer) => timelineSequences.concat(timelineLayer.timelineSequences), []);
  }

  isOverlappingOtherSequence () {
    return this.overlappingSequences.length > 0;
  }

  get overlappingSequences () {
    const overlappingSequences = this.timelineLayer.getAllSequencesIntersectingWith(this.bounds());
    return overlappingSequences.filter(sequence => sequence != this);
  }

  menuItems (evt) {
    return [
      ['Rename Sequence', async () => await this.promptName()],
      ['Delete Sequence', () => this.abandon()],
      ['Edit duration', async () => await this.promptDuration()],
      ['Edit start position', async () => await this.promptStart()],
      { isDivider: true },
      ['View sequence', () => this.openSequenceView()],
      ['Go to start', () => this.editor.interactiveScrollPosition = this.sequence.start]
    ];
  }

  async promptName () {
    const newName = await $world.prompt('Sequence name:', { input: this.sequence.name });
    if (newName) {
      this.sequence.name = newName;
    }
  }

  async promptDuration () {
    const newDuration = Number(await $world.prompt('Duration:', { input: this.sequence.duration }));
    if (this.editor.interactive.validSequenceDuration(this.sequence, newDuration)) {
      this.sequence.duration = newDuration;
      this.width = this.timeline.getWidthFromDuration(newDuration);
    } else {
      $world.setStatusMessage('Duration not set', COLOR_SCHEME.ERROR);
    }
  }

  async promptStart () {
    const newStart = Number(await $world.prompt('Start:', { input: this.sequence.start }));
    if (this.editor.interactive.validSequenceStart(this.sequence, newStart)) {
      this.sequence.start = newStart;
      this.position = pt(this.timeline.getPositionFromScroll(newStart), CONSTANTS.SEQUENCE_LAYER_Y_OFFSET);
    } else {
      $world.setStatusMessage('Start not set', COLOR_SCHEME.ERROR);
    }
  }

  abandon () {
    this.remove();

    if (this.rightResizer) disconnectAll(this.rightResizer);
    if (this.leftResizer) disconnectAll(this.leftResizer);

    const sequenceTab = this.editor.getTabFor(this.sequence);
    if (sequenceTab) {
      this.editor.disbandTabConnections(sequenceTab);
      sequenceTab.close();
    }

    this.editor.interactive.removeSequence(this.sequence);
    this.updateSequenceAfterArrangement();
  }
}
