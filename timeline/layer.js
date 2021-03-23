import { Morph, Icon, Label } from 'lively.morphic';
import { COLOR_SCHEME } from '../colors.js';
import { pt } from 'lively.graphics';
import { CONSTANTS } from './constants.js';
import { connect } from 'lively.bindings';
export class TimelineLayer extends Morph {
  static get properties () {
    return {
      layerInfo: {},
      container: {},
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

  initialize (editor, container) {
    this._editor = editor;
    this.container = container;
    this.addAreaMorphs();
  }

  get isTimelineLayer () {
    return true;
  }

  relayout () {
    this.height = CONSTANTS.LAYER_HEIGHT;
  }

  get timeline () {
    return this.owner.owner;
  }

  updateLayerPosition () {
    this.timeline.updateLayerPositions();
  }

  get index () {
    return this.container.submorphs.indexOf(this);
  }

  addAreaMorphs () {
    const activeArea = this.addMorph(new Morph({
      extent: pt(0, CONSTANTS.LAYER_HEIGHT),
      position: pt(CONSTANTS.SEQUENCE_INITIAL_X_OFFSET, 0),
      fill: COLOR_SCHEME.SURFACE_VARIANT,
      reactsToPointer: false,
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
      morph: {}
    };
  }

  initialize (editor, container, morph) {
    super.initialize(editor, container);
    this.tooltip = morph.name;
    this.morph = morph;
  }

  get name () {
    return this.morph.name;
  }

  onMouseUp (evt) {
    super.onMouseUp(evt);
    if (evt.targetMorphs[0] !== this) return;
    this.editor.inspector.targetMorph = this.morph;
    if (this.morph.world()) this.morph.show();
  }

  get keyframes () {
    return this.submorphs.filter(submorph => submorph.isTimelineKeyframe);
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
      layer: {}
    };
  }

  initialize (editor, container, layer) {
    super.initialize(editor, container);
    this.layer = layer;
    this.tooltip = layer.name;
  }

  get timelineSequences () {
    return this.submorphs.filter(submorph => !!submorph.isTimelineSequence);
  }

  get name () {
    return this.layer.name;
  }

  onHoverIn (event) {
    super.onHoverIn(event);
    if (event.hand.timelineSequenceStates) {
      event.hand.timelineSequenceStates.forEach(dragState => {
        dragState.timelineSequence.timelineLayer = this;
      });
    }
  }

  onMouseDown (event) {
    super.onMouseDown(event);
    this.timeline.deselectAllSequences();
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
    let index = (event.hand.position.y - this.container.globalPosition.y) / (this.extent.y + 2 * this.container.layout.spacing);
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
  }

  onDragEnd (event) {
    this.container.undoStop('overview-layer-drag');
    this.resetBorderAppearance();
  }

  getAllSequencesIntersectingWith (rectangle) {
    return this.timelineSequences.filter(timelineSequence => timelineSequence.bounds().intersects(rectangle));
  }

  deselectAllSequences () {
    this.timelineSequences.forEach(timelineSequence => {
      timelineSequence.selected = false;
    });
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

  collapse () {
    this.layerInfo.restyleCollapseToggle();
    this.opacity = 1;
    this.tooltip = this.morph.name;
    this.reactsToPointer = true;
    this.timeline.addTimelineKeyframesForLayer(this);
    this.timeline.removePropertyLayers(this);
  }

  expand () {
    if (!this.containsKeyframes()) {
      this.isExpanded = false;
      $world.inform('Expanding is only available for morphs with keyframes.');
      return;
    }
    this.layerInfo.restyleCollapseToggle();
    this.opacity = 0;
    this.tooltip = '';
    this.reactsToPointer = false;
    this.removeAllTimelineKeyframes();
    this.timeline.createPropertyLayers(this);
  }

  removeAllTimelineKeyframes () {
    this.keyframes.forEach(keyframe => keyframe.removeMorph());
  }

  containsKeyframes () {
    return !!this.keyframes;
  }

  updateTimelineKeyframes () {
    this.removeAllTimelineKeyframes();
    this.timeline.addTimelineKeyframesForLayer(this);
  }
}
