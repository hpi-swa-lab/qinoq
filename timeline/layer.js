import { Morph, Icon, Label } from 'lively.morphic';
import { COLOR_SCHEME } from '../colors.js';
import { pt } from 'lively.graphics';
import { CONSTANTS } from './constants.js';
import { connect, disconnect } from 'lively.bindings';
import { Canvas } from 'lively.components/canvas.js';
import { animatedProperties } from '../properties.js';
export class TimelineLayer extends Morph {
  static get properties () {
    return {
      layerInfo: {},
      container: {
        initialize () {
          this.addAreaMorphs();
        }
      },
      focusable: {
        defaultValue: false
      },
      fill: {
        defaultValue: COLOR_SCHEME.BACKGROUND_VARIANT
      },
      height: {
        defaultValue: CONSTANTS.LAYER_HEIGHT
      },
      _editor: {}
    };
  }

  get editor () {
    return this._editor;
  }

  get isTimelineLayer () {
    return true;
  }

  relayout () {
    this.height = CONSTANTS.LAYER_HEIGHT;
  }

  get timeline () {
    if (!this.owner || !this.owner.owner) return undefined;
    return this.owner.owner.owner;
  }

  updateLayerPosition () {
    this.timeline.updateLayerPositions();
  }

  get index () {
    return this.container.submorphs.indexOf(this);
  }

  get highestIndex () {
    // timeline cursor is also a submorph
    return (this.container.submorphs.length - 2);
  }

  addAreaMorphs () {
    const activeArea = this.addMorph(new Canvas({
      extent: pt(CONSTANTS.IN_EDIT_MODE_SEQUENCE_WIDTH, CONSTANTS.LAYER_HEIGHT),
      position: pt(CONSTANTS.SEQUENCE_INITIAL_X_OFFSET, 0),
      fill: COLOR_SCHEME.SURFACE_VARIANT,
      reactsToPointer: false,
      preserveContents: false, // Default value of true results in errors when the width was 0 and is increased (happens in an empty interactive)
      name: 'active area',
      borderStyle: { bottom: 'solid', left: 'none', right: 'none', top: 'solid' },
      acceptsDrops: false
    }));
    const inactiveArea = this.addMorph(new Morph({
      draggable: true,
      extent: pt(CONSTANTS.INACTIVE_AREA_WIDTH, CONSTANTS.LAYER_HEIGHT),
      fill: COLOR_SCHEME.BACKGROUND_VARIANT,
      name: 'inactive area',
      borderStyle: { bottom: 'solid', left: 'none', right: 'none', top: 'solid' },
      acceptsDrops: false
    }));
    // when the active area increases in width, the underlying layer will not automatically increase as well
    // therefore, just setting reactsToPointer will not work here, since there will be no underlying morph handling the clickevents
    // and we have to manually steer the clickevents to the underlying layer
    inactiveArea.onDragStart = event => this.onDragStart(event);
    inactiveArea.onDrag = event => this.onDrag(event);
    inactiveArea.onDragEnd = event => this.onDragEnd(event);
    connect(activeArea, 'extent', inactiveArea, 'position', { converter: '() => source.topRight' });
  }

  get inactiveArea () {
    return this.getSubmorphNamed('inactive area');
  }

  get activeArea () {
    return this.getSubmorphNamed('active area');
  }
}

export class SequenceTimelineLayer extends TimelineLayer {
  static get properties () {
    return {
      morph: {
        set (morph) {
          this.setProperty('morph', morph);
          connect(morph, 'name', this, 'onMorphNameChange').update();
        }
      },
      animation: {
        set (animation) {
          this.setProperty('animation', animation);
          this.updateTooltip();
          this.layerInfo.updateLabel();
          this.redraw();
        }
      }
    };
  }

  get name () {
    return this.morph.name;
  }

  updateTooltip () {
    this.tooltip = `${this.morph.name}` + (this.animation ? `:${this.animation.property}` : '');
  }

  onMorphNameChange () {
    this.updateTooltip();
    if (this.layerInfo) this.layerInfo.updateLabel();
  }

  onMouseUp (event) {
    super.onMouseUp(event);
    if (event.targetMorphs[0] !== this) return;
    this.editor.inspector.targetMorph = this.morph;
    if (this.morph.world()) this.morph.show();
  }

  onMouseDown (event) {
    // we get the event before the keyframes
    // if the click is on a keyframe we do not need to handle it
    if (this.morphsContainingPoint(event.hand.position).filter(morph => morph.isTimelineKeyframe).length > 0) return;
    this.timeline.deselectAllTimelineKeyframes();
  }

  get keyframes () {
    return this.submorphs.filter(submorph => submorph.isTimelineKeyframe);
  }

  async redraw () {
    await this.activeArea.whenRendered();
    this.redrawActiveArea();
  }

  redrawActiveArea () {
    this.activeArea.clear(COLOR_SCHEME.SURFACE_VARIANT);

    if (!this.animation) return false;
    if (!this.activeArea.context) return false;

    if (this.animation.type == 'number') {
      this.drawNumberCurve();
      return true;
    }
    if (this.animation.type == 'color') {
      this.drawColorVisualization();
      return true;
    }
    if (this.animation.type == 'point') {
      this.drawPointCurves();
      return true;
    }
  }

  drawNumberCurve () {
    const keyframePositionToActiveAreaPosition = x => { return this.timeline.getPositionFromScroll(this.timeline.sequence.getAbsolutePosition(x)) - CONSTANTS.SEQUENCE_INITIAL_X_OFFSET; };
    const style = { color: COLOR_SCHEME.PRIMARY };

    const minValue = this.animation.min;
    const maxValue = this.animation.max;

    const valueToDrawPosition = y => { return (y - maxValue) / (minValue - maxValue) * this.activeArea.height; };

    const values = Object.entries(this.animation.getValues());

    let previousPosition = 0;
    let previousValue = valueToDrawPosition(this.animation.keyframes[0].value);

    values.forEach(positionValuePair => {
      const position = keyframePositionToActiveAreaPosition(positionValuePair[0]);
      const value = valueToDrawPosition(positionValuePair[1]);
      this.activeArea.line(pt(previousPosition, previousValue), pt(position, value), style);
      previousPosition = position;
      previousValue = value;
    });

    // final line
    this.activeArea.line(pt(previousPosition, previousValue), pt(this.activeArea.width, previousValue), style);
  }

  drawColorVisualization () {
    const keyframePositionToActiveAreaPosition = x => { return this.timeline.getPositionFromScroll(this.timeline.sequence.getAbsolutePosition(x)) - CONSTANTS.SEQUENCE_INITIAL_X_OFFSET; };

    const sampling = 0.01;
    const values = Object.entries(this.animation.getValues(sampling));

    const samplingWidth = this.timeline.getScrollDeltaFromDistance(sampling);

    const rectStartY = (this.activeArea.height / 5) * 2;
    const rectHeight = this.activeArea.height / 5;

    values.forEach(positionValuePair => {
      const position = keyframePositionToActiveAreaPosition(positionValuePair[0]);
      this.activeArea.rect(pt(position, rectStartY), pt(samplingWidth * 2, rectHeight), { fill: true, fillColor: positionValuePair[1], color: COLOR_SCHEME.TRANSPARENT });
    });
  }

  drawPointCurves () {
    const xStyle = { color: COLOR_SCHEME.PRIMARY };
    const yStyle = { color: COLOR_SCHEME.PRIMARY_VARIANT };

    const keyframePositionToActiveAreaPosition = x => { return this.timeline.getPositionFromScroll(this.timeline.sequence.getAbsolutePosition(x)) - CONSTANTS.SEQUENCE_INITIAL_X_OFFSET; };

    const flipCurve = animatedProperties[this.animation.property] && animatedProperties[this.animation.property].flipCurve;

    const minXValue = this.animation.getMin('x');
    const minYValue = flipCurve ? this.animation.getMax('y') : this.animation.getMin('y');
    const maxXValue = this.animation.getMax('x');
    const maxYValue = flipCurve ? this.animation.getMin('y') : this.animation.getMax('y');

    const XvalueToDrawPosition = y => { return (y - maxXValue) / (minXValue - maxXValue) * this.activeArea.height; };
    const YvalueToDrawPosition = y => { return (y - maxYValue) / (minYValue - maxYValue) * this.activeArea.height; };

    const values = Object.entries(this.animation.getValues());

    let previousPosition = 0;
    let previousXValue = XvalueToDrawPosition(this.animation.keyframes[0].value.x);
    let previousYValue = YvalueToDrawPosition(this.animation.keyframes[0].value.y);

    values.forEach(positionValuePair => {
      const position = keyframePositionToActiveAreaPosition(positionValuePair[0]);
      const Xvalue = XvalueToDrawPosition(positionValuePair[1].x);
      const Yvalue = YvalueToDrawPosition(positionValuePair[1].y);
      this.activeArea.line(pt(previousPosition, previousXValue), pt(position, Xvalue), xStyle);
      this.activeArea.line(pt(previousPosition, previousYValue), pt(position, Yvalue), yStyle);
      previousPosition = position;
      previousXValue = Xvalue;
      previousYValue = Yvalue;
    });

    // final lines
    this.activeArea.line(pt(previousPosition, previousXValue), pt(this.activeArea.width, previousXValue), xStyle);
    this.activeArea.line(pt(previousPosition, previousYValue), pt(this.activeArea.width, previousYValue), yStyle);
  }

  abandon () {
    disconnect(this.morph, 'name', this, 'onMorphNameChange');
    super.abandon();
  }
}

export class GlobalTimelineLayer extends TimelineLayer {
  static get properties () {
    return {
      draggable: {
        defaultValue: true
      },
      nativeCursor: {
        defaultValue: 'grab'
      },
      layer: {
        set (layer) {
          this.setProperty('layer', layer);
          this.tooltip = layer.name;
        }
      }
    };
  }

  get timelineSequences () {
    return this.submorphs.filter(submorph => !!submorph.isTimelineSequence);
  }

  get name () {
    return this.layer.name;
  }

  updateTooltip () {
    this.tooltip = this.name;
  }

  onHoverIn (event) {
    if (event.hand.timelineSequenceStates && event.hand.timelineSequenceStates[0].isMove) {
      const timelineLayerIndices = event.hand.timelineSequenceStates.map(timelineSequenceState => timelineSequenceState.timelineSequence.timelineLayer.index);
      const minLayerIndex = Math.min(...timelineLayerIndices);
      const maxLayerIndex = Math.max(...timelineLayerIndices);
      let moveUp = false;
      if (this.index < event.hand.draggedSequence.timelineLayer.index) {
        moveUp = true;
        if (minLayerIndex == 0) return;
      } else {
        if (maxLayerIndex == this.highestIndex) return;
      }
      event.hand.timelineSequenceStates.forEach(timelineSequenceState => {
        if (timelineSequenceState.isMove) {
          timelineSequenceState.timelineSequence.timelineLayer = this.container.submorphs[timelineSequenceState.timelineSequence.timelineLayer.index + (moveUp ? -1 : 1)];
        }
      });
    }
  }

  changeBorderAppearance () {
    [this, this.activeArea, this.inactiveArea].forEach(morph => {
      morph.borderWidth = 3;
      morph.borderColor = COLOR_SCHEME.PRIMARY;
    });
  }

  resetBorderAppearance () {
    [this, this.activeArea, this.inactiveArea].forEach(morph => {
      morph.borderWidth = 0;
      morph.borderColor = COLOR_SCHEME.PRIMARY;
    });
  }

  onDragStart (event) {
    const undo = this.container.undoStart('overview-layer-drag');
    undo.addTarget(this.timeline);
    this.changeBorderAppearance();
  }

  onDrag (event) {
    const index = (event.hand.position.y - this.container.globalPosition.y) / (this.extent.y + 2 * this.container.layout.spacing);
    this.moveLayerToIndex(index);
  }

  onDragEnd (event) {
    this.container.undoStop('overview-layer-drag');
    this.resetBorderAppearance();
  }

  moveLayerToIndex (index) {
    if (index < 0) {
      index = 0;
    }
    if (index > this.container.submorphs.length - 1) {
      index = this.container.submorphs.length - 1;
    }
    this.remove();
    this.container.addMorphAt(this, Math.round(index));
    this.timeline.arrangeLayerInfos();
    this.timeline.updateZIndicesFromTimelineLayerPositions();

    this.timeline.ui.cursor.remove();
    this.container.addMorph(this.timeline.ui.cursor);
  }

  moveLayerBy (number) {
    this.moveLayerToIndex(this.index + number);
  }

  getAllSequencesIntersectingWith (rectangle) {
    return this.timelineSequences.filter(timelineSequence => timelineSequence.bounds().intersects(rectangle));
  }

  deselectAllSequences () {
    this.timelineSequences.forEach(timelineSequence => timelineSequence.selected = false);
  }

  toggleHiddenStyle () {
    this.timelineSequences.forEach(timelineSequence => timelineSequence.updateAppearance());
    this.activeArea.fill = this.layer.hidden ? COLOR_SCHEME.BACKGROUND_VARIANT : COLOR_SCHEME.SURFACE_VARIANT;
  }
}

export class OverviewSequenceTimelineLayer extends SequenceTimelineLayer {
  static get properties () {
    return {
      isExpanded: {
        defaultValue: false,
        set (isExpanded) {
          this.setProperty('isExpanded', isExpanded);
          if (this.layerInfo && this.layerInfo.ui.collapseButton) {
            isExpanded ? this.expand() : this.collapse();
          }
        }
      },
      isOverviewLayer: {
        defaultValue: true
      }
    };
  }

  updateTooltip () {
    this.tooltip = this.isExpanded ? '' : this.morph.name;
  }

  collapse () {
    this.layerInfo.restyleCollapseToggle();
    this.opacity = 1;
    this.updateTooltip();
    this.reactsToPointer = true;
    this.updateTimelineKeyframes();
    this.timeline.removePropertyLayers(this);
  }

  expand () {
    if (!this.mayBeExpanded) {
      this.isExpanded = false;
      $world.inform('Expanding is only available for morphs with keyframes.');
      return;
    }
    this.layerInfo.restyleCollapseToggle();
    this.opacity = 0;
    this.updateTooltip();
    this.reactsToPointer = false;
    this.removeAllTimelineKeyframes();
    this.timeline.createPropertyLayers(this);
  }

  removeAllTimelineKeyframes () {
    this.keyframes.forEach(keyframe => keyframe.remove());
  }

  get mayBeExpanded () {
    return this.containsKeyframes;
  }

  get containsKeyframes () {
    return this.keyframes.length > 0;
  }

  updateTimelineKeyframes () {
    this.removeAllTimelineKeyframes();
    this.timeline.addTimelineKeyframesForLayer(this);
  }
}
