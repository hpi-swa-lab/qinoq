import { Morph } from 'lively.morphic';
import { COLOR_SCHEME } from '../colors.js';
import { pt, Color } from 'lively.graphics';
import { CONSTANTS } from './constants.js';
import { connect, disconnect } from 'lively.bindings';
import { Canvas } from 'lively.components/canvas.js';
import { animatedProperties, getColorForProperty } from '../properties.js';
import { TimelineKeyframe, KeyframeLine } from './keyframe.js';
import { QinoqMorph } from '../qinoq-morph.js';
export class TimelineLayer extends QinoqMorph {
  static get properties () {
    return {
      layerInfo: {},
      container: {
        initialize () {
          if (!this._deserializing) this.addAreaMorphs();
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
      }
    };
  }

  get isTimelineLayer () {
    return true;
  }

  relayout () {
    this.height = CONSTANTS.LAYER_HEIGHT;
  }

  get timeline () {
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
      reactsToPointer: false,
      fill: COLOR_SCHEME.SURFACE_VARIANT,
      name: 'active area',
      borderStyle: { bottom: 'solid', left: 'none', right: 'none', top: 'solid' },
      acceptsDrops: false
    }));
    const inactiveArea = this.addMorph(new QinoqMorph({
      draggable: true,
      extent: pt(CONSTANTS.INACTIVE_AREA_WIDTH, CONSTANTS.LAYER_HEIGHT),
      fill: this.fill,
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

  __after_deserialize__ (snapshot, ref, pool) {
    this.inactiveArea.onDragStart = event => this.onDragStart(event);
    this.inactiveArea.onDrag = event => this.onDrag(event);
    this.inactiveArea.onDragEnd = event => this.onDragEnd(event);
    super.__after_deserialize__(snapshot, ref, pool);
  }

  get inactiveArea () {
    return this.getSubmorphNamed('inactive area');
  }

  get activeArea () {
    return this.getSubmorphNamed('active area');
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
          if (!this._deserializing) {
            this.tooltip = layer.name;
            this.name = layer.name;
          }
        }
      }
    };
  }

  get timelineSequences () {
    return this.submorphs.filter(submorph => !!submorph.isTimelineSequence);
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

export class SequenceTimelineLayer extends TimelineLayer {
  static get properties () {
    return {
      morph: {
        set (morph) {
          this.setProperty('morph', morph);
          if (!this._deserializing) connect(morph, 'name', this, 'onMorphNameChange').update();
        }
      },
      animation: {
        set (animation) {
          this.setProperty('animation', animation);

          if (!this._deserializing) {
            this.fill = getColorForProperty(animation.property);
            this.inactiveArea.fill = this.fill;
            this.updateTooltip();
            this.layerInfo.updateLabel();
            this.redraw();
          }
        }
      }
    };
  }

  // just name leads to name collisions when using the getter in subclasses
  get morphName () {
    return this.morph.name;
  }

  get sequence () {
    return this.timeline.sequence;
  }

  updateTooltip () {
    throw new Error('Subclass resposibility');
  }

  onMorphNameChange () {
    this.updateTooltip();
    if (this.layerInfo) this.layerInfo.updateLabel();
  }

  onMouseDown (event) {
    if (event.targetMorphs[0] !== this) return;
    this.editor.ui.inspector.targetMorph = this.morph;
    if (this.morph.world()) this.morph.show();
  }

  __after_deserialize__ (snapshot, ref, pool) {
    this.redraw();
    super.__after_deserialize__(snapshot, ref, pool);
  }

  abandon () {
    disconnect(this.morph, 'name', this, 'onMorphNameChange');
    super.abandon();
  }
}

export class OverviewSequenceTimelineLayer extends SequenceTimelineLayer {
  static get properties () {
    return {
      isExpanded: {
        defaultValue: false,
        set (isExpanded) {
          this.setProperty('isExpanded', isExpanded);
          if (this.layerInfo && this.layerInfo.ui.collapseButton && !this._deserializing) {
            isExpanded ? this.expand() : this.collapse();
            this.redraw();
          }
        }
      },
      propertyLayers: {
        defaultValue: []
      }
    };
  }

  get keyframeLines () {
    return this.submorphs.filter(submorph => submorph.isKeyframeLine);
  }

  get isOverviewLayer () {
    return true;
  }

  get containsKeyframeLines () {
    return this.keyframeLines.length > 0;
  }

  getPropertyLayerFor (animation) {
    return this.propertyLayers.find(propertyLayer => propertyLayer.animation === animation);
  }

  updateTooltip () {
    this.tooltip = this.isExpanded ? '' : this.morphName;
  }

  async redraw () {
    await this.activeArea.whenRendered();
    this.layerInfo.height = this.height;
    this.activeArea.height = this.height;
    this.inactiveArea.height = this.height;
    this.keyframeLines.forEach(keyframeLine => keyframeLine.updatePosition());
  }

  collapse () {
    this.layerInfo.restyleCollapseToggle();
    this.opacity = 1;

    this.height = this.expandedHeight;

    this.updateTooltip();
    this.reactsToPointer = true;
    this.addTimelineKeyframes();
    this.removePropertyLayers();
  }

  removePropertyLayers () {
    this.propertyLayers.forEach(propertyLayer => {
      propertyLayer.layerInfo.abandon();
      propertyLayer.abandon();
    });
  }

  addTimelineKeyframes () {
    const animations = this.sequence.getAnimationsForMorph(this.morph);
    animations.forEach((animation, index) => this.addKeyframesForAnimation(animation, index));
    this.height = Math.max(CONSTANTS.LAYER_HEIGHT, CONSTANTS.KEYFRAME_LINE_HEIGHT + 2 * CONSTANTS.KEYFRAME_LINE_HEIGHT * animations.length);
    this.layerInfo.height = this.height;
    this.redraw();
  }

  expand () {
    this.layerInfo.restyleCollapseToggle();
    this.opacity = 0;
    this.expandedHeight = this.height;
    this.height = CONSTANTS.LAYER_HEIGHT;

    this.updateTooltip();
    this.reactsToPointer = false;
    this.removeKeyframeLines();
    this.createPropertyLayers();
  }

  createPropertyLayers () {
    this.propertyLayers = this.sequence.getAnimationsForMorph(this.morph).map(animation => {
      // we assume that each sequence only holds one animation per morph per property
      const propertyLayer = this.timeline.createTimelineLayer(this.morph, this.index + 1, animation.property);
      propertyLayer.animation = animation;
      propertyLayer.overviewLayer = this;
      propertyLayer.addKeyframesForAnimation(animation);
      return propertyLayer;
    });
    this.timeline.onActiveAreaWidthChange();
  }

  addKeyframesForAnimation (animation, index) {
    const keyframeLine = this.addMorph(new KeyframeLine({
      _editor: this.editor,
      animation,
      layer: this,
      yPosition: CONSTANTS.KEYFRAME_LINE_HEIGHT + 2 * CONSTANTS.KEYFRAME_LINE_HEIGHT * index
    }));
    this.onNumberOfKeyframeLinesChanged();
  }

  removeKeyframeLines () {
    this.keyframeLines.forEach(keyframeLine => keyframeLine.abandon());
  }

  onNumberOfKeyframeLinesChanged () {
    const containsKeyframes = this.containsKeyframeLines || this.propertyLayers.some(propertyLayer => propertyLayer.containsKeyframes);
    if (!containsKeyframes) this.isExpanded = false;
    this.layerInfo.onNumberOfKeyframeLinesInLayerChanged(containsKeyframes);
  }

  updateTimelineKeyframes () {
    this.removeKeyframeLines();
    this.addTimelineKeyframes();
    this.onNumberOfKeyframeLinesChanged();
  }

  scrollToKeyframe (keyframe, animation) {
    this.isExpanded = true;
    this.getPropertyLayerFor(animation).scrollToKeyframe(keyframe);
  }
}

export class PropertySequenceTimelineLayer extends SequenceTimelineLayer {
  get keyframes () {
    return this.submorphs.filter(submorph => submorph.isTimelineKeyframe);
  }

  get containsKeyframes () {
    return this.numberOfKeyframes > 0;
  }

  get numberOfKeyframes () {
    return this.keyframes.length;
  }

  updateTooltip () {
    this.tooltip = `${this.morphName}` + (this.animation ? `:${this.animation.property}` : '');
  }

  onMouseDown (event) {
    super.onMouseDown(event);
    // we get the event before the keyframes
    // if the click is on a keyframe we do not need to handle it
    if (this.morphsContainingPoint(event.hand.position).filter(morph => morph.isTimelineKeyframe).length > 0) return;
    this.timeline.deselectAllTimelineKeyframes();
  }

  async redraw () {
    await this.activeArea.whenRendered();
    if (this.keyframes.length == 0) return;
    this.keyframes.forEach(timelineKeyframe => {
      timelineKeyframe._lockModelUpdate = true;
      timelineKeyframe.position = pt(this.timeline.getPositionFromKeyframe(timelineKeyframe.keyframe), timelineKeyframe.position.y);
      timelineKeyframe._lockModelUpdate = false;
    });
    this.redrawActiveArea();
  }

  addTimelineKeyframes () {
    const animations = this.sequence.getAnimationsForMorph(this.morph);
    animations.forEach((animation, index) => this.addKeyframesForAnimation(animation));
    this.height = Math.max(CONSTANTS.LAYER_HEIGHT, CONSTANTS.KEYFRAME_LINE_HEIGHT + 2 * CONSTANTS.KEYFRAME_LINE_HEIGHT * animations.length);
    this.layerInfo.height = this.height;
    this.redraw();
  }

  addKeyframesForAnimation (animation) {
    animation.keyframes.forEach(keyframe => {
      const timelineKeyframe = this.addMorph(new TimelineKeyframe({ _editor: this.editor, layer: this, _keyframe: keyframe, animation }));
      timelineKeyframe.updatePosition();
    });
    this.onNumberOfKeyframesChanged();
  }

  onNumberOfKeyframesChanged () {
    if (!this.containsKeyframes) {
      this.layerInfo.abandon();
      this.overviewLayer.onNumberOfKeyframeLinesChanged();
      this.abandon();
    }
  }

  redrawActiveArea () {
    const [h, s, b] = this.fill.toHSB();

    (this.fill == COLOR_SCHEME.BACKGROUND_VARIANT)
      ? this.activeArea.clear(COLOR_SCHEME.ON_BACKGROUND_VARIANT)
      : this.activeArea.clear(Color.hsb(h, (s - 0.3), b + 0.1));

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
    const style = { color: COLOR_SCHEME.KEYFRAME_FILL };

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
    const xStyle = { color: COLOR_SCHEME.KEYFRAME_FILL };
    const yStyle = { color: COLOR_SCHEME.KEYFRAME_BORDER };

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

  async scrollToKeyframe (keyframe) {
    const timelineKeyframe = this.keyframes.find(timelineKeyframe => timelineKeyframe.keyframe === keyframe);
    this.timeline.scrollToTimelineKeyframe(timelineKeyframe);

    // If this line is removed, the scroll does not happen (Race issue)
    await new Promise(r => setTimeout(r, 20));
    timelineKeyframe.show();
  }
}
