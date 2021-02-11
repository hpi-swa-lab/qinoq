import { Morph, Polygon } from 'lively.morphic';
import { Color, pt } from 'lively.graphics';
import { connect } from 'lively.bindings';
import { newUUID } from 'lively.lang/string.js';
import { COLOR_SCHEME } from './colors.js';

export class Interactive extends Morph {
  static example () {
    const interactive = new Interactive({ extent: pt(400, 300) });
    interactive.initialize(500);

    const foregroundLayer = Layer.exampleForegroundLayer();
    const backgroundLayer = Layer.exampleBackgroundLayer();
    const day = Sequence.backgroundDayExample();
    day.layer = backgroundLayer;
    const night = Sequence.backgroundNightExample();
    night.layer = backgroundLayer;
    const tree = Sequence.treeExample();
    tree.layer = foregroundLayer;

    interactive.addLayer(backgroundLayer);
    interactive.addLayer(foregroundLayer);
    interactive.addSequence(day);
    interactive.addSequence(night);
    interactive.addSequence(tree);
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

  initialize (length = 500) {
    this.length = length;
    this.initScrollOverlay();
  }

  initScrollOverlay () {
    this.scrollOverlay = new InteractiveScrollHolder();
    this.scrollOverlay.initialize(this);
    const scrollLengthContainer = new Morph({
      name: 'scrollable content',
      extent: pt(this.width, this.length >= this.heigth ? 2 * this.length : this.height + this.length),
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

  static exampleForegroundLayer () {
    const layer = new Layer();
    layer.name = 'Foreground';
    layer.zIndex = 10;
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
        min: 0,
        max: 1,
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
      }
    };
  }

  static backgroundNightExample () {
    const backgroundSequence = new Sequence();
    backgroundSequence.initialize(0, 250, 'night background');
    const backgroundMorph = new Morph({ fill: Color.rgbHex('272a7c'), extent: pt(400, 300) });
    backgroundSequence.addMorph(backgroundMorph);
    return backgroundSequence;
  }

  static backgroundDayExample () {
    const backgroundSequence = new Sequence();
    backgroundSequence.initialize(250, 250, 'day background');
    const backgroundMorph = new Morph({ fill: Color.rgbHex('60b2e5'), extent: pt(400, 300) });
    backgroundSequence.addMorph(backgroundMorph);
    return backgroundSequence;
  }

  static treeExample () {
    const treeSequence = new Sequence();
    treeSequence.initialize(0, 500, 'tree sequence');
    const stemMorph = new Morph({ fill: Color.rgbHex('734c30'), extent: pt(30, 60) });
    const vertices = [pt(60, 0), pt(90, 50), pt(70, 50), pt(100, 100), pt(70, 100), pt(110, 150), pt(10, 150), pt(50, 100), pt(20, 100), pt(50, 50), pt(30, 50)];
    const crownMorph = new Polygon({ fill: Color.rgbHex('74a57f'), vertices: vertices });
    treeSequence.addMorph(stemMorph);
    treeSequence.addMorph(crownMorph);
    stemMorph.position = pt(200, 220);
    crownMorph.position = pt(165, 110);
    return treeSequence;
  }

  initialize (start, duration, name) {
    this.start = start;
    this.duration = duration;
    this.name = name;
  }

  isDisplayed () {
    return this._progress >= 0 && this._progress < 1 && !this.layer.hidden;
  }

  updateProgress (scrollPosition) {
    this._progress = (scrollPosition - this.start) / this.duration;
  }
}
