import { getColorForString, COLOR_SCHEME } from './colors.js';

export const animatedProperties = {
  extent: {
    type: 'point',
    defaultRelative: true
  },
  position: {
    type: 'point',
    flipCurve: true, // Flip curve in the animation curve in sequence layers
    defaultRelative: true
  },
  fill: {
    type: 'color',
    color: COLOR_SCHEME.BACKGROUND_VARIANT // light and neutral color so that the color curve is visible
  },
  blur: {
    type: 'number'
  },
  flipped: {
    type: 'number'
  },
  tilted: {
    type: 'number'
  },
  grayscale: {
    type: 'number'
  },
  opacity: {
    type: 'number'
  },
  rotation: {
    type: 'number'
  },
  scale: {
    type: 'number'
  },
  fontSize: {
    type: 'number'
  },
  lineHeight: {
    type: 'number'
  },
  progress: {
    type: 'number'
  }
};

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
