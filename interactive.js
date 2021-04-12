import { Morph, ProportionalLayout, Image, Ellipse, Polygon } from 'lively.morphic';
import { Color, pt } from 'lively.graphics';
import { connect, disconnect, signal, disconnectAll } from 'lively.bindings';
import { newUUID } from 'lively.lang/string.js';
import { COLOR_SCHEME } from './colors.js';
import { Keyframe, createAnimationForPropertyType, NumberAnimation, PointAnimation, ColorAnimation } from 'qinoq';
import { LottieMorph } from './interactive-morphs/lottie-morph.js';
import { arr } from 'lively.lang';

export class Interactive extends Morph {
  static example () {
    const interactive = new Interactive();

    const foregroundLayer = Layer.exampleForegroundLayer();
    const middleLayer = Layer.exampleMiddleLayer();
    const backgroundLayer = Layer.exampleBackgroundLayer();
    const day = Sequence.backgroundDayExample();
    day.layer = backgroundLayer;
    const night = Sequence.backgroundNightExample();
    night.layer = backgroundLayer;
    const tree = Sequence.treeExample();
    tree.layer = middleLayer;
    const sky = Sequence.skyExample();
    sky.layer = foregroundLayer;
    interactive.addLayer(backgroundLayer);
    interactive.addLayer(middleLayer);
    interactive.addLayer(foregroundLayer);
    interactive.addSequence(day);
    interactive.addSequence(night);
    interactive.addSequence(tree);
    interactive.addSequence(sky);
    interactive.redraw();
    return interactive;
  }

  static base () {
    const interactive = new Interactive();
    const foregroundLayer = Layer.exampleForegroundLayer();
    const backgroundLayer = Layer.exampleBackgroundLayer();
    interactive.addLayer(backgroundLayer);
    interactive.addLayer(foregroundLayer);

    return interactive;
  }

  static get properties () {
    return {
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
          const scrollOverlayNode = this.scrollOverlay.env.renderer.getNodeForMorph(this.scrollOverlay);
          if (scrollOverlayNode) {
            scrollOverlayNode.scrollTop = scrollPosition;
            this.scrollOverlay.setProperty('scroll', pt(scrollOverlayNode.scrollLeft, scrollOverlayNode.scrollTop));
          }
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

  onScroll (evt) {
    this.interactive.scrollPosition = this.scroll.y;
  }

  onDrag (evt) {
    if (!this.passThroughMorph && this.delegatedTarget) {
      this.delegatedTarget.onDrag(evt);
    }
  }

  onDragStart (evt) {
    this.opacity = 1;
    this.clipMode = 'hidden';
    if (!this.passThroughMorph) {
      console.log(evt);
      const targetMorph = this.getUnderlyingMorph(evt.hand.position);
      this.delegatedMorph = undefined;
      if (targetMorph.draggable) {
        this.delegatedTarget = targetMorph;
        targetMorph.onDragStart(evt);
      }
    }
  }

  onDragEnd (evt) {
    if (this.passThroughMorph) {
      const newMorph = this.submorphs.filter(submorph => submorph.name !== 'scrollable content')[0];
      if (newMorph) this.newMorph = newMorph;
    }
    if (!this.passThroughMorph && this.delegatedTarget) {
      this.delegatedTarget.onDragEnd(evt);
    }
    this.opacity = 0.001;
    this.clipMode = 'auto';
  }

  onHoverIn (evt) {
    if (this.passThroughMorph) {
      $world.get('lively top bar').attachToTarget(this);
      // should not be neccessary, this is a bug in upstream lively
      $world.get('lively top bar').setEditMode($world.get('lively top bar').editMode);
    }
  }

  onHoverOut (evt) {
    if (this.passThroughMorph) {
      $world.get('lively top bar').attachToTarget($world);
      // should not be neccessary, this is a bug in upstream lively
      $world.get('lively top bar').setEditMode($world.get('lively top bar').editMode);
    }
  }

  onDrop (evt) {
    if (evt.type != 'morphicdrop' || !this.passThroughMorph) {
      return;
    }
    evt.hand.grabbedMorphs.forEach(grabbedMorph => {
      const { pointerAndShadow } = evt.hand._grabbedMorphProperties.get(grabbedMorph) || {};
      Object.assign(grabbedMorph, pointerAndShadow);
      this.newMorph = grabbedMorph;
    });
  }

  onMouseDown (evt) {
    this.getUnderlyingMorph(evt.hand.position).onMouseDown(evt);
  }

  onMouseUp (evt) {
    this.getUnderlyingMorph(evt.hand.position).onMouseUp(evt);
  }

  getUnderlyingMorph (position) {
    let targetedMorph = this.morphBeneath(position);
    while (targetedMorph.isSequence) {
      targetedMorph = targetedMorph.morphBeneath(position);
    }
    return targetedMorph;
  }
}

export class Layer {
  static exampleBackgroundLayer () {
    return new Layer({ name: 'Background' });
  }

  static exampleMiddleLayer () {
    return new Layer({ name: 'Middle', zIndex: 10 });
  }

  static exampleForegroundLayer () {
    return new Layer({ name: 'Foreground', zIndex: 20 });
  }

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

export class Sequence extends Morph {
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
          if (!this._lockEffect) this._originalOpacity = opacity;
        }
      },
      grayScale: {
        defaultValue: 0,
        set (grayscale) {
          this.setProperty('grayscale', grayscale);
          if (!this._lockEffect) this._originalGrayscale = grayscale;
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
      }
    };
  }

  static getSequenceOfMorph (morph) {
    return morph ? morph.ownerChain().find(m => m.isSequence) : undefined;
  }

  static backgroundNightExample () {
    const backgroundSequence = new Sequence({ name: 'night background', start: 0, duration: 250 });
    const backgroundMorph = new Morph({ fill: Color.rgbHex('272a7c'), extent: pt(533, 300), name: 'night background' });
    backgroundSequence.addMorph(backgroundMorph);
    return backgroundSequence;
  }

  static backgroundDayExample () {
    const backgroundSequence = new Sequence({ name: 'day background', start: 250, duration: 250 });
    const backgroundMorph = new Morph({ fill: Color.rgbHex('60b2e5'), extent: pt(533, 300), name: 'day background' });
    backgroundSequence.addMorph(backgroundMorph);

    const sunrise = new Keyframe(0, Color.rgbHex('#ff4d00'), { name: 'sunrise' });
    const daylight = new Keyframe(0.3, Color.rgbHex('60b2e5'), { name: 'daylight' });
    const colorAnimation = new ColorAnimation(backgroundMorph, 'fill');
    colorAnimation.addKeyframes([sunrise, daylight]);
    backgroundSequence.addAnimation(colorAnimation);
    return backgroundSequence;
  }

  static treeExample () {
    const treeSequence = new Sequence({ name: 'tree sequence', start: 0, duration: 500 });
    const stemMorph = new Morph({ fill: Color.rgbHex('734c30'), extent: pt(30, 60), name: 'stem' });
    const vertices = [pt(60, 0), pt(90, 50), pt(70, 50), pt(100, 100), pt(70, 100), pt(110, 150), pt(10, 150), pt(50, 100), pt(20, 100), pt(50, 50), pt(30, 50)];
    const crownMorph = new Polygon({ fill: Color.rgbHex('74a57f'), vertices: vertices, name: 'leafs' });

    treeSequence.addMorph(stemMorph);
    treeSequence.addMorph(crownMorph);
    stemMorph.position = pt(200, 220);
    crownMorph.position = pt(165, 110);
    return treeSequence;
  }

  static skyExample () {
    const skySequence = new Sequence({ name: 'sky sequence', start: 0, duration: 500 });

    const stars = new LottieMorph({ fill: Color.transparent, extent: pt(200, 200), position: pt(0, 0), name: 'lottie stars', animationDataUrl: 'https://assets4.lottiefiles.com/packages/lf20_Aerz0y.json' });
    skySequence.addMorph(stars);

    const starsOpacityAnimation = new NumberAnimation(stars, 'opacity');
    starsOpacityAnimation.addKeyframes([new Keyframe(0, 1, { name: 'fully visible' }), new Keyframe(0.1, 0, { name: 'faded out' })]);
    skySequence.addAnimation(starsOpacityAnimation);

    const starProgressAnimation = new NumberAnimation(stars, 'progress');
    starProgressAnimation.addKeyframes([new Keyframe(0, 0, { name: 'start of the animation' }), new Keyframe(0.1, 1, { name: 'animation done' })]);
    skySequence.addAnimation(starProgressAnimation);

    const sun = new Ellipse({ name: 'sun', extent: pt(70, 70), fill: Color.rgb(250, 250, 20), position: pt(0, 350) });
    skySequence.addMorph(sun);

    const sunPositionAnimation = new PointAnimation(sun, 'position', true);
    sunPositionAnimation.addKeyframes([new Keyframe(0, pt(0, 1.2), { name: 'start' }), new Keyframe(0.5, pt(0.1, 0.27), { name: 'middle', easing: 'inQuad' }), new Keyframe(1, pt(0.45, 0.05), { name: 'end', easing: 'outCubic' })]);
    skySequence.addAnimation(sunPositionAnimation);

    const sunScaleAnimation = new NumberAnimation(sun, 'scale');
    sunScaleAnimation.addKeyframes([new Keyframe(0, 0.6, { name: 'start' }), new Keyframe(0.6, 1, { name: 'end' })]);
    skySequence.addAnimation(sunScaleAnimation);

    const cloud = new Image({ name: 'cloud', extent: pt(100, 50), imageUrl: 'https://cdn.pixabay.com/photo/2017/06/20/04/42/cloud-2421760_960_720.png' });
    skySequence.addMorph(cloud);

    const cloudPositionAnimation = new PointAnimation(cloud, 'position', true);
    cloudPositionAnimation.addKeyframes([new Keyframe(0, pt(0.25, 0.17), { name: 'start' }), new Keyframe(1, pt(0.5, 0.17), { name: 'end' })]);
    skySequence.addAnimation(cloudPositionAnimation);

    const cloudOpacityAnimation = new NumberAnimation(cloud, 'opacity');
    cloudOpacityAnimation.addKeyframes([new Keyframe(0.1, 0, { name: 'start' }), new Keyframe(0.4, 1, { name: 'fully visible' })]);
    skySequence.addAnimation(cloudOpacityAnimation);

    return skySequence;
  }

  get end () {
    return this.start + this.duration;
  }

  get progress () {
    return this._progress;
  }

  isDisplayed () {
    return this._progress >= 0 && this._progress < 1 && !this.layer.hidden;
  }

  get isSequence () {
    return true;
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
    this.animations.forEach(animation => animation.progress = this._progress);
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
  addKeyframeForMorph (keyframe, morph, property, proptype = 'point') {
    const existingAnimation = this.getAnimationForMorphProperty(morph, property);

    if (existingAnimation) {
      existingAnimation.addKeyframe(keyframe);
      return existingAnimation;
    }
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
    return this.start + this.duration * keyframe.position;
  }

  getRelativePositionFor (scrollPosition) {
    return (scrollPosition - this.start) / this.duration;
  }

  onLoad () {
    // while savings the easings itself get lost and we need to recreate them
    this.animations.forEach(animation => animation.keyframes.forEach(keyframe => keyframe.setEasing(keyframe.easingName)));
  }
}
