import { Morph, Icon, Label } from 'lively.morphic';
import { COLOR_SCHEME } from '../colors.js';
import { pt } from 'lively.graphics';
import { CONSTANTS } from './constants.js';
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
    this.addActiveAreaMorph();
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

  addActiveAreaMorph () {
    this.addMorph(new Morph({
      extent: pt(CONSTANTS.IN_EDIT_MODE_SEQUENCE_WIDTH, CONSTANTS.LAYER_HEIGHT),
      position: pt(CONSTANTS.SEQUENCE_INITIAL_X_OFFSET, 0),
      fill: COLOR_SCHEME.SURFACE_VARIANT,
      reactsToPointer: false,
      name: 'active area',
      acceptsDrops: false
    }));
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
    this.editor.inspector.targetMorph = this.morph;
    if (this.morph.world()) this.morph.show();
  }
}

export class GlobalTimelineLayer extends TimelineLayer {
  static get properties () {
    return {
      grabbable: {
        defaultValue: true
      },
      draggable: {
      // setting grabbable sets draggable to true but only via the setter and not with the default value, but we need draggable to be true as well
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

  onBeingDroppedOn (hand, recipient) {
    let index = (hand.position.y - this.container.globalPosition.y) / (this.extent.y + 2 * this.container.layout.spacing);
    if (index < 0) {
      index = 0;
    }
    if (index > this.container.submorphs.length - 1) {
      index = this.container.submorphs.length - 1;
    }
    this.container.addMorphAt(this, Math.round(index));
    this.timeline.arrangeLayerInfos();
    this.timeline.updateZIndicesFromTimelineLayerPositions();
  }

  getAllSequencesIntersectingWith (rectangle) {
    return this.timelineSequences.filter(timelineSequence => timelineSequence.bounds().intersects(rectangle));
  }

  deselectAllSequences () {
    this.timelineSequences.forEach(timelineSequence => {
      timelineSequence.selected = false;
    });
  }
}

export class OverviewSequenceTimelineLayer extends SequenceTimelineLayer {
  static get properties () {
    return {
      isExpanded: {
        defaultValue: false,
        set (isExpanded) {
          this.setProperty('isExpanded', isExpanded);
          if (this.layerInfo && this.layerInfo.getSubmorphNamed('collapseButton')) {
            isExpanded ? this.expand() : this.collapse();
          }
        }
      },
      isOverviewLayer: {
        defaultValue: true
      }
    };
  }

  addCollapseToggle () {
    const arrowLabel = new Label({ name: 'collapseButton', position: pt(10, 10), fontSize: 15 });
    Icon.setIcon(arrowLabel, 'caret-right');
    arrowLabel.nativeCursor = 'pointer';
    this.layerInfo.addMorph(arrowLabel);
    arrowLabel.onMouseUp = () => { this.isExpanded = !this.isExpanded; };
  }

  collapse () {
    const arrowLabel = this.layerInfo.getSubmorphNamed('collapseButton');
    Icon.setIcon(arrowLabel, 'caret-right');
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
    const arrowLabel = this.layerInfo.getSubmorphNamed('collapseButton');
    Icon.setIcon(arrowLabel, 'caret-down');
    this.opacity = 0;
    this.tooltip = '';
    this.reactsToPointer = false;
    this.removeAllTimelineKeyframes();
    this.timeline.createPropertyLayers(this);
  }

  removeAllTimelineKeyframes () {
    this.withAllSubmorphsDo(submorph => {
      if (submorph.isTimelineKeyframe) {
        submorph.removeMorph();
      }
    });
  }

  containsKeyframes () {
    let containsKeyframes = false;
    this.withAllSubmorphsDo(submorph => {
      if (submorph.isTimelineKeyframe) {
        containsKeyframes = true;
      }
    });
    return containsKeyframes;
  }

  updateTimelineKeyframes () {
    this.removeAllTimelineKeyframes();
    this.timeline.addTimelineKeyframesForLayer(this);
  }
}
