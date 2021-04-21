
Closes [fill in your issues here]

- [ ] I have added additional features that should now be part of the PR template. I made the necessary changes to the template.
- [ ] I have fixed a bug/the added functionality should not be part of the PR template.
- [ ] I have run all our tests and they still work

## Features that still work

### Interactive

- [ ] can be opened in the world
- [ ] is scrollable
- [ ] mouseDown on the leaves makes them darker
- [ ] mouseUp on the leaves makes them ligher again (it is expected that the color is not green anymore)
- [ ] hovering over the clouds blurs them
- [ ] moving the mouse away from the clouds removes the blur  
- [ ] can be saved

### Interactive and editor

- [ ] a new scrollytelling can be created with a button
- [ ] can be loaded in the editor via drag and drop
- [ ] the interactive can be resized by a fixed aspect ratio
- [ ] after resizing to have a bigger interactive the sun is bigger and still moves to about half of the interactive width
- [ ] an interactive can be grabbed out of the editor and placed in the world with both the editor and interactive still working. The editor is cleared

### Sequences in GlobalTimeline

- [ ] the tree sequence is resizeable both left and right, this can be reversed
- [ ] when 3 sequences are selected and one tries to resize all get deselected except the one that gets resized
- [ ] the day sequence can't be dragged or resized onto the night sequence, instead it will snap to the night sequence and the snap indicator is shown
  - [ ] snapping may be disabled with the snap toggle button in the menu bar
  - [ ] toggling the button again enables snapping
- [ ] the day sequence can be dragged to the middle layer onto a free spot
- [ ] the night sequence can't be dragged or resized beyond the left timeline bounds
- [ ] using left click on a sequence selects it (blue border shown)
- [ ] the selected sequence can be moved by one scroll unit with the left/right arrows and by 10 scroll units when holding shift simultaneously
- [ ] when clicking the "+" button a sequence is in the hand, which can only be dropped on a timelinelayer and changes color when you are not able to place the sequence
  - [ ] this can be cancelled by pressing ESC
- [ ] right clicking on a sequence brings up a context menu
- [ ] clicking the buttons in the MenuBar sets the ScrollPosition to the beginning/end of the interactive/beginning of the next/previous sequence
- [ ] moving a sequence to the right will make the active area (light grey) larger
- [ ] When making the zoom factor higher/lower with the input field, the length of the sequences adapt accordingly, the cursor updates its position and the whole scrollytelling can still be scrolled through
- [ ] double clicking on the sky sequence brings you to a new tab named 'sky sequence' containing the sequence view

#### Selection of sequences

- [ ] an unselected (default) sequence can be selected by clicking on it
- [ ] when clicking another sequence, the first sequence is no longer selected, but the second one is
- [ ] when selecting a sequence with the `Alt` key pressed, the previous selection is not removed
- [ ] when clicking while pressing `Alt` on a selected sequence, the sequence is deselected
- [ ] all sequences can be selected with `Ctrl + A`
- [ ] when all sequences are selected, `Ctrl + A` deselects all sequences
- [ ] in the standard sequence setup, clicking on the night background and then clicking on the tree sequence while pressing `Shift` selects tree sequence, night background and day background
- [ ] selected Sequences can be deleted with `Del`
- [ ] when multiple sequences are selected the context menu renames all of them
- [ ] having multiple sequences selected dragging one drags all and they snap in all possible positions

### TimelineLayer

- [ ] one can bring the background layer to the front via drag and drop and the tree is not visible afterwards
- [ ] the info labels change accordingly
- [ ] the background layer can now be moved down via the context menu of the layer info
- [ ] a layer may be removed, its sequences will not be visible anymore and the layer is removed from the editor
- [ ] a layer can be hidden with a click on the eye icon. The sequences in that layer will no longer be shown in the interactive
- [ ] a new layer can be created, it will appear at the top
- [ ] the sky sequence can be dragged into the new layer
- [ ] the layer can be dragged under the background layer

### TimelineCursor

- [ ] scrolls when scrolling in the interactive
- [ ] with open interactive, scroll position (and cursor position) may be changed with arrow keys
- [ ] the number in the menubar is consistent with the cursorposition

### Sequence View

- [ ] there are three OverviewLayers (one per Morph in the sky sequence)
- [ ] they hold two to three keyframelines each
  - [ ] a keyframeline consists of small keyframes and a colored line for the respective property
- [ ] clicking on the triangle expands those into two new layers with two keyframes each
- [ ] right-clicking a keyframe shows a context menu
  - [ ] right-clicking on the last keyframe of the sun's position animation, an option to select easing is shown
  - [ ] when clicked, a list of easings appears
  - [ ] when outBack is selected as the easing, the sun moves a little back at the end of the animation
- [ ] when expanding both morphs the cursor is still visible over all layers
- [ ] creating a new keyframe (with the inspector) will update the layers accordingly
- [ ] clicking on a layer will select the corresponding morph in the inspector
- [ ] clicking on the first tab brings you back to the global timeline
- [ ] after scrolling in the global timeline, the cursor position in the already opened 'sky sequence' has updated as well, when changing to this tab and vice versa
- [ ] when clicking on a single keyframe this one is highlighted with a blue border
- [ ] clicking the buttons in the MenuBar sets the ScrollPosition to the beginning/end of the sequence and to the prev/next keyframe
- [ ] When making the zoom factor higher/lower with the input field, the length of the active area adapt accordingly as well as the position of the keyframes and the cursor updates its position
- [ ] it is possible to select more than one keyframe using `Alt`
- [ ] when more than two keyframes are selected, the context menu allows changing of relative positions, where entering a relative position changes the position of all selected keyframes - this works with all menu items and is undoable as expected (one undo for all selected keyframes)
- [ ] having more than one keyframe selected and dragging one with shift pressed moves all keyframes, this is undoable
- [ ] it is possible to add a new morph to the interactive using the top bar
  - [ ] the newly created morph is also added to the timeline as an own layer
- [ ] it is possible to add a new morph to the interactive by grab-and-drop
- [ ] it is possible to remove a morph using the layer info context menu
- [ ] it is possible to rename a morph
  - [ ] using the halo
  - [ ] using the context menu on the layer info (both these options affect labels and tooltips)
- [ ] when leaving the sequence view, the topbar does not draw on the interactive anymore but it is again possible to add morphs to the world

### Inspector

- [ ] the tree leaves can be selected to inspect with the target selector
- [ ] in the sequence view, a morph that is not part of the currently open sequence cannot be selected with the target picker
- [ ] when selecting a morph in the sequence via halo, that morph is shown in the inspector
- [ ] correct values for position, extent and opacity are shown
- [ ] when setting two keyframes for different position values at different scroll positions, an animation is created and can be viewed
- [ ] when scrolling in the scrollytelling, created keyframes are shown by a different icon in the inspector
- [ ] a keyframe can be overwritten in the inspector by navigating to the same scroll position (most easily done at scroll position 0) and adding a new keyframe

### Tabs

- [ ] the first tab can be renamed to 'aScrollytelling', this will also rename the interactive to 'aScrollytelling'
- [ ] the second tab can be renamed to 'sunrise', this will also rename the sequence in the global timeline to 'sunrise' and the respective timeline to 'sunrise timeline'
- [ ] the second tab can be closed with the 'X'
- [ ] opening two tabs and setting them to different zoom factors works as expected, even when changing between them and scrolling in both (the cursor is always at the correct position, both have independent zoom factors)

### Timeline

- [ ] when scrolling in the interactive, the cursor indicator in the scrollbar of the timeline moves accordingly
- [ ] when the zoom factor of a timeline is changed, the scroller in the scrollbar changes its width accordingly
- [ ] moving in the scrolled timeline with `Shift+Wheel` changes the scroller position
- [ ] in a scrollable timeline normal scrolling will always move the layers and their information and nothing else

### Search

- [ ] searching for a keyframe takes you to that keyframe
  - [ ] this works for keyframes in another tab
  - [ ] this works for keyframes in a sequence with no tab
  - [ ] this works for keyframes in another tab with zoom and expanded layers (so scrolling is necessary in both directions)
