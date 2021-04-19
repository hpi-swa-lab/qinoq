export function singleSelectKeyPressed (event) {
  return event.isAltDown();
}

export function rangeSelectKeyPressed (event) {
  return event.isShiftDown();
}

export function zoomKeyPressed (event) {
  return event.isCtrlDown();
}
