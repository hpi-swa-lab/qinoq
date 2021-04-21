import { Color } from 'lively.graphics';
import { string } from 'lively.lang';
export const COLOR_SCHEME = {
  PRIMARY: Color.rgb(0, 176, 255),
  PRIMARY_VARIANT: Color.rgb(0, 72, 255),
  PRIMARY_LIGHTER: Color.rgb(133, 193, 233),
  SECONDARY: Color.rgb(240, 100, 0),
  SECONDARY_VARIANT: Color.rgb(255, 160, 92),
  ON_SECONDARY: Color.white,
  BACKGROUND: Color.white,
  BACKGROUND_VARIANT: Color.rgb(200, 200, 200),
  ON_BACKGROUND: Color.black,
  ON_BACKGROUND_VARIANT: Color.rgb(220, 220, 220),
  PROMPT_BACKGROUND: Color.rgb(236, 240, 241),
  SURFACE: Color.white,
  SURFACE_VARIANT: Color.rgb(220, 220, 220),
  ON_SURFACE: Color.black,
  ERROR: Color.red,
  TRANSPARENT: Color.transparent,
  KEYFRAME_FILL: Color.rgb(134, 134, 134),
  KEYFRAME_BORDER: Color.rgb(69, 69, 69)
};

// use this function to get a color for a property name
export function getColorForString (input, saturation = 0.6, brightness = 0.70) {
  // calculation has been adjusted to generate nice colors for "opacity", "position", "scale" and "fill"
  const stringValue = (Math.abs(string.hashCode(input)) + input.length ** 3) % 360;
  return Color.hsb(stringValue, saturation, brightness);
}
