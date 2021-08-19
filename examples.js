import { Sequence, Interactive, Layer } from './interactive.js';
import { PointAnimation, PointPathAnimation, NumberAnimation, ColorAnimation, Keyframe } from './animations.js';
import { Morph, Image, Ellipse, Polygon } from 'lively.morphic';
import { Color, pt } from 'lively.graphics';
import { LottieMorph } from './interactive-morphs/lottie-morph.js';

export async function exampleInteractive () {
  const interactive = new Interactive();

  const foregroundLayer = exampleForegroundLayer();
  const middleLayer = exampleMiddleLayer();
  const backgroundLayer = exampleBackgroundLayer();

  const day = backgroundDayExample();
  day.layer = backgroundLayer;
  const night = backgroundNightExample();
  night.layer = backgroundLayer;
  const tree = treeExample();
  tree.layer = middleLayer;
  const sky = skyExample();
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

// Example Layers
export function exampleBackgroundLayer () {
  return new Layer({ name: 'Background' });
}

export function exampleMiddleLayer () {
  return new Layer({ name: 'Middle', zIndex: 10 });
}

export function exampleForegroundLayer () {
  return new Layer({ name: 'Foreground', zIndex: 20 });
}

// Example Sequences
export function backgroundNightExample () {
  const backgroundSequence = new Sequence({ name: 'night background', start: 0, duration: 250 });
  const backgroundMorph = new Morph({ fill: Color.rgbHex('272a7c'), extent: pt(533, 300), name: 'night background' });
  backgroundSequence.addMorph(backgroundMorph);
  return backgroundSequence;
}

export function backgroundDayExample () {
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

export function treeExample () {
  const treeSequence = new Sequence({ name: 'tree sequence', start: 0, duration: 500 });
  const stemMorph = new Morph({ fill: Color.rgbHex('734c30'), extent: pt(30, 60), name: 'stem' });
  const vertices = [pt(60, 0), pt(90, 50), pt(70, 50), pt(100, 100), pt(70, 100), pt(110, 150), pt(10, 150), pt(50, 100), pt(20, 100), pt(50, 50), pt(30, 50)];
  const crownMorph = new CrownMorph({ fill: Color.rgbHex('74a57f'), vertices: vertices, name: 'leafs', nativeCursor: 'pointer', tooltip: 'Click me!' });

  treeSequence.addMorph(stemMorph);
  treeSequence.addMorph(crownMorph);
  stemMorph.position = pt(200, 220);
  crownMorph.position = pt(165, 110);
  return treeSequence;
}

export function skyExample () {
  const skySequence = new Sequence({ name: 'sky sequence', start: 0, duration: 500 });

  const stars = new LottieMorph({ fill: Color.transparent, extent: pt(200, 200), position: pt(0, 0), name: 'lottie stars', animationDataUrl: 'https://assets4.lottiefiles.com/packages/lf20_Aerz0y.json' });
  skySequence.addMorph(stars);

  const starsOpacityAnimation = new NumberAnimation(stars, 'opacity');
  starsOpacityAnimation.addKeyframes([new Keyframe(0, 1, { name: 'fully visible' }), new Keyframe(0.2, 0, { name: 'faded out' })]);
  skySequence.addAnimation(starsOpacityAnimation);

  const starProgressAnimation = new NumberAnimation(stars, 'progress');
  starProgressAnimation.addKeyframes([new Keyframe(0, 0.4, { name: 'start of the animation' }), new Keyframe(0.2, 0.75, { name: 'animation done' })]);
  skySequence.addAnimation(starProgressAnimation);

  const sun = new Ellipse({ name: 'sun', extent: pt(70, 70), fill: Color.rgb(250, 250, 20), position: pt(0, 350) });
  skySequence.addMorph(sun);

  const sunPositionAnimation = new PointPathAnimation.example(sun, 'position');
  // sunPositionAnimation.addKeyframes([new Keyframe(0, pt(0, 1.2), { name: 'start' }), new Keyframe(0.5, pt(0.1, 0.27), { name: 'middle', easing: 'inQuad' }), new Keyframe(1, pt(0.45, 0.05), { name: 'end', easing: 'outCubic' })]);
  skySequence.addAnimation(sunPositionAnimation);

  const sunScaleAnimation = new NumberAnimation(sun, 'scale');
  sunScaleAnimation.addKeyframes([new Keyframe(0, 0.6, { name: 'start' }), new Keyframe(0.6, 1, { name: 'end' })]);
  skySequence.addAnimation(sunScaleAnimation);

  const cloud = new CloudMorph({ name: 'cloud', extent: pt(100, 50), imageUrl: 'https://cdn.pixabay.com/photo/2017/06/20/04/42/cloud-2421760_960_720.png' });
  skySequence.addMorph(cloud);

  const cloudPositionAnimation = new PointAnimation(cloud, 'position', true);
  cloudPositionAnimation.addKeyframes([new Keyframe(0, pt(0.25, 0.17), { name: 'start' }), new Keyframe(1, pt(0.5, 0.17), { name: 'end' })]);
  skySequence.addAnimation(cloudPositionAnimation);

  const cloudOpacityAnimation = new NumberAnimation(cloud, 'opacity');
  cloudOpacityAnimation.addKeyframes([new Keyframe(0.1, 0, { name: 'start' }), new Keyframe(0.4, 1, { name: 'fully visible' })]);
  skySequence.addAnimation(cloudOpacityAnimation);

  return skySequence;
}

class CloudMorph extends Image {
  onHoverIn () {
    this.blur = 3;
  }

  onHoverOut () {
    this.blur = 0;
  }
}

class CrownMorph extends Polygon {
  constructor (props) {
    // freezing breaks this class and will while deserialization not give any props which the class polygon can't take
    // it will while deserialization set the vertices to the property values so those are
    if (typeof props === 'undefined') {
      props = { vertices: [pt(0, 0), pt(0, 0), pt(0, 0)] };
    }
    super(props);
  }

  onMouseDown () {
    this.fill = this.fill.darker();
  }

  onMouseUp () {
    this.fill = this.fill.lighter();
  }
}
