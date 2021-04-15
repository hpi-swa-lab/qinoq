import { getColorForString } from './colors.js';
import { Color } from 'lively.graphics';
export const animatedProperties = {
  extent: {
    type: 'point',
    defaultRelative: true
  },
  position: {
    type: 'point',
    defaultRelative: true
  },
  fill: {
    type: 'color',
    color: Color.green
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