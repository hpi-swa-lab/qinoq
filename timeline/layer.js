import { COLOR_SCHEME } from '../colors.js';
import { pt, Color } from 'lively.graphics';
import { connect, disconnect } from 'lively.bindings';
import { Canvas } from 'lively.components/canvas.js';
import { animatedProperties, getColorForProperty } from '../properties.js';
import { TimelineKeyframe, KeyframeLine } from './keyframe.js';
import { QinoqMorph } from '../qinoq-morph.js';
import { TIMELINE_CONSTANTS } from './constants.js';
import { ActiveArea } from './active-area.js';
import { error } from '../utilities/messages.js';

export class TimelineLayer extends QinoqMorph {
  static get properties () {
    return {
      layouter: {},
      layerInfo: {},
      container: {
        initialize () {
          if (!this._deserializing) this.addActiveArea();
        }
      },
      focusable: {
        defaultValue: false
      },
      fill: {
        defaultValue: COLOR_SCHEME.BACKGROUND_VARIANT
      },
      timeline: {}
    };
  }

  get isTimelineLayer () {
    return true;
  }

  updateLayerPosition () {
    this.timeline.updateLayerPositions();
  }

  get index () {
    return this.container.submorphs.indexOf(this.owner);
  }

  get highestIndex () {
    // timeline cursor is also a submorph
    return (this.container.submorphs.length - 2);
  }

  addActiveArea () {
    const activeArea = this.addMorph(new ActiveArea({
      extent: pt(
        TIMELINE_CONSTANTS.IN_EDIT_MODE_SEQUENCE_WIDTH,
        this.isGlobalTimelineLayer ? TIMELINE_CONSTANTS.GLOBAL_LAYER_HEIGHT : TIMELINE_CONSTANTS.SEQUENCE_LAYER_HEIGHT)
    }));
  }

  get activeArea () {
    return this.getSubmorphNamed('active area');
  }

  remove () {
    this.owner.remove();
    super.remove();
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
      acceptsDrops: {
        defaultValue: true
      },
      height: {
        defaultValue: TIMELINE_CONSTANTS.GLOBAL_LAYER_HEIGHT
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

  get isGlobalTimelineLayer () {
    return true;
  }

  addActiveArea () {
    super.addActiveArea();
    this.activeArea.reactsToPointer = false;
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
          timelineSequenceState.timelineSequence.timelineLayer = this.container.submorphs[timelineSequenceState.timelineSequence.timelineLayer.index + (moveUp ? -1 : 1)].submorphs[0];
        }
      });
    }
  }

  changeBorderAppearance () {
    [this, this.activeArea].forEach(morph => {
      morph.borderWidth = 3;
      morph.borderColor = COLOR_SCHEME.PRIMARY;
    });
  }

  resetBorderAppearance () {
    [this, this.activeArea].forEach(morph => {
      morph.borderWidth = 0;
      morph.borderColor = COLOR_SCHEME.PRIMARY;
    });
  }

  onDragStart () {
    const undo = this.container.undoStart('overview-layer-drag');
    undo.addTarget(this.timeline);
    this.changeBorderAppearance();
  }

  onDrag (event) {
    const index = (event.hand.position.y - this.container.globalPosition.y) / (this.extent.y + 2 * this.container.layout.spacing);
    this.moveLayerToIndex(index);
  }

  onDragEnd () {
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
    this.container.addMorphAt(this.layouter, Math.round(index));
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

  tryPasteSequence (position) {
    const sequence = this.editor.clipboard.content.sequence;
    if (this.interactive.sequenceWouldBeValidInLayer(null, position, sequence.duration, this.layer)) {
      this.editor.pasteSequenceAt(position, this.layer);
    } else {
      error('Not enough space!');
    }
  }

  menuItems (event) {
    const menuItems = [];
    const clickedScrollPosition = this.timeline.getScrollFromPosition(this.localize(event.hand.position).x);

    if (this.editor.clipboard.containsSequence) menuItems.push(['✏️ Paste Sequence', () => this.tryPasteSequence(clickedScrollPosition)]);
    return menuItems;
  }
}

export class SequenceTimelineLayer extends TimelineLayer {
  static get properties () {
    return {
      height: {
        defaultValue: TIMELINE_CONSTANTS.SEQUENCE_LAYER_HEIGHT
      },
      morph: {
        set (morph) {
          this.setProperty('morph', morph);
          if (!this._deserializing) connect(morph, 'name', this, 'onMorphNameChange').update();
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
    throw new Error('Subclass responsibility');
  }

  onMorphNameChange () {
    this.updateTooltip();
    if (this.layerInfo) this.layerInfo.updateLabel();
  }

  onMouseDown (event) {
    if (event.targetMorphs[1] !== this) return;
    this.editor.ui.inspector.targetMorph = this.morph;
    if (this.morph.world()) this.morph.show();
  }

  abandon (bool) {
    disconnect(this.morph, 'name', this, 'onMorphNameChange');
    super.abandon(bool);
  }
}

export class OverviewTimelineLayer extends SequenceTimelineLayer {
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

  toggleExpand () {
    this.isExpanded = !this.isExpanded;
  }

  get mayBeExpanded () {
    return (!this.isExpanded && this.containsKeyframeLines);
  }

  getPropertyLayerFor (animation) {
    return this.propertyLayers.find(propertyLayer => propertyLayer.animation === animation);
  }

  updateTooltip () {
    this.tooltip = this.isExpanded ? '' : this.morphName;
  }

  async redraw () {
    this.layerInfo.height = this.height;
    this.activeArea.height = this.height;
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
    this.height = Math.max(TIMELINE_CONSTANTS.SEQUENCE_LAYER_HEIGHT, TIMELINE_CONSTANTS.KEYFRAME_LINE_HEIGHT + 2 * TIMELINE_CONSTANTS.KEYFRAME_LINE_HEIGHT * animations.length);
    this.layerInfo.height = this.height;
    this.redraw();
  }

  expand () {
    this.layerInfo.restyleCollapseToggle();
    this.opacity = 0;
    this.expandedHeight = this.height;
    this.height = TIMELINE_CONSTANTS.SEQUENCE_LAYER_HEIGHT;

    this.updateTooltip();
    this.reactsToPointer = false;
    this.removeKeyframeLines();
    this.createPropertyLayers();
  }

  createPropertyLayers () {
    this.propertyLayers = this.sequence.getAnimationsForMorph(this.morph).map(animation => {
      // we assume that each sequence only holds one animation per morph per property
      const propertyLayer = new PropertyTimelineLayer({
        morph: this.morph,
        _editor: this.editor,
        timeline: this.timeline
      });
      this.timeline.addTimelineLayer(propertyLayer, this.index + 1, animation.property);
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
      yPosition: TIMELINE_CONSTANTS.KEYFRAME_LINE_HEIGHT + 2 * TIMELINE_CONSTANTS.KEYFRAME_LINE_HEIGHT * index
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

export class PropertyTimelineLayer extends SequenceTimelineLayer {
  static get properties () {
    return {
      animation: {
        set (animation) {
          this.setProperty('animation', animation);

          if (!this._deserializing) {
            this.fill = this.animation.type == 'color' ? COLOR_SCHEME.BACKGROUND_VARIANT : getColorForProperty(animation.property);
            this.updateTooltip();
            this.layerInfo.updateLabel();
            this.redraw();
          }
        },
        overviewLayer: {}
      }
    };
  }

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

  async redraw (options = {}) {
    await this.activeArea.whenRendered();
    if (this.keyframes.length == 0) return;
    if (!options.doNotRepositionKeyframes) {
      this.keyframes.forEach(timelineKeyframe => {
        timelineKeyframe._lockModelUpdate = true;
        timelineKeyframe.position = pt(this.timeline.getPositionFromKeyframe(timelineKeyframe.keyframe), timelineKeyframe.position.y);
        timelineKeyframe._lockModelUpdate = false;
      });
    }
    this.redrawActiveArea();
  }

  addTimelineKeyframes () {
    const animations = this.sequence.getAnimationsForMorph(this.morph);
    animations.forEach((animation, index) => this.addKeyframesForAnimation(animation));
    this.height = Math.max(TIMELINE_CONSTANTS.GLOBAL_LAYER_HEIGHT, TIMELINE_CONSTANTS.KEYFRAME_LINE_HEIGHT + 2 * TIMELINE_CONSTANTS.KEYFRAME_LINE_HEIGHT * animations.length);
    this.layerInfo.height = this.height;
    this.redraw();
  }

  addKeyframesForAnimation (animation) {
    animation.keyframes.forEach(keyframe => {
      const timelineKeyframe = this.addMorph(new TimelineKeyframe({
        _editor: this.editor,
        layer: this,
        _keyframe: keyframe,
        animation
      }));
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
    if (this.animation.type == 'string') {
      this.drawStringVisualization();
      return true;
    }
  }

  keyframePositionToActiveAreaPosition (x) { return this.timeline.getPositionFromScroll(this.timeline.sequence.getAbsolutePosition(x)) - TIMELINE_CONSTANTS.SEQUENCE_INITIAL_X_OFFSET; }

  drawNumberCurve () {
    const style = { color: COLOR_SCHEME.KEYFRAME_FILL };

    const minValue = this.animation.min;
    const maxValue = this.animation.max;

    const valueToDrawPosition = y => { return (y - maxValue) / (minValue - maxValue) * this.activeArea.height; };

    const values = Object.entries(this.animation.getValues());

    let previousPosition = 0;
    let previousValue = valueToDrawPosition(this.animation.keyframes[0].value);

    values.forEach(positionValuePair => {
      const position = this.keyframePositionToActiveAreaPosition(positionValuePair[0]);
      const value = valueToDrawPosition(positionValuePair[1]);
      this.activeArea.line(pt(previousPosition, previousValue), pt(position, value), style);
      previousPosition = position;
      previousValue = value;
    });

    // final line
    this.activeArea.line(pt(previousPosition, previousValue), pt(this.activeArea.width, previousValue), style);
  }

  drawColorVisualization () {
    const sampling = 0.01;
    const values = Object.entries(this.animation.getValues(sampling));

    const samplingWidth = this.timeline.getScrollDeltaFromDistance(sampling);

    const rectStartY = (this.activeArea.height / 5) * 2;
    const rectHeight = this.activeArea.height / 5;

    values.forEach(positionValuePair => {
      const position = this.keyframePositionToActiveAreaPosition(positionValuePair[0]);
      this.activeArea.rect(pt(position, rectStartY), pt(samplingWidth * 2, rectHeight), { fill: true, fillColor: positionValuePair[1], color: COLOR_SCHEME.TRANSPARENT });
    });
  }

  drawPointCurves () {
    const xStyle = { color: COLOR_SCHEME.KEYFRAME_FILL, baseline: 'top' };
    const yStyle = { color: COLOR_SCHEME.KEYFRAME_BORDER };

    this.activeArea.text('x', pt(0, 0), xStyle);
    this.activeArea.text('y', pt(0, this.activeArea.height), yStyle);

    this.activeArea.text('x', pt(this.activeArea.width, 0), { align: 'end', ...xStyle });
    this.activeArea.text('y', pt(this.activeArea.width, this.activeArea.height), { align: 'end', ...yStyle });

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
      const position = this.keyframePositionToActiveAreaPosition(positionValuePair[0]);
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

  drawStringVisualization () {
    const sampling = 0.01;
    const values = Object.entries(this.animation.getValues(sampling));

    const style = { color: COLOR_SCHEME.ON_BACKGROUND, font: '12px monospace' };

    const textY = this.activeArea.height / 2;

    let currentText = this.animation.keyframes[0].value;
    let newChar;

    values.forEach(positionValuePair => {
      const position = this.keyframePositionToActiveAreaPosition(positionValuePair[0]);
      const value = positionValuePair[1];
      if (currentText != value) {
        newChar = value[value.length - 1];
        currentText = value;
        this.activeArea.text(newChar, pt(position, textY), style);
      }
    });
  }

  onHoverIn () {
    if (this.animation.property == 'position') {
      this.editor.ui.preview.addAnimationPreview(this.animation);
    }
  }

  onHoverOut () {
    this.editor.ui.preview.removeAnimationPreview();
  }

  __after_deserialize__ (snapshot, ref, pool) {
    this.redraw();
    super.__after_deserialize__(snapshot, ref, pool);
  }
}
