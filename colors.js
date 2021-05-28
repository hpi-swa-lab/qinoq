import { Color } from 'lively.graphics';
import { string } from 'lively.lang';
export const COLOR_SCHEME = {
  PRIMARY: Color.rgb(0, 110, 230),
  PRIMARY_VARIANT: Color.rgb(0, 93, 194),
  SECONDARY: Color.rgb(255, 120, 0),
  ON_SECONDARY: Color.white,
  BACKGROUND: Color.white,
  BACKGROUND_VARIANT: Color.rgb(230, 230, 230),
  ON_BACKGROUND: Color.rgb(100, 100, 100),
  ON_BACKGROUND_VARIANT: Color.rgb(200, 200, 200),
  //
  PROMPT_BACKGROUND: Color.rgb(236, 240, 241),
  SURFACE: Color.white,
  SURFACE_VARIANT: Color.rgb(245, 245, 245),
  SURFACE_DARKER_VARIANT: Color.rgb(230, 230, 230),
  ON_SURFACE: Color.white,
  ON_SURFACE_VARIANT: Color.rgb(100, 100, 100),
  ERROR: Color.rgb(255, 0, 14),
  TRANSPARENT: Color.transparent,
  //
  KEYFRAME_FILL: Color.rgb(134, 134, 134),
  KEYFRAME_BORDER: Color.rgb(69, 69, 69),
  BUTTON_BLUE: Color.rgb(0, 110, 230)
};

// use this function to get a color for a property name
export function getColorForString (input, saturation = 0.6, brightness = 0.70) {
  // calculation has been adjusted to generate nice colors for "opacity", "position", "scale" and "fill"
  const stringValue = (Math.abs(string.hashCode(input)) + input.length ** 3) % 360;
  return Color.hsb(stringValue, saturation, brightness);
}
