# interactives-editor

The interactives editor allows editing of interactives. Currently it is designed to edit scrolltellings.

## Editor Usage

### Opening an editor

`const editor = new InteractiveEditor()`

### Opening an Interactive in the world

```js
const interactive = Interactive.example()
interactive.openInWorld()
```

### Loading the Interactive in the editor

Either run `editor.loadInteractive(interactive)` or drag-and-drop the opened interactive into the
preview of the editor (via the "grab"-halo).

## Interactive API

### Structure of an Interactive

An Interactive has three building blocks: the Interactive itself, Layers and Sequences.

The Interactive holds Layers and Sequences.
A Sequence is a collection of morphs that should be displayed together for a defined timeframe during an Interactive. The contents of a Sequence may be animated in the future.
Sequences reference a Layer. All Sequences that should be displayed with the same z-index should reference the same layer.

The `Interactive`, `Layer` and `Sequence` classes hold static example methods that together build an Interactive.

### Creating an Interactive

```js
const interactive = Interactive({
      extent: pt(400, 300),
      length: 500
    });
```

### Adding Layers to an Interactive

```js
const layer = new Layer();
layer.name = 'ExampleLayer';
interactive.addLayer(layer);    
```

### Adding a Sequence to an Interactive

This code adds a Sequence to the Interactive that displays a rectangular Morph, beginning at position 0 for a duration of 250.

```js
const exampleSequence = new Sequence(0, //start position of sequence in the interactive
    250, //duration of the sequence
    { name: 'example sequence' });
const exampleMorph = new Morph({ fill: Color.rgbHex('272a7c'), extent: pt(400, 300) });
exampleSequence.addMorph(exampleMorph);
exampleSequence.layer = layer // we have to put the sequence on a layer in the interactive
interactive.addSequence(exampleSequence)
```