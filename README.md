# interactives-editor

The Interactives Editor allows editing of Interactives. Currently it is designed to edit Scrollytellings.

## Editor Usage

Before first usage of the editor within a world, you need to add the Interactives Editor package to the world.
For the following examples to work, you need to import the respective classes from the Interactives Editor package. Do so by opening a browser via `Ctrl+b`, clicking the `+` button at the top, selecting `Load Existing Package` and exchange `lively.morphic` with `interactives-editor`. Click `OK`.

Use the `javascript workspace` to execute the following commands. You can open one via `Ctrl+k`.

### Getting started with an Interactive

```js
// open an Interactives Editor in a window within the world
const editor = await new InteractivesEditor().initialize()

// create an interactive
const interactive = Interactive.example()  // creates an example interactive. Use new Interactive() to create an empty Interactive
interactive.openInWorld()  // opens the interactive as morph in the world. Can be omitted if this is not wanted

// load interactive into editor
editor.interactive = interactive  // alternatively, you can grab-and-drop the opened interactive into the preview of the editor (via the "grab"-halo)
```

## Interactive API

### Structure of an Interactive

An Interactive has three building blocks: the Interactive itself, Layers and Sequences.

The Interactive holds Layers and Sequences, manages their visibility and controls their progress. It has a length defining the possible scrolling amount for the Scrollytelling.
A Sequence is a semantic collection of morphs that live as submorphs within the sequence. It has a start position and a duration, which mark the time during which a sequence is visible within the Interactive. The sequence also offers a progress, ranging from 0 to 1 for the time of display, which could be used to animate the content of a Sequence in the future.
Sequences reference a Layer. All Sequences that should be displayed with the same z-index should reference the same layer.

The `Interactive`, `Layer` and `Sequence` classes hold static example methods that together build an example for an Interactive.

### Creating an Interactive

```js
const interactive = new Interactive();
interactive.initialize(pt(400, 300), 500); //extent and length of the interactive
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
const exampleSequence = new Sequence({name: 'example sequence'});
exampleSequence.initialize(0, 500) //sequence starts at 0, runs until 500
const exampleMorph = new Morph({ fill: Color.rgbHex('272a7c'), extent: pt(400, 300) });
exampleSequence.addMorph(exampleMorph);
exampleSequence.layer = layer // we have to put the sequence on a layer in the interactive
interactive.addSequence(exampleSequence)
```
