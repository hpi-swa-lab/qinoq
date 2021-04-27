import { ProportionalLayout, Morph, config, HorizontalLayout, VerticalLayout, Icon, Label } from 'lively.morphic';
import { connect, signal, disconnectAll, disconnect } from 'lively.bindings';
import { pt, rect } from 'lively.graphics';
import { COLOR_SCHEME } from './colors.js';
import { InteractiveMorphInspector } from './inspector.js';
import { resource } from 'lively.resources';
import { arr } from 'lively.lang';
import { GlobalTimeline, SequenceTimeline } from './timeline/index.js';
import { Sequence, Interactive, Layer } from './index.js';
import { NumberWidget } from 'lively.ide/value-widgets.js';
import { Button } from 'lively.components';
import { arrowRightPressed, arrowLeftPressed } from './keys.js';
import { QinoqMorph } from './qinoq-morph.js';

const CONSTANTS = {
  EDITOR_WIDTH: 1000,
  EDITOR_HEIGHT: 550,
  PREVIEW_WIDTH: 533,
  SUBWINDOW_HEIGHT: 300,
  BORDER_WIDTH: 3,
  MENU_BAR_HEIGHT: 32,
  NEW_SEQUENCE_LENGTH: 125,
  SPACING: 3,
  SCROLL_POSITION_TOOLBAR_X_OFFSET: 360,
  DEFAULT_SCROLL_STEP: 1,
  LARGE_SCROLL_STEP: 10
};
CONSTANTS.SIDEBAR_WIDTH = (CONSTANTS.EDITOR_WIDTH - CONSTANTS.PREVIEW_WIDTH) / 2;
CONSTANTS.TIMELINE_HEIGHT = CONSTANTS.EDITOR_HEIGHT - CONSTANTS.SUBWINDOW_HEIGHT - CONSTANTS.MENU_BAR_HEIGHT;

export class InteractivesEditor extends QinoqMorph {
  static get properties () {
    return {
      interactive: {
        set (interactive) {
          if (this._deserializing) {
            this.setProperty('interactive', interactive);
            return;
          }
          this.clearInteractive();
          this.setProperty('interactive', interactive);
          this.initializeInteractive(interactive);
        }
      },
      name: {
        defaultValue: 'interactives editor'
      },
      extent: {
        defaultValue: pt(CONSTANTS.EDITOR_WIDTH, CONSTANTS.EDITOR_HEIGHT)
      },
      inspector: {
      },
      interactiveInEditMode: {
        defaultValue: false,
        set (bool) {
          if (!this.interactive) return;
          this.setProperty('interactiveInEditMode', bool);
          if (this.interactiveInEditMode) {
            this.interactive.scrollOverlay.passThroughMorph = true;
          } else {
            this.interactive.scrollOverlay.passThroughMorph = false;
          }
        }
      },
      debug: {
        defaultValue: false,
        set (bool) {
          this.setHalosEnabledForEditorElements(bool);
          this.setProperty('debug', bool);
        }
      },
      menuBar: {},
      tabContainer: {},
      window: {},
      sequenceOverview: {},
      preview: {},
      globalTimeline: {},
      globalTab: {}
    };
  }

  async initialize () {
    this.initializeLayout();
    this.window = this.openInWindow({
      title: 'Interactives Editor',
      name: 'window for interactives editor'
    });
    await this.initializePanels();
    connect(this.window, 'close', this, 'abandon');
    connect(this.window, 'position', this, 'positionChanged');
    connect(this.window, 'minimized', this, 'onWindowMinimizedChange');
    return this;
  }

  async initializePanels () {
    this.sequenceOverview = this.addMorph(new SequenceOverview({ position: pt(0, 0) }));

    this.preview = this.addMorph(new Preview({ _editor: this }));

    this.inspector = new InteractiveMorphInspector({
      position: pt(CONSTANTS.PREVIEW_WIDTH + CONSTANTS.SIDEBAR_WIDTH, 0),
      extent: pt(CONSTANTS.SIDEBAR_WIDTH, CONSTANTS.SUBWINDOW_HEIGHT),
      borderWidth: CONSTANTS.BORDER_WIDTH
    });
    this.inspector.initialize(this);
    this.addMorph(this.inspector);

    this.menuBar = new MenuBar({ position: pt(0, CONSTANTS.SUBWINDOW_HEIGHT), _editor: this });
    this.addMorph(this.menuBar);
    connect(this, 'onDisplayedTimelineChange', this.menuBar, 'onGlobalTimelineTab', {
      updater: `($update, displayedTimeline) => { 
        if (displayedTimeline == source.globalTimeline) $update();
      }`
    });
    connect(this, 'onDisplayedTimelineChange', this.menuBar, 'onSequenceView', {
      updater: `($update, displayedTimeline) => { 
        if (displayedTimeline !== source.globalTimeline) $update();
      }`
    });

    this.globalTimeline = new GlobalTimeline({
      position: pt(0, 0),
      extent: pt(CONSTANTS.EDITOR_WIDTH, CONSTANTS.TIMELINE_HEIGHT),
      _editor: this
    });

    this.tabContainer = await resource('part://tabs/tabs').read();
    Object.assign(this.tabContainer, {
      position: pt(0, CONSTANTS.SUBWINDOW_HEIGHT + CONSTANTS.MENU_BAR_HEIGHT),
      extent: pt(CONSTANTS.EDITOR_WIDTH, CONSTANTS.TIMELINE_HEIGHT),
      showNewTabButton: false,
      tabHeight: 28,
      visible: false
    });
    connect(this.tabContainer, 'onSelectedTabChange', this, 'onDisplayedTimelineChange', {
      updater: `($update, selectedAndPreviousTab) => {
        selectedAndPreviousTab.prev ? 
          $update(target.getTimelineFor(selectedAndPreviousTab.curr),target.getTimelineFor(selectedAndPreviousTab.prev)) :
          $update(target.getTimelineFor(selectedAndPreviousTab.curr))
      }`
    });
    connect(this.tabContainer, 'onTabClose', this, 'onTabClose');

    this.globalTab = await this.tabContainer.addTab('[no interactive loaded]', this.globalTimeline);
    this.globalTab.closeable = false;

    this.addMorph(this.tabContainer);
  }

  initializeLayout () {
    this.layout = new ProportionalLayout({
      lastExtent: this.extent
    });
    this.extent = pt(CONSTANTS.EDITOR_WIDTH, CONSTANTS.EDITOR_HEIGHT);
  }

  async createInteractiveWithNamePrompt () {
    const name = await $world.prompt(
      ['New Interactive\n', {}, 'Enter a name for this Interactive:',
        { fontWeight: 'normal' }], {
        width: 400,
        confirmLabel: 'CREATE INTERACTIVE',
        validate: (name) => !!name,
        errorMessage: 'Please enter a Name'
      });
    if (name) await this.createInteractive(name);
  }

  onWindowMinimizedChange (minimized) {
    if (!this.interactive) return;
    if (minimized) this.interactive.scrollOverlay.remove();
    else $world.addMorph(this.interactive.scrollOverlay);
  }

  positionChanged () {
    if (this.interactive) {
      // interactive has a fixed position in the editor
      // we need to manually keep the scrolloverlay at the correct position
      this.interactive.scrollOverlay.globalPosition = this.interactive.globalPosition;
    }
  }

  async createInteractive (name) {
    this.interactive = await Interactive.base({ name });
  }

  initializeInteractive (interactive) {
    if (!interactive) return;
    this.preview.loadContent(interactive);
    this.globalTimeline.loadContent(interactive);

    this.tabContainer.visible = true;

    interactive.withAllSubmorphsDo(submorph => { if (!submorph.isSequence && !submorph.isInteractive) connect(submorph, 'onAbandon', this, 'removeMorphFromInteractive', { converter: '() => source' }); });

    connect(this.interactive, 'onInternalScrollChange', this, 'onExternalScrollChange');

    connect(this.interactive, 'name', this.globalTab, 'caption').update(this.interactive.name);
    connect(this.globalTab, 'caption', this.interactive, 'name');

    connect(this.interactive, 'remove', this, 'reset');
    connect(this.interactive, '_length', this.menuBar.ui.scrollPositionInput, 'max').update(this.interactive.length);
    connect(this.preview, 'extent', this.interactive, 'extent');

    connect(this.interactive.scrollOverlay, 'newMorph', this, 'addMorphToInteractive');

    // trigger update of timeline dependents
    this.onDisplayedTimelineChange(this.globalTimeline);
  }

  // call this to propagate changes to the scrollposition to the actual interactive
  onInternalScrollChange (scrollPosition) {
    if (!this.interactive) return;
    this.interactive.onExternalScrollChange(scrollPosition);
    this.onScrollChange(scrollPosition);
  }

  // hook to change the scrollposition from within the editor
  // use this method for any editor elements that want to change the scroll position
  // e.g., menubar buttons or context menus
  internalScrollChangeWithGUIUpdate (scrollPosition) {
    this.menuBar.ui.scrollPositionInput.number = scrollPosition;
  }

  // listens for actual scrolling happening on the Interactive
  onExternalScrollChange (scrollPosition) {
    this.onScrollChange(scrollPosition);
  }

  // hook to get notification about updated scroll positions regardless of their origin
  // should be used by consumers of the scroll position e.g., the timeline cursor
  onScrollChange (scrollPosition) {}

  onTabClose (tab) {
    disconnectAll(tab);
    const timeline = this.getTimelineFor(tab);
    if (timeline) {
      disconnectAll(timeline);
      timeline.abandon();
    }
    if (this.getSequenceFor(tab)) disconnect(this.getSequenceFor(tab), 'name', tab, 'caption');
  }

  clearInteractive () {
    if (!this.interactive) return;
    this.interactiveInEditMode = false;

    this.interactive.withAllSubmorphsDo(submorph => { if (!submorph.isSequence && !submorph.isInteractive) disconnect(submorph, 'onAbandon', this, 'removeMorphFromInteractive'); });

    disconnect(this.interactive, 'onInternalScrollChange', this, 'onExternalScrollChange');

    disconnect(this.interactive, 'name', this.globalTimeline, 'name');
    disconnect(this.interactive, 'remove', this, 'reset');

    disconnect(this.preview, 'extent', this.interactive, 'extent');

    disconnect(this.interactive, 'name', this.globalTab, 'caption');
    disconnect(this.interactive, 'onLengthChange', this.globalTimeline, '_activeAreaWidth');
    disconnect(this.interactive, '_length', this.menuBar.ui.scrollPositionInput, 'max');

    disconnect(this.interactive.scrollOverlay, 'newMorph', this, 'addMorphToInteractive');

    const morphsToClear = [this.tabContainer, this.menuBar, this.inspector, this.sequenceOverview];
    morphsToClear.forEach(morph =>
      morph.withAllSubmorphsDo(submorph => {
        if (submorph.attributeConnections) {
          submorph.attributeConnections.forEach(attributeConnection => {
            const target = attributeConnection.targetObj;
            if (target === this.interactive || Interactive.isMorphInInteractive(target)) {
              disconnect(submorph, attributeConnection.sourceAttrName, attributeConnection.targetObj, attributeConnection.targetMethodName);
            }
          });
        }
      }));

    this.globalTimeline.clear();
    this.tabs.forEach(tab => {
      if (tab !== this.globalTab) {
        tab.close();
        tab.abandon();
      }
    });

    this.inspector.deselect();

    this.preview.showEmptyPreviewPlaceholder();
  }

  reset () {
    this.clearInteractive();
    this.setProperty('interactive', undefined);
    this.tabContainer.visible = false;
  }

  async initializeSequenceView (sequence) {
    this.internalScrollChangeWithGUIUpdate(sequence.start);
    const sequenceTab = this.getTabFor(sequence);
    if (sequenceTab) {
      sequenceTab.selected = true;
      return this.getTimelineFor(sequenceTab);
    }

    const timeline = this.initializeSequenceTimeline(sequence);
    const tab = await this.tabContainer.addTab(sequence.name, timeline);
    connect(sequence, 'name', tab, 'caption');
    connect(tab, 'caption', sequence, 'name');
    return tab;
  }

  initializeSequenceTimeline (sequence) {
    const sequenceTimeline = new SequenceTimeline({ position: pt(0, 0), extent: pt(CONSTANTS.EDITOR_WIDTH, CONSTANTS.TIMELINE_HEIGHT), _editor: this });
    sequenceTimeline.loadContent(sequence);
    return sequenceTimeline;
  }

  get keybindings () {
    return [
      { keys: 'Left', command: { command: 'move sequence left or decrease scroll position', args: { stepSize: CONSTANTS.DEFAULT_SCROLL_STEP } } },
      { keys: 'Shift-Left', command: { command: 'move sequence left or decrease scroll position', args: { stepSize: CONSTANTS.LARGE_SCROLL_STEP } } },
      { keys: 'Right', command: { command: 'move sequence right or increase scroll position', args: { stepSize: CONSTANTS.DEFAULT_SCROLL_STEP } } },
      { keys: 'Shift-Right', command: { command: 'move sequence right or increase scroll position', args: { stepSize: CONSTANTS.LARGE_SCROLL_STEP } } },
      { keys: 'Ctrl-A', command: 'select all sequences' },
      { keys: 'Delete', command: 'delete selected items' }
    ].concat(super.keybindings);
  }

  onKeyDown (event) {
    super.onKeyDown(event);
    if (arrowRightPressed(event) || arrowLeftPressed(event)) {
      this.groupingUndo = this.env.undoManager.undoStart(this, 'group-sequence-movements');
      this.env.undoManager.undoStop();
    }
  }

  onKeyUp (event) {
    if (arrowRightPressed(event) || arrowLeftPressed(event)) this.env.undoManager.group(this.groupingUndo);
    this.groupingUndo = null;
  }

  get displayedTimeline () {
    return this.getTimelineFor(this.tabContainer.selectedTab);
  }

  get sequenceTimelines () {
    return this.tabs.filter(tab => tab !== this.globalTab).map(tab => this.getTimelineFor(tab));
  }

  get tabs () {
    return this.tabContainer.tabs;
  }

  getTabFor (sequence) {
    return this.tabs.find(tab => this.getTimelineFor(tab).isSequenceTimeline && this.getTimelineFor(tab).sequence === sequence);
  }

  getTimelineFor (tab) {
    return tab.content;
  }

  getSequenceFor (tab) {
    return this.getTimelineFor(tab).sequence;
  }

  get currentSequence () {
    return this.getSequenceFor(this.tabContainer.selectedTab);
  }

  createNewSequence () {
    if (!this.interactive) return;

    // Assign a valid position to the new sequence
    const lastSequenceInFirstLayer = this.interactive.getLastSequenceInLayer(this.interactive.layers[0]);
    const startingPosition = lastSequenceInFirstLayer ? lastSequenceInFirstLayer.end : 0;

    const newSequence = new Sequence({ name: 'unnamed sequence', start: startingPosition, duration: CONSTANTS.NEW_SEQUENCE_LENGTH });
    newSequence.layer = this.interactive.layers[0];
    this.interactive.addSequence(newSequence);

    this.globalTimeline.createTimelineSequenceInHand(newSequence);
  }

  createNewLayer () {
    if (!this.interactive) return;

    const newZIndex = this.interactive.highestZIndex + 10;
    const newLayer = new Layer({ zIndex: newZIndex });

    this.interactive.addLayer(newLayer);
    this.globalTimeline.createTimelineLayer(newLayer);
    this.globalTimeline.onActiveAreaWidthChange();
  }

  addMorphToInteractive (morph) {
    this.currentSequence.addMorph(morph);
    this.inspector.targetMorph = morph;
    this.displayedTimeline._createOverviewLayers = true;
    this.displayedTimeline.createOverviewTimelineLayer(morph);
    this.displayedTimeline._createOverviewLayers = false;
    this.displayedTimeline.onActiveAreaWidthChange();
    connect(morph, 'onAbandon', this, 'removeMorphFromInteractive', { converter: '() => source' });
  }

  removeMorphFromInteractive (morph) {
    disconnect(morph, 'onAbandon', this, 'removeMorphFromInteractive');
    const sequenceOfMorph = Sequence.getSequenceOfMorph(morph);
    const tab = this.getTabFor(sequenceOfMorph);
    if (tab) {
      const timeline = this.getTimelineFor(tab);
      timeline.timelineLayers.filter(timelineLayer => timelineLayer.morph == morph).forEach(timelineLayer => timeline.abandonTimelineLayer(timelineLayer));
    }
    if (this.inspector.targetMorph == morph) {
      this.inspector.deselect();
    }
    sequenceOfMorph.abandonMorph(morph);
  }

  get inputFieldClasses () {
    return ['ValueScrubber', 'ColorPropertyView', 'TabCaption'];
  }

  inputFieldFocused () {
    const focusedMorph = this.env.eventDispatcher.eventState.focusedMorph; // TODO: This could be done with a utility in EventDispatcher
    if (!focusedMorph) return false;
    const className = focusedMorph.constructor.name;
    return this.inputFieldClasses.includes(className);
  }

  onDisplayedTimelineChange (displayedTimeline, previouslyDisplayedTimeline) {
    if (!this.interactive) return displayedTimeline;

    if (displayedTimeline === this.globalTimeline) {
      this.interactive.showAllSequences();
      this.interactiveInEditMode = false;
    } else {
      this.interactive.showOnly(this.currentSequence);
      this.interactiveInEditMode = true;
    }
    if (previouslyDisplayedTimeline) {
      disconnect(this.window, 'extent', previouslyDisplayedTimeline, 'relayout');
      disconnect(this, 'onScrollChange', displayedTimeline, 'onScrollChange');
    }
    this.menuBar.ui.zoomInput.number = displayedTimeline.zoomFactor * 100;
    connect(this.window, 'extent', displayedTimeline, 'relayout').update(this.window.extent);
    connect(this, 'onScrollChange', displayedTimeline, 'onScrollChange').update(this.interactive.scrollPosition);
    return displayedTimeline;
  }

  onZoomChange (newZoom) {
    this.displayedTimeline.zoomFactor = newZoom;
  }

  get snappingEnabled () {
    return !this._snappingDisabled;
  }

  setHalosEnabledForEditorElements (halosEnabled = true) {
    this.withAllSubmorphsDo(submorph => { if (submorph.isQinoqMorph) submorph.halosEnabled = halosEnabled; });
  }

  get commands () {
    return [
      {
        name: 'move sequence right or increase scroll position',
        doc: 'Move the selected sequences right or increase the scrollPosition by args.stepSize units',
        exec: (morph, args) => {
          if (!this.interactive || this.inputFieldFocused()) return;
          if (this.displayedTimeline.isGlobalTimeline && this.displayedTimeline.selectedSequences.length > 0) {
            this.displayedTimeline.moveTimelineSequencesBy(this.displayedTimeline.selectedSequences, args.stepSize);
            return;
          }
          if (this.interactive.scrollPosition + args.stepSize <= this.interactive.length) {
            this.internalScrollChangeWithGUIUpdate(this.interactive.scrollPosition + args.stepSize);
          } else {
            this.internalScrollChangeWithGUIUpdate(this.interactive.length);
          }
        }
      },
      {
        name: 'move sequence left or decrease scroll position',
        doc: 'Move the selected sequences left or decrease the scroll position by args.stepSize units',
        exec: (morph, args) => {
          if (!this.interactive || this.inputFieldFocused()) return;
          if (this.displayedTimeline.isGlobalTimeline && this.displayedTimeline.selectedSequences.length > 0) {
            this.displayedTimeline.moveTimelineSequencesBy(this.displayedTimeline.selectedSequences, -args.stepSize);
            return;
          }
          if (this.interactive.scrollPosition - args.stepSize >= 0) {
            this.internalScrollChangeWithGUIUpdate(this.interactive.scrollPosition - args.stepSize);
          } else {
            this.internalScrollChangeWithGUIUpdate(0);
          }
        }
      },
      {
        name: 'select all sequences',
        exec: () => {
          if (this.displayedTimeline.isGlobalTimeline && !this.inputFieldFocused()) {
            this.displayedTimeline.selectAllSequences();
          }
        }
      },
      {
        name: 'delete selected items',
        doc: 'All currently selected items in a timeline get deleted',
        exec: () => { if (!this.inputFieldFocused()) this.displayedTimeline.deleteSelectedItems(); }
      },
      {
        name: 'toggle snapping',
        doc: 'Enable or disable snapping of editor elements (e.g. keyframes, sequences)',
        exec: () => {
          this._snappingDisabled = !this._snappingDisabled;
          const toggleSnappingButton = this.menuBar.ui.toggleSnappingButton;
          toggleSnappingButton.fontColor = this._snappingDisabled ? COLOR_SCHEME.ON_BACKGROUND_VARIANT : COLOR_SCHEME.SECONDARY;
        }
      },
      {
        name: 'find keyframe',
        exec: async () => {
          const allKeyframes = this.interactive.sequences.flatMap(sequence => sequence.animations).flatMap(animation => animation.keyframes);
          const keyframeSearchStrings = this.interactive.sequences.flatMap(sequence => sequence.animations).map(animation => animation.keyframes.map(keyframe => `${keyframe.name} - ${animation.property} on ${animation.target.name} [${animation.sequence.name}]`)).flat();
          const result = await $world.listPrompt('Select a keyframe', keyframeSearchStrings, { filterable: true });
          if (result.selected.length > 0) {
            const keyframe = allKeyframes[keyframeSearchStrings.indexOf(result.selected[0])];
            await this.goto(keyframe);
          }
        }
      }];
  }

  // Focus on a specific item in the interactive
  async goto (item) {
    if (item.constructor.name == 'Keyframe') {
      const findResult = this.interactive.findKeyframe(item);
      if (!findResult) return;
      const { animation, sequence } = findResult;
      const tab = this.getTabFor(sequence) || await this.initializeSequenceView(sequence);
      tab.selected = true;
      const timelineLayer = this.getTimelineFor(tab).timelineLayers.find(timelineLayer => timelineLayer.morph === animation.target);
      timelineLayer.scrollToKeyframe(item, animation);
    }
  }

  abandon () {
    config.altClickDefinesThat = this._altClickDefinesThatStorage;
    this.clearInteractive();
    super.abandon();
  }

  onHoverIn () {
    this._altClickDefinesThatStorage = config.altClickDefinesThat;
    // this key in the morphic config is set to false, when clicking on a morph while Alt is pressed,
    // this does not bind `that` to the clicked morph
    // the binding of `that` is what triggers the show()
    config.altClickDefinesThat = false;
  }

  onHoverOut () {
    config.altClickDefinesThat = this._altClickDefinesThatStorage;
  }

  __after_deserialize__ (snapshot, ref, pool) {
    super.__after_deserialize__(snapshot, ref, pool);
    // Required to position the scrollOverlay correctly. Otherwise the scroll Overlay will be in the center of the screen and possibly misaligned with the interactive/ preview
    this.interactive.scrollOverlay.globalPosition = this.preview.globalPosition;
  }
}

class Preview extends QinoqMorph {
  static get properties () {
    return {
      name: {
        defaultValue: 'preview'
      },
      extent: {
        defaultValue: pt(CONSTANTS.PREVIEW_WIDTH, CONSTANTS.SUBWINDOW_HEIGHT)
      },
      borderColor: {
        defaultValue: COLOR_SCHEME.BACKGROUND_VARIANT
      },
      borderWidth: {
        defaultValue: CONSTANTS.BORDER_WIDTH
      },
      position: {
        defaultValue: pt(CONSTANTS.SIDEBAR_WIDTH, 0)
      },
      placeholderCaption: {
        defaultValue: 'Open an Interactive by grab-and-dropping it here, or...'
      },
      _editor: {
        set (editor) {
          this.setProperty('_editor', editor);
          this.showEmptyPreviewPlaceholder();
        }
      }
    };
  }

  onDrop (event) {
    if (event.type != 'morphicdrop') return;
    const grabbedMorph = arr.first(event.hand.grabbedMorphs);
    if (grabbedMorph.isInteractive) {
      this.editor.interactive = grabbedMorph;

      // Restore style properties set during grab
      const { pointerAndShadow } = event.hand._grabbedMorphProperties.get(grabbedMorph) || {};
      Object.assign(grabbedMorph, pointerAndShadow);
    } else {
      $world.setStatusMessage('You have to drop an interactive here');
    }
  }

  loadContent (interactive) {
    this.withAllSubmorphsDo(submorph => {
      if (submorph !== this) submorph.remove();
    });
    this.addMorph(interactive);
    this.addMorph(interactive.scrollOverlay);
    interactive.position = pt(0, 0);
    this.extent = interactive.extent;
    // trigger correct bounds on scrollable content of interactive
    interactive.updateInteractiveLength();
  }

  showEmptyPreviewPlaceholder () {
    this.submorphs = [];

    const placeholderColor = COLOR_SCHEME.ON_BACKGROUND_VARIANT;

    const icon = new Label({
      fontSize: 120,
      fontColor: placeholderColor
    });
    Icon.setIcon(icon, 'folder-open');

    const text = new Label({
      fontSize: 15,
      fontColor: placeholderColor,
      textString: this.placeholderCaption
    });
    text.height = 30;

    const newInteractiveButton = new Button({
      label: 'Create a new interactive',
      master: 'styleguide://SystemUserUI/blue button',
      acceptsDrops: false,
      padding: rect(8, 5, 0, -2)
    });
    newInteractiveButton.onMouseUp = () => this.editor.createInteractiveWithNamePrompt();

    const container = new Morph({
      acceptsDrops: false,
      extent: pt(this.width, this.height),
      position: pt(0, 0),
      fill: COLOR_SCHEME.TRANSPARENT,
      layout: new VerticalLayout({
        autoResize: false,
        align: 'center',
        direction: 'centered',
        spacing: 6
      }),
      submorphs: [icon, text, newInteractiveButton]
    });

    this.addMorph(container);
  }
}

class MenuBar extends QinoqMorph {
  static get properties () {
    return {
      name: {
        defaultValue: 'menu bar'
      },
      extent: {
        defaultValue: pt(CONSTANTS.EDITOR_WIDTH, CONSTANTS.MENU_BAR_HEIGHT)
      },
      borderColor: {
        defaultValue: COLOR_SCHEME.BACKGROUND_VARIANT
      },
      borderWidth: {
        defaultValue: CONSTANTS.BORDER_WIDTH
      },
      layoutable: {
        defaultValue: false
      },
      ui: {
        after: ['_editor'],
        initialize () {
          if (!this._deserializing) this.initializeUI();
        }
      }
    };
  }

  initializeUI () {
    this.ui = {};

    const containerCount = 3;
    const containerWidth = this.width / containerCount;

    this.ui.leftContainer = new Morph({
      layout: new HorizontalLayout({
        spacing: CONSTANTS.SPACING,
        autoResize: false,
        align: 'center'
      }),
      name: 'left container',
      fill: COLOR_SCHEME.TRANSPARENT,
      borderWidth: 0,
      extent: pt(containerWidth, CONSTANTS.MENU_BAR_HEIGHT)
    });

    this.ui.scrollPositionToolbar = new Morph({
      layout: new HorizontalLayout({
        spacing: CONSTANTS.SPACING,
        autoResize: false,
        direction: 'centered',
        align: 'center'
      }),
      name: 'scroll position toolbar',
      position: pt(containerWidth, 0),
      fill: COLOR_SCHEME.TRANSPARENT,
      borderWidth: 0,
      extent: pt(containerWidth, CONSTANTS.MENU_BAR_HEIGHT)
    });

    this.ui.rightContainer = new Morph({
      layout: new HorizontalLayout({
        spacing: CONSTANTS.SPACING,
        autoResize: false,
        direction: 'rightToLeft',
        align: 'center'
      }),
      name: 'right container',
      position: pt(containerWidth * 2, 0),
      fill: COLOR_SCHEME.TRANSPARENT,
      extent: pt(containerWidth, CONSTANTS.MENU_BAR_HEIGHT),
      borderWidth: 0
    });

    this.addMorph(this.ui.leftContainer);
    this.addMorph(this.ui.scrollPositionToolbar);
    this.addMorph(this.ui.rightContainer);

    this.layout = new ProportionalLayout({ initialExtent: this.extent });

    this.buildIconButton({
      tooltip: 'Create a new sequence',
      action: () => {
        this.editor.createNewSequence();
      },
      icon: 'ticket-alt',
      name: 'addSequenceButton',
      container: 'leftContainer'
    });

    this.buildIconButton({
      tooltip: 'Create a new layer',
      action: () => {
        this.editor.createNewLayer();
      },
      icon: 'layer-group',
      name: 'addLayerButton',
      container: 'leftContainer'
    });

    this.buildIconButton({
      tooltip: 'Go to start',
      action: () => {
        this.editor.internalScrollChangeWithGUIUpdate(this.editor.currentSequence ? this.editor.currentSequence.start : 0);
      },
      icon: 'fast-backward',
      name: 'gotoStartButton',
      container: 'scrollPositionToolbar'
    });

    this.buildIconButton({
      tooltip: 'Go to previous sequence',
      action: () => {
        const sequence = this.editor.currentSequence;
        // TODO: flexibility of getPrevSequenceStart needed?
        const nextPosition = sequence ? sequence.getAbsolutePosition(sequence.getPrevKeyframePosition(sequence.progress)) : this.editor.interactive.getPrevSequenceStart(this.editor.interactive.scrollPosition);
        if (nextPosition == undefined || isNaN(nextPosition)) return;
        this.editor.internalScrollChangeWithGUIUpdate(nextPosition);
      },
      icon: 'step-backward',
      name: 'gotoPrevButton',
      container: 'scrollPositionToolbar'
    });

    this.buildScrollPositionInput();

    this.buildIconButton({
      tooltip: 'Go to next sequence',
      action: () => {
        const sequence = this.editor.currentSequence;
        // TODO: see above
        const nextPosition = sequence ? sequence.getAbsolutePosition(sequence.getNextKeyframePosition(sequence.progress)) : this.editor.interactive.getNextSequenceStart(this.editor.interactive.scrollPosition);
        if (nextPosition == undefined || isNaN(nextPosition)) return;
        this.editor.internalScrollChangeWithGUIUpdate(nextPosition);
      },
      icon: 'step-forward',
      name: 'gotoNextButton',
      container: 'scrollPositionToolbar'
    });

    this.buildIconButton({
      tooltip: 'Go to end',
      action: () => {
        this.editor.internalScrollChangeWithGUIUpdate(this.editor.currentSequence ? this.editor.currentSequence.end : this.editor.interactive.length);
      },
      icon: 'fast-forward',
      name: 'gotoEndButton',
      container: 'scrollPositionToolbar'
    });

    this.buildIconButton({
      tooltip: 'Toggle snapping',
      action: () => this.editor.execCommand('toggle snapping'),
      icon: 'magnet',
      name: 'toggleSnappingButton',
      container: 'rightContainer'
    });

    this.buildIconButton({
      tooltip: 'Zoom to fit timeline',
      action: () => this.editor.displayedTimeline.zoomToFit(),
      icon: 'expand-arrows-alt',
      name: 'fitZoomButton',
      container: 'rightContainer'
    });

    this.buildIconButton({
      tooltip: 'Find keyframe',
      action: () => this.editor.execCommand('find keyframe'),
      icon: 'search-location',
      name: 'findKeyframeButton',
      container: 'rightContainer'
    });

    this.buildZoomInput();
  }

  buildZoomInput () {
    this.ui.zoomInput = new NumberWidget({
      min: 1,
      number: 100,
      tooltip: 'Set zoom factor',
      autofit: false,
      dropShadow: false,
      borderWidth: 2,
      unit: '%',
      borderColor: COLOR_SCHEME.SECONDARY
    });
    this.ui.zoomInput.getSubmorphNamed('value').fontColor = COLOR_SCHEME.ON_SURFACE;
    connect(this.ui.zoomInput, 'number', this.editor, 'onZoomChange', { converter: '(percent) => percent/100' });
    this.ui.rightContainer.addMorph(this.ui.zoomInput);
  }

  buildScrollPositionInput () {
    this.ui.scrollPositionInput = new NumberWidget({
      min: 0,
      extent: pt(100, 25),
      tooltip: 'Set scroll position',
      autofit: false,
      dropShadow: false,
      borderWidth: 2,
      borderColor: COLOR_SCHEME.SECONDARY
    });
    this.ui.scrollPositionInput.getSubmorphNamed('value').fontColor = COLOR_SCHEME.ON_SURFACE;
    connect(this.ui.scrollPositionInput, 'number', this.editor, 'onInternalScrollChange');
    connect(this.editor, 'onExternalScrollChange', this.ui.scrollPositionInput, 'number');
    this.ui.scrollPositionToolbar.addMorph(this.ui.scrollPositionInput);
  }

  buildIconButton (options = {}) {
    const { action, tooltip, name, morphName = 'aButton', icon, container } = options;
    this.ui[name] = new Label({
      extent: pt(64, 64),
      fontSize: 20,
      fontColor: COLOR_SCHEME.SECONDARY,
      nativeCursor: 'pointer',
      name: morphName,
      tooltip
    });
    this.ui[name].onMouseUp = action;
    Icon.setIcon(this.ui[name], icon);
    this.ui[container].addMorph(this.ui[name]);
  }

  onGlobalTimelineTab () {
    this.ui.addSequenceButton.reactsToPointer = true;
    this.ui.addLayerButton.reactsToPointer = true;
    this.ui.addSequenceButton.fontColor = COLOR_SCHEME.SECONDARY;
    this.ui.addLayerButton.fontColor = COLOR_SCHEME.SECONDARY;
    this.ui.gotoNextButton.tooltip = 'Go to next sequence';
    this.ui.gotoPrevButton.tooltip = 'Go to previous sequence';
  }

  onSequenceView () {
    this.ui.addSequenceButton.reactsToPointer = false;
    this.ui.addLayerButton.reactsToPointer = false;
    this.ui.addSequenceButton.fontColor = COLOR_SCHEME.ON_BACKGROUND_VARIANT;
    this.ui.addLayerButton.fontColor = COLOR_SCHEME.ON_BACKGROUND_VARIANT;
    this.ui.gotoNextButton.tooltip = 'Go to next keyframe';
    this.ui.gotoPrevButton.tooltip = 'Go to previous keyframe';
  }

  __after_deserialize__ (snapshot, ref, pool) {
    // floatingPoint property is not properly serialized and needs to be set here again
    this.ui.zoomInput.floatingPoint = false;
    this.ui.scrollPositionInput.floatingPoint = false;
    super.__after_deserialize__(snapshot, ref, pool);
  }
}

class SequenceOverview extends QinoqMorph {
  static get properties () {
    return {
      name: {
        defaultValue: 'sequence overview'
      },
      extent: {
        defaultValue: pt(CONSTANTS.SIDEBAR_WIDTH, CONSTANTS.SUBWINDOW_HEIGHT)
      },
      borderColor: {
        defaultValue: COLOR_SCHEME.BACKGROUND_VARIANT
      },
      borderWidth: {
        defaultValue: CONSTANTS.BORDER_WIDTH
      }
    };
  }
}
