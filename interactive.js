import { Morph, Polygon } from 'lively.morphic';
import { Color, pt } from 'lively.graphics';

export class Interactive extends Morph {
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
        set (scrollPosition) {
          this.setProperty('scrollPosition', scrollPosition);
          this.sequences.forEach(sequence => {
            sequence.updateProgress(scrollPosition);
          });
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

  constructor (props = {}) {
    super(props);
  }
}

export class Layer {
  static get properties () {
    return {
      caption: {
        defaultValue: 'Unnamed Layer'
      },
      hidden: {
        defaultValue: false
      },
      zIndex: {
        type: Number,
        isFloat: false
      }
    };
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
      layer: { }
    };
  }

  static backgroundNightExample () {
    const backgroundSequence = new Sequence(0, 50, { name: 'night background' });
    const backgroundMorph = new Morph({ fill: Color.rgbHex('272a7c'), extent: pt(500, 500) });
    backgroundSequence.addMorph(backgroundMorph);
    return backgroundSequence;
  }

  static backgroundDayExample () {
    const backgroundSequence = new Sequence(50, 50, { name: 'day background' });
    const backgroundMorph = new Morph({ fill: Color.rgbHex('60b2e5'), extent: pt(500, 500) });
    backgroundSequence.addMorph(backgroundMorph);
    return backgroundSequence;
  }

  static treeExample () {
    const treeSequence = new Sequence(0, 100, { name: 'Tree Sequence' });
    const stemMorph = new Morph({ fill: Color.rgbHex('734c30'), extent: pt(30, 60) });
    const vertices = [pt(60, 0), pt(90, 50), pt(70, 50), pt(100, 100), pt(70, 100), pt(110, 150), pt(10, 150), pt(50, 100), pt(20, 100), pt(50, 50), pt(30, 50)];
    const crownMorph = new Polygon({ fill: Color.rgbHex('74a57f'), vertices: vertices });
    treeSequence.addMorph(stemMorph);
    treeSequence.addMorph(crownMorph);
    stemMorph.position = pt(200, 220);
    crownMorph.position = pt(165, 110);
    return treeSequence;
  }

  constructor (start, duration, props = {}) {
    super(props);
    const { extent = pt(0, 0), name = 'unnamed Sequence' } = props;
    this.name = name;
    this.extent = extent;
    this.reactsToPointer = false;
    this.fill = Color.rgba(0, 0, 0, 0);
    this.start = start;
    this.duration = duration;
  }

  updateProgress (scrollPosition) {
    this._progress = (scrollPosition - this.start) / this.duration;
  }
}
