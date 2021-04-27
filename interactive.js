import { Morph, ProportionalLayout } from 'lively.morphic';
import { pt } from 'lively.graphics';
import { connect, disconnect, signal, disconnectAll } from 'lively.bindings';
import { newUUID } from 'lively.lang/string.js';
import { COLOR_SCHEME } from './colors.js';
import { arr } from 'lively.lang';
import { DeserializationAwareMorph } from './utilities/deserialization-morph.js';

export class Interactive extends Morph {
  static async base (props = {}) {
    const interactive = new Interactive(props);
    const { exampleForegroundLayer, exampleBackgroundLayer } = await System.import('qinoq/examples.js');
    const foregroundLayer = exampleForegroundLayer();
    const backgroundLayer = exampleBackgroundLayer();
    interactive.addLayer(backgroundLayer);
    interactive.addLayer(foregroundLayer);

    const baseSequence = Sequence.baseSequence({ layer: foregroundLayer });
    interactive.addSequence(baseSequence);

    return interactive;
  }

  static isMorphInInteractive (morph) {
    return morph.isSequence || Sequence.getSequenceOfMorph(morph);
  }

  static get properties () {
    return {
      // if this is true, changes to the scrollposition of the interactive will not be propagated to the scroll overlay
      blockScrollEvents: {
        defaultValue: false
      },
      _length: {
        type: 'Number',
        isFloat: false,
        min: 0,
        set (_length) {
          this.setProperty('_length', _length);
          signal(this, 'onLengthChange', _length);
        }
      },
      scrollPosition: {
        type: 'Number',
        isFloat: false,
        defaultValue: 0,
        set (scrollPosition) {
          if (Math.abs(scrollPosition - this.scrollPosition) < 0.5) return; // redraw may be costly! If you want to redraw use redraw explicitly
          this.setProperty('scrollPosition', scrollPosition);
          this.redraw();
        }
      },
      fixedAspectRatio: {
        defaultValue: 16 / 9
      },
      extent: {
        defaultValue: pt(533, 300),
        set (extent) {
          if (this.fixedAspectRatio) {
            extent.x = extent.y * this.fixedAspectRatio;
          }
          this.setProperty('extent', extent);
        }
      },
      sequences: {
        defaultValue: []
      },
      layers: {
        defaultValue: []
      },
      clipMode: {
        defaultValue: 'hidden'
      },
      nextKeyframeNumber: {
        // used for default keyframe names
        type: 'Number',
        defaultValue: 1
      },
      _scrollOverlay: {
        after: ['extent'],
        initialize () {
          this.initScrollOverlay();
          // VDOM seems to hold older nodes and mistakes them for the new ScrollHolder
          // this leads to unexpected jumps of the scrollPosition
          // therefore we reset it again here with respect to the rendering routine
          this.whenRendered().then(() => { this.scrollOverlay.scroll = pt(0, 0); });
        }
      }
    };
  }

  // this is to be called if the scrollposition is changed via any means that are not natural scrolling
  onExternalScrollChange (scrollPosition) {
    this.blockScrollEvents = true;

    // this is necessary since the actual change of this.scrollPosition will only be done after onScroll on the InteractiveScrollHolder was executed
    // the scrollEvent for that is not handled synchronously
    this.scrollPosition = scrollPosition;
    this.scrollOverlay.setProperty('scroll', pt(0, scrollPosition));
  }

  // this can be listened to to get changes to the scrollposition due to natural scrolling
  onInternalScrollChange (scrollPosition) {}

  get scrollOverlay () {
    return this._scrollOverlay;
  }

  set scrollOverlay (scrollOverlay) {
    this._scrollOverlay = scrollOverlay;
  }

  initScrollOverlay () {
    this.scrollOverlay = new InteractiveScrollHolder({ interactive: this });
    const scrollLengthContainer = new Morph({
      name: 'scrollable content',
      halosEnabled: false
    });
    this.scrollOverlay.addMorph(scrollLengthContainer);
    connect(this, 'position', this.scrollOverlay, 'globalPosition', { converter: '() => source.globalPosition' });
    connect(this, 'onLengthChange', scrollLengthContainer, 'extent', { converter: '(length) => pt(1, length + source.extent.y)', varMapping: { pt } });
    connect(this, 'extent', this, 'updateScrollContainerExtents');
  }

  updateScrollContainerExtents () {
    this.scrollOverlay.extent = this.extent;
    const scrollableContent = this.scrollOverlay.submorphs[0];
    scrollableContent.extent = pt(1, this.extent.y + this._length);
  }

  updateInteractiveLength () {
    let length = 0;
    this.sequences.forEach(sequence => {
      if (sequence.end > length) length = sequence.end;
    });
    this._length = length;
  }

  openInWorld () {
    this.updateInteractiveLength();
    super.openInWorld();
    this.scrollOverlay.openInWorld();
    this.scrollOverlay.position = this.position;
  }

  remove () {
    this.scrollOverlay.remove();
    super.remove();
  }

  onOwnerChanged (newOwner) {
    if (newOwner && this.scrollOverlay) {
      newOwner.addMorph(this.scrollOverlay);
    }
  }

  get isInteractive () {
    return true;
  }

  redraw () {
    this.sequences.forEach(sequence => {
      sequence.updateProgress(this.scrollPosition);
      if (sequence.isDisplayed()) {
        this.addMorph(sequence);
      } else {
        sequence.remove();
      }
    });
  }

  // Is called every time any layer changes zIndex
  sortSequences () {
    this.sequences.sort((a, b) => a.layer.zIndex - b.layer.zIndex);
    this.redraw();
  }

  getSequencesInLayer (layer) {
    return this.sequences.filter(sequence => sequence.layer === layer);
  }

  getSequencesInLayerBetween (layer, start, end) {
    return this.getSequencesInLayer(layer).filter(sequence => (sequence.end >= start && sequence.end <= end) || (sequence.start >= start && sequence.start <= end));
  }

  getSequenceInLayerAfter (sequence) {
    const sequencesInLayer = this.getSequencesInLayer(sequence.layer);
    sequencesInLayer.sort((a, b) => a.start - b.start); // Sort in ascending order
    const sequenceIndex = sequencesInLayer.indexOf(sequence);
    return sequencesInLayer[sequenceIndex + 1];
  }

  getLastSequenceInLayer (layer) {
    return this.getSequencesInLayer(layer).sort((a, b) => b.end - a.end)[0];
  }

  getSequenceStarts () {
    return this.sequences.map(sequence => sequence.start).sort((a, b) => a - b);
  }

  getNextSequenceStart (scrollPosition) {
    return this.getSequenceStarts().find(sequenceStart => sequenceStart > scrollPosition);
  }

  getPrevSequenceStart (scrollPosition) {
    return this.getSequenceStarts().reverse().find(sequenceStart => sequenceStart < scrollPosition);
  }

  addLayer (layer) {
    this.layers.push(layer);
    layer.interactive = this;
  }

  removeLayer (layer) {
    arr.remove(this.layers, layer);
    this.getSequencesInLayer(layer).forEach(sequence => this.removeSequence(sequence));
  }

  get highestZIndex () {
    return Math.max(...this.layers.map(layer => layer.zIndex));
  }

  addSequence (sequence) {
    connect(sequence, 'layer', this, 'sortSequences');
    this.sequences.push(sequence);
    if (!sequence.layer || !this.layers.includes(sequence.layer)) {
      sequence.layer = this.layers[0];
    }
    sequence.interactive = this;
    connect(this, 'extent', sequence, 'extent');
  }

  removeSequence (sequence) {
    disconnectAll(sequence);
    disconnect(this, 'extent', sequence, 'extent');
    arr.remove(this.sequences, sequence);
    sequence.remove();
    this.updateInteractiveLength();
  }

  sequenceWouldBeValidInLayer (sequence, start, duration, layer) {
    return this.getSequencesInLayerBetween(layer, start, start + duration).filter(s => s != sequence).length === 0;
  }

  validSequenceStart (sequence, start) {
    if (start == undefined || start == null || isNaN(start)) return false;
    if (start < 0) return false;
    return this.getSequencesInLayerBetween(sequence.layer, start, start + sequence.duration).filter(s => s != sequence).length === 0;
  }

  validSequenceDuration (sequence, duration) {
    if (duration == undefined || duration == null || isNaN(duration)) return false;
    if (duration < 1) return false;
    const nextSequence = this.getSequenceInLayerAfter(sequence);
    if (nextSequence) {
      return nextSequence.start >= sequence.start + duration;
    }
    return true;
  }

  showOnly (sequence) {
    if (sequence) {
      this.sequences.forEach(seq => {
        seq.focused = (sequence == seq);
      });
    }
    this.redraw();
  }

  showAllSequences () {
    this.sequences.forEach(seq => {
      seq.focused = true;
    });
    this.redraw();
  }

  get length () {
    return this._length;
  }

  findKeyframe (keyframe) {
    for (const sequence of this.sequences) {
      let foundAnimation;
      for (const animation of sequence.animations) {
        if (animation.keyframes.includes(keyframe)) {
          foundAnimation = animation;
          break;
        }
      }
      if (foundAnimation) {
        return { sequence, animation: foundAnimation };
      }
    }
  }
}

class InteractiveScrollHolder extends Morph {
  static get properties () {
    return {
      interactive: {
        set (interactive) {
          this.setProperty('interactive', interactive);
          if (this.interactive) {
            this.extent = pt(this.interactive.width, this.interactive.height);
          }
        }
      },
      name: {
        defaultValue: 'scrollable container'
      },
      clipMode: {
        defaultValue: 'auto'
      },
      // opacity of zero leads to removal of object from DOM in firefox
      opacity: {
        defaultValue: 0.001
      },
      fill: {
        defaultValue: COLOR_SCHEME.TRANSPARENT
      },
      halosEnabled: {
        defaultValue: false
      },
      draggable: {
        defaultValue: true
      },
      passThroughMorph: {
        defaultValue: false
      },
      // holds morphs that are created with the topbar for the editor to subscribe to
      newMorph: {}
    };
  }

  onMouseMoving (mousePosition) {
    const morphUnderMouse = this.getUnderlyingMorph(mousePosition);
    if (morphUnderMouse == this.previousMorphUnderMouse) return;
    if (morphUnderMouse) morphUnderMouse.onHoverIn({ hand: $world.firstHand });
    if (this.previousMorphUnderMouse) this.previousMorphUnderMouse.onHoverOut({ hand: $world.firstHand });
    this.previousMorphUnderMouse = morphUnderMouse;
  }

  abandon () {
    disconnect($world.firstHand, 'position', this, 'onMouseMoving');
  }

  onScroll () {
    if (!this.interactive.blockScrollEvents) {
      this.interactive.scrollPosition = this.scroll.y;
      this.interactive.onInternalScrollChange(this.interactive.scrollPosition);
    }
    this.interactive.blockScrollEvents = false;
  }

  onDrag (event) {
    if (!this.passThroughMorph && this.delegatedTarget) {
      event.state.dragStartMorphPosition = this.dragStartPosition;
      this.delegatedTarget.onDrag(event);
    }
  }

  onDragStart (event) {
    this.opacity = 1;
    this.clipMode = 'hidden';
    if (!this.passThroughMorph) {
      const targetMorph = this.getUnderlyingMorph(event.hand.position);
      this.delegatedTarget = undefined;
      if (targetMorph.draggable) {
        this.delegatedTarget = targetMorph;
        const { dragStartMorphPosition } = event.state;
        this.dragStartPosition = targetMorph.position;
        event.state.dragStartMorphPosition = this.dragStartPosition;
        targetMorph.onDragStart(event);
      }
    }
  }

  onDragEnd (event) {
    if (this.passThroughMorph) {
      const newMorph = this.submorphs.filter(submorph => submorph.name !== 'scrollable content')[0];
      if (newMorph) this.newMorph = newMorph;
    }
    if (!this.passThroughMorph && this.delegatedTarget) {
      event.state.dragStartMorphPosition = this.dragStartPosition;
      // this should not be neccessary but if we do not call this here
      // grabbing will only work once
      // in theory the onDragEnd of the delegatedTarget should stop the undo
      // and we do not start a separate one
      this.env.undoManager.undoStop();
      this.delegatedTarget.onDragEnd(event);
    }
    this.opacity = 0.001;
    this.clipMode = 'auto';
  }

  onHoverIn (event) {
    connect(event.hand, 'position', this, 'onMouseMoving');

    if (this.passThroughMorph && $world.get('lively top bar')) {
      $world.get('lively top bar').attachToTarget(this);
      // should not be neccessary, this is a bug in upstream lively
      $world.get('lively top bar').setEditMode($world.get('lively top bar').editMode);
    }
  }

  onHoverOut (event) {
    disconnect(event.hand, 'position', this, 'onMouseMoving');

    if (this.passThroughMorph && $world.get('lively top bar')) {
      $world.get('lively top bar').attachToTarget($world);
      // should not be neccessary, this is a bug in upstream lively
      $world.get('lively top bar').setEditMode($world.get('lively top bar').editMode);
    }
  }

  onDrop (event) {
    if (event.type != 'morphicdrop' || !this.passThroughMorph) return;
    event.hand.grabbedMorphs.forEach(grabbedMorph => {
      const { pointerAndShadow } = event.hand._grabbedMorphProperties.get(grabbedMorph) || {};
      Object.assign(grabbedMorph, pointerAndShadow);
      this.newMorph = grabbedMorph;
    });
  }

  onMouseDown (event) {
    super.onMouseDown(event);
    this.lastMouseDownTarget = this.getUnderlyingMorph(event.hand.position);
    this.lastMouseDownTarget.onMouseDown(event);
  }

  onDoubleMouseDown (event) {
    if (this.getUnderlyingMorph(event.hand.position) == this.lastMouseDownTarget) this.lastMouseDownTarget.onDoubleMouseDown(event);
  }

  onMouseUp (event) {
    this.getUnderlyingMorph(event.hand.position).onMouseUp(event);
  }

  getUnderlyingMorph (position) {
    let targetedMorph = this.morphBeneath(position);
    while (targetedMorph && targetedMorph.isSequence) {
      targetedMorph = targetedMorph.morphBeneath(position);
    }
    return targetedMorph;
  }
}

export class Layer {
  set zIndex (zIndex) {
    this._zIndex = zIndex;
    if (this.interactive) {
      this.interactive.sortSequences();
    }
  }

  get zIndex () {
    return this._zIndex;
  }

  constructor (props = {}) {
    const {
      name = 'Unnamed Layer',
      hidden = false,
      zIndex = 0
    } = props;
    this.name = name;
    this.hidden = hidden;
    this._zIndex = zIndex;
    this.id = newUUID();
  }

  equals (layer) {
    return this.id === layer.id;
  }
}

export class Sequence extends DeserializationAwareMorph {
  static get properties () {
    return {
      start: {
        defaultValue: 0
      },
      duration: {
        defaultValue: 0,
        isFloat: false
      },
      _progress: {
        defaultValue: 0,
        isFloat: true
      },
      layer: {},
      name: {
        defaultValue: 'unnamed sequence'
      },
      fill: {
        defaultValue: COLOR_SCHEME.TRANSPARENT
      },
      reactsToPointer: {
        defaultValue: false
      },
      halosEnabled: {
        defaultValue: false
      },
      extent: {
        defaultValue: pt(0, 0)
      },
      focused: {
        defaultValue: true,
        set (focused) {
          this.setProperty('focused', focused);
          this.applyUnfocusedEffect();
        }
      },
      _originalOpacity: { defaultValue: 1 },
      _originalGrayscale: { defualtValue: 0 },
      opacity: {
        defaultValue: 1,
        set (opacity) {
          this.setProperty('opacity', opacity);
          if (!this._lockEffect && !this._deserializing) this._originalOpacity = opacity;
        }
      },
      grayScale: {
        defaultValue: 0,
        set (grayscale) {
          this.setProperty('grayscale', grayscale);
          if (!this._lockEffect && !this._deserializing) this._originalGrayscale = grayscale;
        }
      },
      animations: {
        defaultValue: []
      },
      interactive: {
        set (interactive) {
          this.setProperty('interactive', interactive);
          this.extent = interactive.extent;
          this.layout = new ProportionalLayout({ lastExtent: this.extent });
        }
      },
      isHidden: {
        defaultValue: false,
        set (isHidden) {
          this.setProperty('isHidden', isHidden);
          if (this.interactive) this.interactive.redraw();
        }
      }
    };
  }

  static getSequenceOfMorph (morph) {
    return morph ? morph.ownerChain().find(m => m.isSequence) : undefined;
  }

  static baseSequence (props = {}) {
    return new Sequence({ name: 'first sequence', start: 0, duration: 250, ...props });
  }

  get isSequence () {
    return true;
  }

  get end () {
    return this.start + this.duration;
  }

  get progress () {
    return this._progress;
  }

  isDisplayed () {
    return this.progress >= 0 && this.progress < 1 && !this.layer.hidden && !this.isHidden;
  }

  toggleHide () {
    this.isHidden = !this.isHidden;
  }

  /**
  * Remove a morph from a sequence and clear references to it,
  * e.g. removing animations with that morph
  **/
  abandonMorph (morph) {
    morph.abandon(true);
    this.animations.filter(animation => animation.target == morph).forEach(animation => this.removeAnimation(animation));
  }

  applyUnfocusedEffect () {
    this.submorphs.forEach(submorph => submorph.halosEnabled = this.focused);
    // stop opacity and grayscale setters from overwriting saved effects
    this._lockEffect = true;
    this.opacity = this.focused ? this._originalOpacity : 0.2;
    this.grayscale = this.focused ? this._originalGrayscale : 1;
    this._lockEffect = false;
  }

  updateProgress (scrollPosition) {
    this._progress = (scrollPosition - this.start) / this.duration;
    this.animations.forEach(animation => animation.progress = this.progress);
  }

  getAbsolutePosition (progress) {
    return (this.duration * progress) + this.start;
  }

  addAnimation (animation) {
    this.animations.push(animation);
  }

  removeAnimation (animation) {
    arr.remove(this.animations, animation);
  }

  getAnimationForMorphProperty (morph, property) {
    // Assumes only one animation per property/morph combination
    const possibleAnimations = this.animations.filter(animation => animation.target === morph && animation.property === property);
    return possibleAnimations[0];
  }

  // Generic interface to add a keyframe to a sequence
  async addKeyframeForMorph (keyframe, morph, property, proptype = 'point') {
    const existingAnimation = this.getAnimationForMorphProperty(morph, property);

    if (existingAnimation) {
      existingAnimation.addKeyframe(keyframe);
      return existingAnimation;
    }
    const { createAnimationForPropertyType } = await System.import('qinoq/animations.js');
    const newAnimation = createAnimationForPropertyType(proptype, morph, property);
    newAnimation.addKeyframe(keyframe);
    this.addAnimation(newAnimation);
    return newAnimation;
  }

  getAnimationsForMorph (morph) {
    return this.animations.filter(animation => animation.target === morph);
  }

  getAllKeyframes () {
    return this.animations.map(animation => animation.keyframes).flat().sort((a, b) => a.position - b.position);
  }

  getNextKeyframePosition (position) {
    return this.getAllKeyframes().map(keyframe => keyframe.position).find(keyframePosition => keyframePosition > position);
  }

  getPrevKeyframePosition (position) {
    return this.getAllKeyframes().map(keyframe => keyframe.position).reverse().find(keyframePosition => keyframePosition < position);
  }

  getAbsolutePositionFor (keyframe) {
    return this.start + (this.duration * keyframe.position);
  }

  getRelativePositionFor (scrollPosition) {
    return (scrollPosition - this.start) / this.duration;
  }

  onLoad () {
    // while savings the easings itself get lost and we need to recreate them
    this.animations.forEach(animation => animation.keyframes.forEach(keyframe => keyframe.setEasing(keyframe.easingName)));
  }
}
