
Closes [fill in your issues here]

- [ ] I have added additional features that should now be part of the PR template. I made the necessary changes to the template.
- [ ] I have fixed a bug/the added functionality should not be part of the PR template.
  - [ ] I added a test/ tests.
- [ ] I have run all our tests and they still work.

## Todos before merging

- [ ] ...

## Features that still work

- [ ] all described features work
- [ ] all described features work after saving of the editor with an interactive

### Interactive

- [ ] can be opened in the world
- [ ] is scrollable
- [ ] mouseDown on the leaves makes them darker (when in hand mode), the cursor changes to a pointer
- [ ] mouseUp on the leaves makes them lighter again
- [ ] hovering over the leaves shows a tooltip after a while, which goes away when moving away
- [ ] hovering over the clouds blurs them
- [ ] moving the mouse away from the clouds removes the blur  
- [ ] the interactive can be resized by a fixed aspect ratio
- [ ] after resizing to have a bigger interactive the sun is bigger and still moves to about half of the interactive width
- [ ] can be saved
- [ ] can be bundled

### Interactive and editor

- [ ] a new scrollytelling can be created with a button
- [ ] can be loaded in the editor via drag and drop
- [ ] an interactive can be grabbed out of the editor and placed in the world with both the editor and interactive still working. The editor is cleared

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
- [ ] the number in the menubar is consistent with the cursor position
- [ ] there is a scale beneath the cursor head
  - [ ] the length is consistent with the active area
  - [ ] the scale will adapt to the current zoom
- [ ] the cursor head will always be visible
- [ ] the cursor is only visible when the scroll position is in the displayed scroll interval

### Sequences

#### Selection of Sequences

- [ ] an unselected (default) sequence can be selected by clicking on it
- [ ] the selected sequence can be moved by one scroll unit with the left/right arrows and by 10 scroll units when holding shift simultaneously
- [ ] when clicking another sequence, the first sequence is no longer selected, but the second one is
- [ ] when selecting a sequence with the `Alt` key pressed, the previous selection is not removed
- [ ] when clicking while pressing `Alt` on a selected sequence, the sequence is deselected
- [ ] all sequences can be selected with `Ctrl + A`
- [ ] when all sequences are selected, `Ctrl + A` deselects all sequences
- [ ] in the standard sequence setup, clicking on the night background and then clicking on the tree sequence while pressing `Shift` selects tree sequence, night background and day background
- [ ] selected Sequences can be deleted with `Del`
- [ ] when multiple sequences are selected the context menu renames all of them
- [ ] having multiple sequences selected dragging one drags all and they snap in all possible positions

#### Sequences in GlobalTimeline

- [ ] the tree sequence is resizable both left and right, this can be reversed
- [ ] when 3 sequences are selected and one tries to resize all get deselected except the one that gets resized
- [ ] the day background sequence can't be dragged or resized onto the night sequence, instead it will snap to the night sequence and the snap indicator is shown
  - [ ] snapping may be disabled with the snap toggle button in the menu bar
  - [ ] toggling the button again enables snapping
- [ ] the day background sequence can be dragged to the middle layer onto a free spot
- [ ] the night sequence can't be dragged or resized beyond the left timeline bounds
- [ ] when clicking the "Add Sequence" button a sequence is in the hand, which can only be dropped on a timelineLayer and changes color when you are not able to place the sequence
  - [ ] this can be cancelled by pressing ESC
- [ ] right clicking on a sequence brings up a context menu
- [ ] clicking the buttons in the MenuBar sets the ScrollPosition to the beginning/end of the interactive/beginning/end of the next/previous sequence
- [ ] moving a sequence to the right will make the active area (light grey) larger
- [ ] when changing the zoom factor with the input field, the length of the sequences adapt accordingly, the cursor updates its position and the whole scrollytelling can still be scrolled through
- [ ] a sequence may be copied, and pasted at another spot in the timeline
  - [ ] pasting fails if there would not be enough space
  - [ ] otherwise pasting succeeds, the new sequence has copies of the old sequences morphs and animations, while the old sequence is untouched
- [ ] double clicking on the sky sequence brings you to a new tab named 'sky sequence' containing the sequence view

#### Sequence View

- [ ] there are two OverviewLayers (one per Morph in the sky sequence)
- [ ] they hold two to three keyframelines each
  - [ ] when changing the zoom, the keyframelines update accordingly
- [ ] clicking on the triangle expands those into two new layers with keyframes
- [ ] right-clicking a keyframe shows a context menu
  - [ ] right-clicking on the last keyframe of the sun's position animation, an option to select easing is shown
  - [ ] when clicked, a list of easings appears
  - [ ] when outBack is selected as the easing, the sun moves a little back at the end of the animation
- [ ] when expanding all two morphs the cursor is still visible over all layers
- [ ] creating a new keyframe (with the inspector) will update the layers accordingly
- [ ] clicking on a layer will select the corresponding morph in the inspector
- [ ] clicking on the first tab brings you back to the global timeline
- [ ] after scrolling in the sequence timeline, the cursor position in the global timeline has updated as well, when changing to this tab
- [ ] when changing to a sequence timelines tab, the scrollposition is always set to the beginning of this sequence
- [ ] when clicking on a single keyframe this one is highlighted with a blue border
- [ ] clicking the buttons in the MenuBar sets the ScrollPosition to the beginning/end of the sequence and to the prev/next keyframe
- [ ] when changing the zoom factor with the input field, the length of the active area adapt accordingly as well as the position of the keyframes and the cursor updates its position
- [ ] hovering over a property layer that animates position (e.g. position on sun), a graph in the interactive holder is shown that displays the positions of the keyframes and lines between them
- [ ] it is possible to select more than one keyframe using `Alt`
- [ ] when more than two keyframes are selected, the context menu allows changing of relative positions, where entering a relative position changes the position of all selected keyframes - this works with all menu items and is undoable as expected (one undo for all selected keyframes)
- [ ] having more than one keyframe selected and dragging one moves all keyframes, this is undoable
  - [ ] keyframes will snap to other keyframes, this can be disabled with the snap toggle in the menu bar
- [ ] it is possible to add a new morph to the interactive using the top bar
  - [ ] it is possible to add a lottie morph with the top bar
    - [ ] newly added lottie morphs already have an animation on the property "progress"
    - [ ] newly created lottie morphs visually show an animation
  - [ ] the newly created morph is also added to the timeline as an own layer
- [ ] it is possible to add a new morph to the interactive by grab-and-drop
  - [ ] when a morph is grabbed onto the interactive while the global timeline is active, an error message appears and the morph returns to its original position
- [ ] it is still possible to draw morphs in the world
- [ ] it is possible to remove a morph using the layer info context menu
- [ ] it is possible to remove a morph from the interactive by grabbing it
- [ ] it is possible to rename a morph
  - [ ] using the halo
  - [ ] using the context menu on the layer info (both these options affect labels and tooltips)
- [ ] context menu of OverviewLayers holds a Cut Morph Option and a Copy Morph Option
  - [ ] clicking cut morph will remove the layer and the morph immediately
  - [ ] in another sequenceview as well as on a layer-info, paste morph can be clicked in a context menu
  - [ ] the morph, its layers and keyframes appear
    - [ ] the interactive can still be scrolled and a keyframe in the pasted morph can be moved
    - [ ] the same morph can be pasted multiple times
- [ ] Through the layer info context menu, morphs may be rearranged so that the sun is in front of the cloud
    - [ ] Layers (Overview and Propertylayers) change accordingly

### Inspector

- [ ] there is one tab for animations and one for styling
  - [ ] with no morph selected, the styling buttons are disabled
- [ ] when selecting a morph in the sequence via halo, that morph is shown in the inspector
  - [ ] the styling buttons in the styling tab work as expected
- [ ] when setting two keyframes for different position values at different scroll positions, an animation is created and can be viewed
- [ ] when scrolling in the scrollytelling, created keyframes are shown by a different icon in the inspector
- [ ] a keyframe can be overwritten in the inspector by navigating to the same scroll position (most easily done at scroll position 0) and adding a new keyframe

### Interactive graph

- [ ] there is an interactive graph in the upper left corner
- [ ] clicking on any item takes you to it
  - [ ] clicking on a sequence takes you to the sequence tab
  - [ ] clicking on a keyframe takes you to that keyframe
  - [ ] clicking on a morph selects that morph with the inspector and takes you to the sequence tab
- [ ] typing in "sun" into the search field, sunrise (a keyframe) and sun (an Ellipse) are highlighted and visible (the hierarchy is exposed to show them)
  - [ ] when deleting the search term, the collapse state is restored to what it was when last there was no search term
- [ ] the search field is disabled when no interactive is loaded

### Tabs

- [ ] the first tab can be renamed to 'aScrollytelling', this will also rename the interactive to 'aScrollytelling'
- [ ] the second tab can be renamed to 'sunrise', this will also rename the sequence in the global timeline to 'sunrise' and the respective timeline to 'sunrise timeline'
- [ ] the second tab can be closed with the 'X'
- [ ] timelines in different tabs can have different zoom factors that are reapplied when changing the tab

### Timeline

- [ ] when scrolling in the interactive, the cursor indicator in the scrollbar of the timeline moves accordingly
- [ ] when the zoom factor of a timeline is changed, the scroller in the scrollbar changes its width accordingly
- [ ] moving in the scrolled timeline with `Alt+Wheel` changes the scroller position
- [ ] in a scrollable timeline normal scrolling will always move the layers and their information and nothing else

### Search

- [ ] searching for a keyframe takes you to that keyframe
  - [ ] this works for keyframes in another tab
  - [ ] this works for keyframes in a sequence with no tab
  - [ ] this works for keyframes in another tab with zoom and expanded layers (so scrolling is necessary in both directions)

