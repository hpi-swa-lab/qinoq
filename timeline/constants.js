import { pt } from 'lively.graphics';
export const CONSTANTS = {
  LAYER_INFO_WIDTH: 50,
  LAYER_HEIGHT: 50,
  SEQUENCE_HEIGHT: 40,
  DEFAULT_SEQUENCE_WIDTH: 100,
  SEQUENCE_INITIAL_X_OFFSET: 16,
  SEQUENCE_LAYER_Y_OFFSET: 5,
  MINIMAL_SEQUENCE_WIDTH: 20,
  CURSOR_WIDTH: 2,
  CURSOR_FONT_SIZE: 10,
  WARNING_WIDTH: 8,
  FULL_WARNING_OPACITY_AT_DRAG_DELTA: 50,
  IN_EDIT_MODE_SEQUENCE_WIDTH: 800,
  KEYFRAME_EXTENT: pt(23, 23),
  SNAPPING_THRESHOLD: 20,
  SNAP_INDICATOR_WIDTH: 8,
  INACTIVE_AREA_WIDTH: 30,
  VERTICAL_SCROLLBAR_HEIGHT: 15,
  SCROLLBAR_MARGIN: 2,
  MOUSE_WHEEL_FACTOR_FOR_ZOOM: 0.001
};
CONSTANTS.SNAP_INDICATOR_SPACING = (CONSTANTS.LAYER_HEIGHT - CONSTANTS.SEQUENCE_HEIGHT) / 2;
