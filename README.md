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

The recommended way of creating and structuring Interactives is using the graphical editor.
However, programmatic changes can be necessary to achieve advanced behavior.
The necessary API, that is used internally by the editor too, is described here.

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
Currently, `qinoq` provides support for animations on

- Numbers
- Points
- Colors and
- Textstrings (i.e. **rich text** is not supported).

This code adds an animation to the morph "bird" in the "skySequence", which is composed of 3 Keyframes. The animation makes the bird move over the screen by changing the position property.

```js
const birdAnimation = new PointAnimation(bird, 'position');
birdAnimation.addKeyframes([new Keyframe(0, pt(0, 200), 'start'), new Keyframe(0.5, pt(200, 300)), new Keyframe(1, pt(400, 0), 'end')]); // Keyframes are created; Naming the keyframe is optional

skySequence.addAnimation(birdAnimation);
```

#### Animatable Properties

Per default, the following morph properties can be animated in the inspector of the editor. The list contains the property names and the corresponding animation type.
For more information refer to `properties.js`.

- extent: 'point'
- position: 'point'
- fill: 'color'
- blur: 'number'
- flipped: 'number'
- tilted: 'number'
- grayscale: 'number'
- opacity: 'number'
- rotation: 'number'
- scale: 'number'
- textString: 'string'
- fontSize: 'number'
- fontColor: 'color'
- progress: 'number'

There is no limitation on properties that can be animated. However, not all properties will be visible in the inspector.
The next section will explain how custom properties can be added to the editor.

#### Custom properties to be animated in the inspector

To include another property in the inspector to allow the creation and editing of animations via GUI, you need to add the `animateAs` key to the morphic property definition.
You need to specify one of the supported animation types ('number','color','point','string'), depending on the values the property can have.

The code below demonstrates how a property `temperature` can be made animatable with a `NumberAnimation` in the editor:

```js
static get properties () {
    return {
      temperature: {
        animateAs: 'number',
        // arbitrary keys valid in property definitions
        defaultValue: 0,
        min: 0,
        max: 36,
      }
    }
}
```

### Morphs in the interactive

Morphs can simply be added by calling `addMorph` on a sequence. The following methods are called on morphs in an interactive, if they are defined:

- `onInteractiveScrollChange(scrollPosition)` when the scrollPosition in the interactive is changed.
- `onSequenceEnter` is always called when the sequence is now drawn and was previously not drawn. Note that this may also happen when the user scrolls backwards.
- `onSequenceLeave` is called whenever the sequence was previously drawn but is no longer drawn. Note that this may also happen when the user scrolls backwards.

## Bundling

Interactives can be bundled as any other morph in `lively.next`. However, there is one catch that one needs to be aware of:
If an Interactive was resized, **one needs to scroll through the whole interactive once before bundling**.
Otherwise, not all sequences are updated with the correct extent and the bundled interactive will look off.

## Known Pitfalls

- When connecting the interactive with a morph inside of it, the editor will clean up this connection upon deletion of the morph from the interactive **as long as it was added via the editor (e.g. grab-and-drop). When adding morphs programmatically, you will need to clean up created connections yourself.

## LottieMorphs

If you are in posession of the complete LottieMorph source code, you need to copy-paste the complete implementation into `interactive-morphs/lottie-morph.js`.
No other steps are required and you can start creating fully functioning LottieMorphs e.g., via the TopBar.