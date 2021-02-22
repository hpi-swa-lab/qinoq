import { Morph, Ellipse, Polygon } from 'lively.morphic';
import { Color, pt } from 'lively.graphics';
import { connect } from 'lively.bindings';
import { newUUID } from 'lively.lang/string.js';
import { COLOR_SCHEME } from './colors.js';
import { PointAnimation, ColorAnimation, Keyframe } from './animations.js';

export class Interactive extends Morph {
  static example () {
    const interactive = new Interactive();
    interactive.initialize(pt(400, 300), 500);

    const foregroundLayer = Layer.exampleForegroundLayer();
    const middleLayer = Layer.exampleMiddleLayer();
    const backgroundLayer = Layer.exampleBackgroundLayer();
    const day = Sequence.backgroundDayExample();
    day.layer = backgroundLayer;
    const night = Sequence.backgroundNightExample();
    night.layer = backgroundLayer;
    const tree = Sequence.treeExample();
    tree.layer = middleLayer;
    const sun = Sequence.sunExample();
    sun.layer = foregroundLayer;

    interactive.addLayer(backgroundLayer);
    interactive.addLayer(middleLayer);
    interactive.addLayer(foregroundLayer);
    interactive.addSequence(day);
    interactive.addSequence(night);
    interactive.addSequence(tree);
    interactive.addSequence(sun);
    interactive.redraw();
    return interactive;
  }

  static get properties () {
    return {
      length: {
        type: 'Number',
        isFloat: false,
        min: 0
      },
      scrollPosition: {
        type: 'Number',
        isFloat: false,
        defaultValue: 0,
        set (scrollPosition) {
          this.setProperty('scrollPosition', scrollPosition);
          this.scrollOverlay.scroll.y = scrollPosition;
          this.redraw();
        }
      },
      sequences: {
        defaultValue: []
      },
      layers: {
        defaultValue: []
      }
    };
  }

  initialize (extent = pt(400, 300), length = 500) {
    this.length = length;
    this.extent = extent;
    this.initScrollOverlay();
    // VDOM seems to hold older nodes and mistakes them for the new ScrollHolder
    // this leads to unexpected jumps of the scrollPosition
    // therefore we reset it again here with respect to the rendering routine
    this.whenRendered().then(() => { this.scrollOverlay.scroll = pt(0, 0); });
  }

  initScrollOverlay () {
    this.scrollOverlay = new InteractiveScrollHolder();
    this.scrollOverlay.initialize(this);
    const scrollLengthContainer = new Morph({
      name: 'scrollable content',
      extent: pt(this.width, this.length >= this.height ? 2 * this.length : this.height + this.length),
      halosEnabled: false
    });
    this.scrollOverlay.addMorph(scrollLengthContainer);
    connect(this, 'position', this.scrollOverlay, 'position');
  }

  openInWorld () {
    super.openInWorld();
    this.scrollOverlay.openInWorld();
    this.scrollOverlay.position = this.position;
  }

  remove () {
    this.scrollOverlay.remove();
    super.remove();
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

  addLayer (layer) {
    this.layers.push(layer);
    layer.interactive = this;
  }

  addSequence (sequence) {
    connect(sequence, 'layer', this, 'sortSequences');
    this.sequences.push(sequence);
    if (!sequence.layer || !this.layers.includes(sequence.layer)) {
      sequence.layer = this.layers[0];
    }
  }

  showOnly (sequence) {
    this.sequences.forEach(seq => {
      if (sequence != seq) {
        seq.focused = false;
      }
    });
    this.redraw();
  }

  showAllSequences () {
    this.sequences.forEach(seq => {
      seq.focused = true;
    });
    this.redraw();
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
      halosEnabled: {
        defaultValue: false
      }
    };
  }

  initialize (interactive) {
    this.interactive = interactive;
  }

  onScroll (evt) {
    this.interactive.scrollPosition = this.scroll.y;
  }
}

export class Layer {
  static exampleBackgroundLayer () {
    const layer = new Layer();
    layer.name = 'Background';
    return layer;
  }

  static exampleMiddleLayer () {
    const layer = new Layer();
    layer.name = 'Middle';
    layer.zIndex = 10;
    return layer;
  }

  static exampleForegroundLayer () {
    const layer = new Layer();
    layer.name = 'Foreground';
    layer.zIndex = 20;
    return layer;
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

  constructor () {
    this.name = 'Unnamed Layer';
    this.hidden = false;
    this._zIndex = 0;
    this.id = newUUID();
  }

  equals (layer) {
    return this.id === layer.id;
  }
}

export class Sequence extends Morph {
  static get properties () {
    return {
      start: {},
      duration: {},
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
      originalOpacity: { defaultValue: 1 },
      opacity: {
        defaultValue: 1,
        set (opacity) {
          this.setProperty('opacity', opacity);
          if (!this._lockOpacity) this._originalOpacity = opacity;
        }
      },
      animations: {
        defaultValue: []
      }
    };
  }

  static backgroundNightExample () {
    const backgroundSequence = new Sequence({ name: 'night background' });
    backgroundSequence.initialize(0, 250);
    const backgroundMorph = new Morph({ fill: Color.rgbHex('272a7c'), extent: pt(400, 300), name: 'night background' });
    backgroundSequence.addMorph(backgroundMorph);
    return backgroundSequence;
  }

  static backgroundDayExample () {
    const backgroundSequence = new Sequence({ name: 'day background' });
    backgroundSequence.initialize(250, 250);
    const backgroundMorph = new Morph({ fill: Color.rgbHex('60b2e5'), extent: pt(400, 300), name: 'day background' });
    backgroundSequence.addMorph(backgroundMorph);

    const sunrise = new Keyframe(0, Color.rgbHex('#ff4d00'));
    const daylight = new Keyframe(0.3, Color.rgbHex('60b2e5'));
    const colorAnimation = new ColorAnimation(backgroundMorph, 'fill');
    colorAnimation.addKeyframes([sunrise, daylight]);
    backgroundSequence.addAnimation(colorAnimation);
    return backgroundSequence;
  }

  static treeExample () {
    const treeSequence = new Sequence({ name: 'tree sequence' });
    treeSequence.initialize(0, 500);
    const stemMorph = new Morph({ fill: Color.rgbHex('734c30'), extent: pt(30, 60), name: 'stem' });
    const vertices = [pt(60, 0), pt(90, 50), pt(70, 50), pt(100, 100), pt(70, 100), pt(110, 150), pt(10, 150), pt(50, 100), pt(20, 100), pt(50, 50), pt(30, 50)];
    const crownMorph = new Polygon({ fill: Color.rgbHex('74a57f'), vertices: vertices, name: 'leafs' });
    treeSequence.addMorph(stemMorph);
    treeSequence.addMorph(crownMorph);
    stemMorph.position = pt(200, 220);
    crownMorph.position = pt(165, 110);
    return treeSequence;
  }

  static sunExample () {
    const sunSequence = new Sequence({ name: 'sun sequence' });
    sunSequence.initialize(200, 300);
    const sun = new Ellipse({ name: 'sun', extent: pt(70, 70), fill: Color.rgb(250, 250, 20), position: pt(0, 350) });
    sunSequence.addMorph(sun);

    const sunAnimation = new PointAnimation(sun, 'position');
    sunAnimation.addKeyframes([new Keyframe(0, pt(0, 350)), new Keyframe(0.5, pt(40, 80)), new Keyframe(1, pt(180, 15))]);
    sunSequence.addAnimation(sunAnimation);
    return sunSequence;
  }

  get end () {
    return this.start + this.duration;
  }

  get progress () {
    return this._progress;
  }

  initialize (start, duration) {
    this.start = start;
    this.duration = duration;
  }

  isDisplayed () {
    return this._progress >= 0 && this._progress < 1 && !this.layer.hidden;
  }

  applyUnfocusedEffect () {
    // stop opacity setter from copying changes to originalOpacity
    this._lockOpacity = true;
    this.opacity = this.focused ? this._originalOpacity : 0.2; // TODO: define a better effect
    this._lockOpacity = true;
  }

  updateProgress (scrollPosition) {
    this._progress = (scrollPosition - this.start) / this.duration;
    this.animations.forEach(animation => animation.progress = this._progress);
  }

  addAnimation (animation) {
    this.animations.push(animation);
  }
}
