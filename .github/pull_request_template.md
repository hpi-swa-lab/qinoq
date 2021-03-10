Closes [fill in your issues here]

## Features that still work:
### Sequences in GlobalTimeline:

- [ ] the tree sequence is resizeable both left and right
- [ ] the day sequence can't be dragged or resized onto the night sequence, instead it will snap to the night sequence
- [ ] the day sequence can be dragged to the middle layer, it will snap onto the tree sequence
- [ ] the night sequence can't be dragged or resized beyond the timeline bounds
- [ ] double clicking on the sky sequence brings you to a new tab with the sequence view

### TimelineLayer:

- [ ] one can bring the background layer to the front via drag and drop and the tree is not visible afterwards
- [ ] the info labels change accordingly

### TimelineCursor:

- [ ] scrolls when scrolling in the interactive
- [ ] with open interactive, scroll position (and cursor position) may be changed with arrow keys

### Interactive:

- [ ] can be opened
- [ ] is scrollable
- [ ] can be loaded in the editor via drag and drop

### Sequence View:

- [ ] there are three OverviewLayers (one per Morph in the sky sequence)
- [ ] they hold four to six keyframes
- [ ] right-clicking a keyframe shows a context menu
- [ ] clicking on the triangle expands those into two new layers with two keyframes each
- [ ] when expanding both morphs the cursor is still visible over all layers
- [ ] creating a new keyframe (with the inspector) will update the layers accordingly
- [ ] pressing on the first tab brings you back to the global timeline

### Inspector:

- [ ] the tree leaves can be selected to inspect with the target selector
- [ ] correct values for position, extent and opacity are shown
- [ ] when setting two keyframes for different position values at different scroll positions, an animation is created and can be viewed
- [ ] when scrolling in the scrollytelling, created keyframes are shown by a different icon in the inspector
- [ ] a keyframe can be overwritten in the inspector by navigating to the same scroll position (most easily done at scroll position 0) and adding a new keyframe

### Tabs
- [ ] the first tab can be renamed to 'aScrollytelling', this will also rename the interactive
- [ ] the second tab can be renamed to 'sunrise', this will also rename the sequence in the global timeline
- [ ] the second tab can be closed with the 'X'