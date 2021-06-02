import { pt } from 'lively.graphics';

export const TIMELINE_CONSTANTS = {
  LAYER_INFO_WIDTH: 50,
  GLOBAL_LAYER_HEIGHT: 50,
  SEQUENCE_LAYER_HEIGHT: 40,
  DEFAULT_SEQUENCE_WIDTH: 100,
  SEQUENCE_INITIAL_X_OFFSET: 16,
  SEQUENCE_Y_OFFSET: 5,
  MINIMAL_SEQUENCE_WIDTH: 20,
  CURSOR_WIDTH: 2,
  CURSOR_FONT_SIZE: 10,
  WARNING_WIDTH: 8,
  FULL_WARNING_OPACITY_AT_DRAG_DELTA: 50,
  IN_EDIT_MODE_SEQUENCE_WIDTH: 800,
  KEYFRAME_EXTENT: pt(15, 15),
  SNAPPING_THRESHOLD: 20,
  SNAP_INDICATOR_WIDTH: 8,
  INACTIVE_AREA_WIDTH: 30,
  VERTICAL_SCROLLBAR_HEIGHT: 15,
  SCROLLBAR_MARGIN: 2,
  MOUSE_WHEEL_FACTOR_FOR_ZOOM: 0.001,
  KEYFRAME_LINE_HEIGHT: 4,
  KEYFRAME_LINE_KEYFRAME_SCALE: 0.35,
  RULER_HEIGHT: 19,
  ACTIVE_AREA_OFFSET: 2
};
TIMELINE_CONSTANTS.SEQUENCE_HEIGHT = TIMELINE_CONSTANTS.GLOBAL_LAYER_HEIGHT - (2 * TIMELINE_CONSTANTS.SEQUENCE_Y_OFFSET),
TIMELINE_CONSTANTS.SNAP_INDICATOR_SPACING = (TIMELINE_CONSTANTS.GLOBAL_LAYER_HEIGHT - TIMELINE_CONSTANTS.SEQUENCE_HEIGHT) / 2;
TIMELINE_CONSTANTS.KEYFRAME_HEIGHT = Math.sqrt(TIMELINE_CONSTANTS.KEYFRAME_EXTENT.x ** 2 + TIMELINE_CONSTANTS.KEYFRAME_EXTENT.y ** 2);
TIMELINE_CONSTANTS.KEYFRAME_Y_OFFSET = TIMELINE_CONSTANTS.SEQUENCE_LAYER_HEIGHT / 2 - (Math.sqrt(2) * TIMELINE_CONSTANTS.KEYFRAME_EXTENT.x / 2);
TIMELINE_CONSTANTS.KEYFRAME_SNAP_INDICATOR_SPACING = (TIMELINE_CONSTANTS.SEQUENCE_LAYER_HEIGHT - TIMELINE_CONSTANTS.KEYFRAME_HEIGHT) / 2;
