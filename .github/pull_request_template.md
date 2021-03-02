Closes [fill in your issues here]

## Features that still work:
### Sequences in GlobalTimeline:

- [ ] the tree sequence is resizeable both left and right
- [ ] the day sequence can't be dragged or resized onto the night sequence
- [ ] the night sequence can't be dragged or resized beyond the timeline bounds
- [ ] double clicking on the sky sequence brings you to the sequence view

### TimelineLayer:

- [ ] one can bring the background layer to the front via drag and drop and the tree is not visible afterwards
- [ ] the info labels change accordingly

### GlobalTimelineCursor:

- [ ] scrolls when scrolling in the interactive

### Interactive:

- [ ] can be opened
- [ ] is scrollable
- [ ] can be loaded in the editor via drag and drop

### Sequence View:

- [ ] there are two OverviewLayers (one per Morph in the sequence)
- [ ] they hold four Keyframes each
- [ ] right-clicking a keyframe shows a context menu
- [ ] clicking on the triangle expands those into two new layers with two keyframes each
- [ ] when expanding both morphs the cursor is still visible over all layers
- [ ] pressing ESC brings one back to the GlobalTimeline

### Editor:

- [ ] with open interactive, scroll position may be changed with arrow keys
	
### Inspector:

- [ ] the tree leafs can be selected to inspect
- [ ] correct values for position, extent and opacity are shown
- [ ] when setting two keyframes for different position values at different scroll positions, an animation is created and can be viewed
- [ ] when scrolling in the scrollytelling, created keyframes are shown by a different icon in the inspector
- [ ] a keyframe can be overwritten in the inspector by navigating to the same scroll position (most easily done at scroll position 0) and adding a new keyframe
