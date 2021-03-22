
Closes [fill in your issues here]

- [ ] I have added additional features that should now be part of the PR template. I made the necessary changes to the template.
- [ ] I have fixed a bug/the added functionality should not be part of the PR template.
- [ ] I have run all our tests and they still work

## Features that still work:
### Sequences in GlobalTimeline:

- [ ] the tree sequence is resizeable both left and right, this can be reversed
- [ ] the day sequence can't be dragged or resized onto the night sequence, instead it will snap to the night sequence and the snap indicator is shown
- [ ] the day sequence can be dragged to the middle layer, it will snap onto the tree sequence
- [ ] the night sequence can't be dragged or resized beyond the left timeline bounds
- [ ] double clicking on the sky sequence brings you to a new tab named 'sky sequence' containing the sequence view
- [ ] when clicking the "+" button a sequence is in the hand, which can only be dropped on a timelinelayer and changes color when you are not able to place the sequence
- [ ] right clicking on a sequence brings up a context menu
- [ ] clicking the buttons in the MenuBar sets the ScrollPosition to the beginning/end of the interactive/beginning of the next/previous sequence
- [ ] moving a sequence to the right will make the active area (light grey) larger
- [ ] When making the zoom factor higher/lower with the input field, the length of the sequences adapt accordingly, the cursor updates its position and the whole scrollytelling can still be scrolled through

### TimelineLayer:

- [ ] one can bring the background layer to the front via drag and drop and the tree is not visible afterwards
- [ ] the info labels change accordingly

### TimelineCursor:

- [ ] scrolls when scrolling in the interactive
- [ ] with open interactive, scroll position (and cursor position) may be changed with arrow keys
- [ ] the number in the menubar is consistent with the cursorposition

### Interactive:

- [ ] can be opened
- [ ] is scrollable

### Interactive and editor:

- [ ] can be loaded in the editor via drag and drop
- [ ] a new scrollytelling can be created with a button
- [ ] resizing the interactive resizes the interactive (by a fixed aspect ratio)
- [ ] after resizing to have a bigger interactive the sun is bigger and still moves to about half of the interactive width

### Sequence View:

- [ ] there are three OverviewLayers (one per Morph in the sky sequence)
- [ ] they hold four to six keyframes each
- [ ] right-clicking a keyframe shows a context menu
- [ ] clicking on the triangle expands those into two new layers with two keyframes each
- [ ] when expanding both morphs the cursor is still visible over all layers
- [ ] creating a new keyframe (with the inspector) will update the layers accordingly
- [ ] clicking on a layer will select the corresponding morph in the inspector
- [ ] clicking on the first tab brings you back to the global timeline
- [ ] after scrolling in the global timeline, the cursor position in the already opened 'sky sequence' has updated as well, when changing to this tab and vice versa
- [ ] clicking the buttons in the MenuBar sets the ScrollPosition to the beginning/end of the sequence and to the prev/next keyframe
- [ ] When making the zoom factor higher/lower with the input field, the length of the active area adapt accordingly as well as the position of the keyframes and the cursor updates its position

### Inspector:

- [ ] the tree leaves can be selected to inspect with the target selector
- [ ] in the sequence view, a morph that is not part of the currently open sequence cannot be selected with the target picker
- [ ] correct values for position, extent and opacity are shown
- [ ] when setting two keyframes for different position values at different scroll positions, an animation is created and can be viewed
- [ ] when scrolling in the scrollytelling, created keyframes are shown by a different icon in the inspector
- [ ] a keyframe can be overwritten in the inspector by navigating to the same scroll position (most easily done at scroll position 0) and adding a new keyframe

### Tabs
- [ ] the first tab can be renamed to 'aScrollytelling', this will also rename the interactive to 'aScrollytelling'
- [ ] the second tab can be renamed to 'sunrise', this will also rename the sequence in the global timeline to 'sunrise' and the respective timeline to 'sunrise timeline'
- [ ] the second tab can be closed with the 'X'
- [ ] opening two tabs and setting them to different zoom factors works as expected, even when changing between them and scrolling in both (the cursor is always at the correct position, both have independent zoom factors)
