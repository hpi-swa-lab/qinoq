import { Morph, config, ProportionalLayout } from 'lively.morphic';
import { pt, Color } from 'lively.graphics';
import { connect, disconnect, signal, disconnectAll } from 'lively.bindings';
import { newUUID } from 'lively.lang/string.js';
import { arr } from 'lively.lang';
import { DeserializationAwareMorph } from './utilities/deserialization-morph.js';
import { zoomKeyPressed } from './keys.js';

const DEFAULT_SCROLLOVERLAY_OPACITY = 0.001;

export class Interactive extends DeserializationAwareMorph {
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
    return morph.isInteractive || morph.isSequence || Sequence.getSequenceOfMorph(morph);
  }

  static get properties () {
    return {
      // if this is true, changes to the scrollPosition of the interactive will not be propagated to the scroll overlay
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
        defaultValue: 16 / 9,
        set (aspectRatio) {
          this.setProperty('fixedAspectRatio', aspectRatio);
          // eslint-disable-next-line no-self-assign
          this.extent = this.extent;
        }
      },
      extent: {
        defaultValue: pt(533, 300),
        set (extent) {
          const previousHeight = this.extent.y;
          if (this.fixedAspectRatio) {
            extent.x = extent.y * this.fixedAspectRatio;
          }
          this.setProperty('extent', extent);
          if (!this._deserializing) {
            this.scaleText(previousHeight);
          }
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

  fitBounds (extent) {
    this.extent = extent;
  }

  interactiveZoomed () {
    // a hook to listen for zooming in the interactive
  }

  // this is to be called if the scrollPosition is changed via any means that are not natural scrolling
  onExternalScrollChange (scrollPosition) {
    this.blockScrollEvents = true;

    // this is necessary since the actual change of this.scrollPosition will only be done after onScroll on the InteractiveScrollHolder was executed
    // the scrollEvent for that is not handled synchronously
    this.scrollPosition = scrollPosition;
    this.scrollOverlay.setProperty('scroll', pt(0, scrollPosition));
  }

  // this can be listened to to get changes to the scrollPosition due to natural scrolling
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
      halosEnabled: false,
      acceptsDrops: false
    });
    this.scrollOverlay.addMorph(scrollLengthContainer);
    connect(this, 'position', this.scrollOverlay, 'position');
    connect(this, 'onLengthChange', scrollLengthContainer, 'extent', { converter: '(length) => pt(1, length + source.extent.y)', varMapping: { pt } });
    connect(this, 'extent', this, 'updateScrollContainerExtents');
  }

  scaleText (previousHeight) {
    const morphsWithText = this.sequences.flatMap(sequence => sequence.submorphs).filter(morph => 'fontSize' in morph);
    morphsWithText.forEach(morph => {
      const fontExtentRatio = morph.fontSize / previousHeight;
      morph.fontSize = Math.round(fontExtentRatio * this.extent.y);
    });
  }

  updateScrollContainerExtents () {
    this.scrollOverlay.extent = this.extent;
    const scrollableContent = this.scrollOverlay.submorphs[0];
    scrollableContent.extent = pt(1, this.extent.y + this._length);
  }

  updateInteractiveLength () {
    this._length = Math.max(...this.sequences.map(sequence => sequence.end));
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
        if (sequence.owner !== this) {
          sequence.onSequenceEnter();
        }
        this.addMorph(sequence);
      } else if (sequence.owner == this) {
        sequence.remove();
        sequence.onSequenceLeave();
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

  getSequenceInLayerBefore (sequence) {
    const sequencesInLayer = this.getSequencesInLayer(sequence.layer);
    sequencesInLayer.sort((a, b) => a.start - b.start); // Sort in ascending order
    const sequenceIndex = sequencesInLayer.indexOf(sequence);
    return sequencesInLayer[sequenceIndex - 1];
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

  getNextSequenceStart (scrollPosition = this.scrollPosition) {
    return this.getSequenceStarts().find(sequenceStart => sequenceStart > scrollPosition);
  }

  getPrevSequenceStart (scrollPosition = this.scrollPosition) {
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
    this.updateInteractiveLength();
    signal(this, 'onSequenceAddition', sequence);
    connect(this, 'extent', sequence, 'extent');
  }

  removeSequence (sequence) {
    disconnectAll(sequence);
    disconnect(this, 'extent', sequence, 'extent');
    arr.remove(this.sequences, sequence);
    sequence.remove();
    signal(this, 'onSequenceRemoval', sequence);
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
        if (animation.keyframes.find(anotherKeyframe => anotherKeyframe.equals(keyframe))) {
          foundAnimation = animation;
          break;
        }
      }
      if (foundAnimation) {
        return { sequence, animation: foundAnimation };
      }
    }
  }

  get thisAndAllSubmorphs () {
    const result = [this];
    this.sequences.forEach(sequence => sequence.withAllSubmorphsDo(morph => result.push(morph)));
    return result;
  }

  get isScrollBarVisible () {
    return this.scrollOverlay.opacity != DEFAULT_SCROLLOVERLAY_OPACITY;
  }

  setScrollBarVisibility (visible) {
    this.scrollOverlay.opacity = visible ? 1 : DEFAULT_SCROLLOVERLAY_OPACITY;
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
        defaultValue: DEFAULT_SCROLLOVERLAY_OPACITY
      },
      fill: {
        defaultValue: Color.transparent
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
      newMorph: {},
      scrollToResize: {
        defaultValue: false
      }
    };
  }

  get topbar () {
    return $world.getSubmorphNamed('lively top bar');
  }

  onMouseWheel (event) {
    if (this.scrollToResize && zoomKeyPressed(event)) {
      event.domEvt.preventDefault();
      this.interactive.extent = pt(this.interactive.extent.x - event.domEvt.deltaY, this.interactive.extent.y + event.domEvt.deltaY);
      this.interactive.interactiveZoomed();
    }
  }

  onScroll (event) {
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
    this.setNewMorph();
    if (!this.passThroughMorph && this.delegatedTarget) {
      event.state.dragStartMorphPosition = this.dragStartPosition;
      // this should not be necessary but if we do not call this here
      // grabbing will only work once
      // in theory the onDragEnd of the delegatedTarget should stop the undo
      // and we do not start a separate one
      this.env.undoManager.undoStop();
      this.delegatedTarget.onDragEnd(event);
    }
    this.opacity = DEFAULT_SCROLLOVERLAY_OPACITY;
    this.clipMode = 'auto';
  }

  onHoverIn (event) {
    if (this.passThroughMorph && this.topbar) {
      // upon attaching a new target to the topbar it switches to halo mode
      // since we attach on HoverIn, we need to restore the previous mode
      // otherwise no mode except for halo mode would be possible
      const topbarMode = this.topbar.editMode;
      this.topbar.attachToTarget(this);
      this.topbar.setEditMode(topbarMode);
      // used for creation of morph that get created via single click (e.g. label)
      connect(this.topbar, 'handleShapeCreation', this, 'setNewMorph');
    }
  }

  onHoverOut (event) {
    if (this.passThroughMorph && this.topbar) {
      this.topbar.attachToTarget($world);
      disconnect(this.topbar, 'handleShapeCreation', this, 'setNewMorph');
    }
  }

  onDrop (event) {
    if (event.type != 'morphicdragend') return;
    if (!this.passThroughMorph) {
      signal(this, 'rejectDrop', event);
      return;
    }
    event.hand.grabbedMorphs.forEach(grabbedMorph => {
      const { pointerAndShadow } = event.hand._grabbedMorphProperties.get(grabbedMorph) || {};
      Object.assign(grabbedMorph, pointerAndShadow);
      this.newMorph = grabbedMorph;
    });
  }

  onMouseDown (event) {
    super.onMouseDown(event);
    this.currentMouseTarget = this.getUnderlyingMorph(event.hand.position);

    // allows to select text in text morphs by dragging in sequence view
    if (!this.passThroughMorph || this.topbar.editMode == 'Halo' || this.topbar.editMode == 'Hand') this.updateEventDispatcherState();
    this.currentMouseTarget.onMouseDown(event);
  }

  onDoubleMouseDown (event) {
    if (this.getUnderlyingMorph(event.hand.position) == this.currentMouseTarget) this.currentMouseTarget.onDoubleMouseDown(event);
  }

  createMockEvent (target) {
    return {
      hand: $world.firstHand,
      isClickTarget: () => false,
      targetMorph: target,
      position: $world.firstHand.position,
      positionIn: (morph) => morph.localize($world.firstHand.position),
      state: {}
    };
  }

  onMouseMove (event) {
    // for not absolutely clear reasons it is important that this comes before the hover handling
    this.currentMouseTarget = this.getUnderlyingMorph(event.hand.position);
    this.updateEventDispatcherState();
    if (!this.currentMouseTarget) return;

    if (this.currentMouseTarget == this.previousMorphUnderMouse) return;
    if (this.currentMouseTarget) {
      this.currentMouseTarget.onMouseMove(event);
      this.currentMouseTarget.onHoverIn(this.createMockEvent(this.currentMouseTarget));
      this.handleTooltips(this.currentMouseTarget);
      (this.topbar && (this.topbar.editMode == 'Text' || this.topbar.editMode == 'Shape'))
        ? this.nativeCursor = 'crosshair'
        : this.nativeCursor = this.currentMouseTarget.nativeCursor;
    }
    if (this.previousMorphUnderMouse) {
      this.previousMorphUnderMouse.onHoverOut(this.createMockEvent(this.currentMouseTarget));
      this.tooltipViewer.hoverOutOfMorph(this.tooltipViewer.currentMorph);
    }

    this.previousMorphUnderMouse = this.currentMouseTarget;
  }

  onMouseUp (event) {
    this.getUnderlyingMorph(event.hand.position).onMouseUp(event);
  }

  get tooltipViewer () {
    return $world._tooltipViewer;
  }

  handleTooltips (target) {
    const handTooltipOffset = pt(10, 7);
    if (target.tooltip) {
      this.tooltipViewer.currentMorph = target;
      this.tooltipViewer.timer = setTimeout(
        () => {
          const hand = $world.firstHand;
          this.tooltipViewer.showTooltipFor(target, hand);
          if (this.tooltipViewer.currentTooltip) this.tooltipViewer.currentTooltip.position = hand.position.addPt(handTooltipOffset);
        },
        config.showTooltipsAfter * 1000);
    }
  }

  onContextMenu (event) {
    const underlyingMorph = this.getUnderlyingMorph(event.hand.position);
    event.targetMorphs.unshift(underlyingMorph);
    underlyingMorph.onContextMenu(event);
  }

  // some morphs (like textMorphs) check some state that is saved here to determine if they are focused or not
  // just changing the values in the events that are passed around does not suffice
  // therefore we change this state here with the values that we need for the event delegation
  updateEventDispatcherState () {
    this.env.eventDispatcher.eventState.focusedMorph = this.currentMouseTarget;
    this.env.eventDispatcher.eventState.clickedOnMorph = this.currentMouseTarget;
  }

  setNewMorph () {
    if (this.passThroughMorph) {
      const newMorph = this.submorphs.filter(submorph => submorph.name !== 'scrollable content')[0];
      if (newMorph) {
        this.newMorph = newMorph;
        // resetting this on mouse up will break the creation of morphs with a single click
        this.topbar.setEditMode('Hand');
      }
    }
  }

  getUnderlyingMorph (position) {
    let targetedMorph = this.morphBeneath(position);
    while (targetedMorph && targetedMorph.isSequence) {
      targetedMorph = targetedMorph.morphBeneath(position);
    }
    return targetedMorph;
  }

  onOwnerChanged (newOwner) {
    if (!newOwner) return;
    // for unkown reasons, the scrollOverlay escaped the editor on some interactions
    // this catches it back it
    if (this.owner != this.interactive.owner) {
      this.interactive.owner.addMorph(this);
    }
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
    this.uuid = newUUID();
  }

  equals (layer) {
    return this.uuid === layer.uuid;
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
        defaultValue: Color.transparent
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
      _originalGrayscale: { defaultValue: 0 },
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

  get isEmpty () {
    return this.submorphs.length === 0;
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
  * Name "removeMorph" is already taken, a call with doNotAbandonMorph = false,
  *  results in clearing all connections from sequence to morph
  *  while not calling abandon on the morph
  **/
  abandonMorph (morph, doNotAbandonMorph = false) {
    if (doNotAbandonMorph) morph.remove(); else morph.abandon(true);
    this.animations.filter(animation => animation.target == morph).forEach(animation => this.removeAnimation(animation));
    signal(this, 'onMorphRemoval', morph);
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
    this.submorphs.forEach(submorph => typeof submorph.onInteractiveScrollChange === 'function' && submorph.onInteractiveScrollChange(scrollPosition));
  }

  onSequenceEnter () {
    this.submorphs.forEach(submorph => typeof submorph.onSequenceEnter === 'function' && submorph.onSequenceEnter());
  }

  onSequenceLeave () {
    this.submorphs.forEach(submorph => typeof submorph.onSequenceLeave === 'function' && submorph.onSequenceLeave());
  }

  getAbsolutePosition (progress) {
    return Math.round((this.duration * progress) + this.start);
  }

  addAnimation (animation) {
    this.animations.push(animation);
    signal(this, 'onAnimationAddition', animation);
  }

  removeAnimation (animation) {
    arr.remove(this.animations, animation);
    signal(this, 'onAnimationRemoval', animation);
  }

  getAnimationForMorphProperty (morph, property) {
    // Assumes only one animation per property/morph combination
    const possibleAnimations = this.animations.filter(animation => animation.target === morph && animation.property === property);
    return possibleAnimations[0];
  }

  // Generic interface to add a keyframe to a sequence
  async addKeyframeForMorph (keyframe, morph, property, propertyType = 'point', transformKeyframe = false) {
    const existingAnimation = this.getAnimationForMorphProperty(morph, property);

    const transformKeyframeValue = (animation) => {
      if (transformKeyframe && animation.useRelativeValues && propertyType == 'point') {
        keyframe.value = pt(keyframe.value.x / this.width, keyframe.value.y / this.height);
      }
    };

    if (existingAnimation) {
      transformKeyframeValue(existingAnimation);
      existingAnimation.addKeyframe(keyframe);
      return existingAnimation;
    }
    const { createAnimationForPropertyType } = await System.import('qinoq/animations.js');
    const newAnimation = createAnimationForPropertyType(propertyType, morph, property);
    transformKeyframeValue(newAnimation);
    newAnimation.addKeyframe(keyframe);
    this.addAnimation(newAnimation);
    return newAnimation;
  }

  onKeyframeAddedInAnimation (change = { keyframe: null, animation: null }) {
    // used for connections
  }

  onKeyframeRemovedInAnimation (change = { keyframe: null, animation: null }) {
    // used for connections
  }

  getAnimationsForMorph (morph) {
    return this.animations.filter(animation => animation.target === morph);
  }

  get allKeyframes () {
    return this.animations.map(animation => animation.keyframes).flat().sort((a, b) => a.position - b.position);
  }

  getNextKeyframePositionForAbsolutePosition (absolutePosition) {
    return this.allKeyframes.map(keyframe => keyframe.position).find(keyframePosition => this.getAbsolutePosition(keyframePosition) > absolutePosition);
  }

  getPrevKeyframePositionForAbsolutePosition (absolutePosition) {
    return this.allKeyframes.reverse().map(keyframe => keyframe.position).find(keyframePosition => this.getAbsolutePosition(keyframePosition) < absolutePosition);
  }

  getAbsolutePositionFor (keyframe) {
    return Math.round(this.start + (this.duration * keyframe.position));
  }

  getRelativePositionFor (scrollPosition) {
    return (scrollPosition - this.start) / this.duration;
  }

  onLoad () {
    // while saving the easings itself get lost and we need to recreate them
    this.animations.forEach(animation => animation.keyframes.forEach(keyframe => keyframe.setEasing(keyframe.easingName)));
  }
}
