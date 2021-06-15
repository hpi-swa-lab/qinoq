# qinoq

qinoq allows you to create and edit scrollytellings. It includes classes for an Interactives Editor and for the Interactive itself.

The Interactives Editor allows editing of Interactives. Currently it is designed to edit Scrollytellings.

## lively.next

qinoq is used within lively.next. You can find an installation guide [here](https://github.com/LivelyKernel/lively.next#Installation-and-Setup).
Once lively is installed, clone this repository within the lively.next repository.
You also need to adjust the file `lively.installer/packages-config.json` in your lively.next installation to include the following lines:

```json
{
    "name": "qinoq",
    "repoURL": "https://github.com/hpi-swa-lab/qinoq"
},
```

## Editor Usage

Before the first usage of the editor within a world, you need to add the qinoq package to the world.
For the following examples to work, you need to import the respective classes from the qinoq package. Do so by opening a browser via `Ctrl+b`, clicking the `+` button at the top, selecting `Load Existing Package` and exchange `lively.morphic` with `qinoq`. Click `OK`.

Use the `javascript workspace` to execute the following commands. You can open one via `Ctrl+k`.

### Getting started with an Interactive

```js
/* import necessary modules into workspace */
import { InteractivesEditor, Interactive } from "qinoq";

/* open an Interactives Editor in a window within the world */
const editor = await new InteractivesEditor().initialize();

/* create an interactive */
const interactive = Interactive.example();  // creates an example interactive
                                            // Use "new Interactive()" to create an empty Interactive
interactive.openInWorld();  // optional: opens interactive as morph in the world

/* load interactive into editor */
editor.interactive = interactive;  // alternatively, you can grab-and-drop
                                   // the opened interactive into the Interactive Holder of the editor
                                   // (via the "grab"-halo)
```

## Interactive API

### Structure of an Interactive

An Interactive has three building blocks: the Interactive itself, Layers and Sequences.

The Interactive holds Layers and Sequences, manages their visibility and controls their progress.
A Sequence is a semantic collection of morphs that live as submorphs within the sequence. It has a start position and a duration, which mark the time during which a sequence is visible within the Interactive. The sequence also offers a progress, ranging from 0 to 1 for the time of display, which could be used to animate the content of a Sequence in the future.
Sequences reference a Layer. All Sequences that should be displayed with the same z-index should reference the same layer.

The `Interactive`, `Layer` and `Sequence` classes hold static example methods that together build an example for an Interactive.

### Creating an Interactive

```js
const interactive = new Interactive({extent: pt(533, 300)});
```

### Adding Layers to an Interactive

```js
const layer = new Layer();
layer.name = 'example layer';
interactive.addLayer(layer);
```

### Adding a Sequence to an Interactive

This code adds a Sequence to the Interactive that displays a rectangular Morph, beginning at position 0 for a duration of 250.

```js
const exampleSequence = new Sequence({name: 'example sequence', start: 0, duration: 500});
const exampleMorph = new Morph({ fill: Color.rgbHex('272a7c'), extent: pt(400, 300) });
exampleSequence.addMorph(exampleMorph);
exampleSequence.layer = layer; // we have to put the sequence on a layer in the interactive
interactive.addSequence(exampleSequence);
```

### Animations

Animations are stored in sequences. Every animation affects one property in one morph (in that sequence).
Animations are based on Keyframes that store specific property values at specific relative positions.
This code adds an animation to the morph "bird" in the "skySequence", which is composed of 3 Keyframes. The animation makes the bird move over the screen by changing the position property.

```js
const birdAnimation = new PointAnimation(bird, 'position');
birdAnimation.addKeyframes([new Keyframe(0, pt(0, 200), 'start'), new Keyframe(0.5, pt(200, 300)), new Keyframe(1, pt(400, 0), 'end')]); // Keyframes are created; Naming the keyframe is optional

skySequence.addAnimation(birdAnimation);
```

### Morphs in the interactive

Morphs can simply be added by calling `addMorph` on a sequence. The following methods are called on morphs in an interactive, if they are defined:

- `onInteractiveScrollChange(scrollPosition)` when the scrollPosition in the interactive is changed
- `onSequenceEnter` is always called when the sequence is now drawn and was previously not drawn. Note that this may also happen when the user scrolls backwards
- `onSequenceLeave` is called whenever the sequence was previously drawn but is no longer drawn

## Bundling

Interactives can be bundled as any other morph in `lively.next`. However, there is one catch that one needs to be aware of:
If an Interctive was resized, **one needs to scroll through the whole interactive once before bundling**.
Otherwise, not all sequences are updated with the correct extent and the bundled interactive will look off.