import { getColorForString } from './colors.js';
import { Color } from 'lively.graphics';

export const animatedProperties = {
  extent: {
    type: 'point',
    defaultRelative: true,
    color: Color.rgbHex('2B7A6D')
  },
  position: {
    type: 'point',
    flipCurve: true, // Flip curve in the animation curve in sequence layers
    defaultRelative: true,
    color: Color.rgbHex('4792B3')
  },
  fill: {
    type: 'color',
    color: Color.rgbHex('90CCD1')
  },
  blur: {
    type: 'number',
    color: Color.rgbHex('B34794')
  },
  flipped: {
    type: 'number',
    color: Color.rgbHex('B38247')
  },
  tilted: {
    type: 'number',
    color: Color.rgbHex('B35447')
  },
  grayscale: {
    type: 'number',
    color: Color.rgbHex('7647B3')
  },
  opacity: {
    type: 'number',
    color: Color.rgbHex('6FB347')
  },
  rotation: {
    type: 'number',
    color: Color.rgbHex('A6B347')
  },
  scale: {
    type: 'number',
    color: Color.rgbHex('E28743')
  },
  textString: {
    type: 'string',
    color: Color.rgbHex('D6C938')
  },
  fontSize: {
    type: 'number',
    color: Color.rgbHex('E9AFA3')
  },
  fontColor: {
    type: 'color',
    color: Color.rgbHex('F7D183')
  },
  progress: {
    type: 'number',
    color: Color.rgbHex('47B391')
  }

};

export const notAnimatableOnTextMorph = ['textString', 'fontSize'];
export const notAnimatableOnLabelMorphWithIcon = ['textString'];

// Get a direct mapping property -> type
export function animatedPropertiesAndTypes () {
  const propertiesAndTypes = {};
  Object.keys(animatedProperties).forEach(key => {
    propertiesAndTypes[key] = animatedProperties[key].type;
  });
  return propertiesAndTypes;
}

export function getColorForProperty (property) {
  if (animatedProperties[property] && animatedProperties[property].color) return animatedProperties[property].color;

  return getColorForString(property);
}
