import { ProportionalLayout, InputLine, config, HorizontalLayout, VerticalLayout, Icon, Label } from 'lively.morphic';
import { connect, disconnectAll, disconnect } from 'lively.bindings';
import { pt, rect } from 'lively.graphics';
import { COLOR_SCHEME } from './colors.js';
import { InteractiveMorphInspector } from './inspector/index.js';
import { resource } from 'lively.resources';
import { arr } from 'lively.lang';
import { GlobalTimeline, SequenceTimeline } from './timeline/index.js';
import { NumberWidget } from 'lively.ide/value-widgets.js';

import { arrowRightPressed, arrowLeftPressed } from './keys.js';
import { Clipboard } from './utilities/clipboard.js';
import { QinoqMorph } from './qinoq-morph.js';
import { QinoqButton } from './components/qinoq-button.js';
import { EasingSelection } from './components/easing-selection.js';
import KeyHandler from 'lively.morphic/events/KeyHandler.js';
import { InteractiveGraph } from './tree.js';
import { SocialMediaButton } from './components/social-media-button.js';
import { error, success } from './utilities/messages.js';
import { Canvas } from 'lively.components/canvas.js';
import { TIMELINE_CONSTANTS } from './timeline/constants.js';
import { LabeledCheckBox, DropDownSelector } from 'lively.components/widgets.js';
import { NumberAnimation, Keyframe } from './animations.js';
import { Layer, Sequence, Interactive } from './interactive.js';
import { LottieMorph } from './interactive-morphs/lottie-morph.js';
import { delay } from 'lively.lang/promise.js';

export const HALO_ITEMS = ['menu', 'drag', 'close', 'copy', 'rotate', 'name'];

const CONSTANTS = {
  EDITOR_WIDTH: 1000,
  EDITOR_HEIGHT: 569,
  INTERACTIVE_HOLDER_WIDTH: 533,
  SUBWINDOW_HEIGHT: 300,
  BORDER_WIDTH: 1,
  MENU_BAR_HEIGHT: 38,
  NEW_SEQUENCE_LENGTH: 125,
  SPACING: 3,
  SCROLL_POSITION_TOOLBAR_X_OFFSET: 360,
  DEFAULT_SCROLL_STEP: 1,
  LARGE_SCROLL_STEP: 10,
  MENU_BAR_WIDGET_WIDTH: 100,
  MENU_BAR_WIDGET_HEIGHT: 25,
  FONT_SIZE_TEXT: 18,
  FONT_SIZE_HEADINGS: 20
};
CONSTANTS.SIDEBAR_WIDTH = (CONSTANTS.EDITOR_WIDTH - CONSTANTS.INTERACTIVE_HOLDER_WIDTH) / 2;
CONSTANTS.TIMELINE_HEIGHT = CONSTANTS.EDITOR_HEIGHT - CONSTANTS.SUBWINDOW_HEIGHT - CONSTANTS.MENU_BAR_HEIGHT;
CONSTANTS.MENU_BAR_WIDGET_EXTENT = pt(CONSTANTS.MENU_BAR_WIDGET_WIDTH, CONSTANTS.MENU_BAR_WIDGET_HEIGHT);

export class InteractivesEditor extends QinoqMorph {
  static get properties () {
    return {
      interactive: {
        set (interactive) {
          if (this._deserializing) {
            this.setProperty('interactive', interactive);
            if (interactive) {
              this.ui.interactiveGraph.buildTree();
            }
            return;
          }
          this.clearInteractive();
          this.setProperty('interactive', interactive);
          this.initializeInteractive(interactive);
          this.ui.menuBar.enableUIElements();
        }
      },
      name: {
        defaultValue: 'interactives editor'
      },
      extent: {
        defaultValue: pt(CONSTANTS.EDITOR_WIDTH, CONSTANTS.EDITOR_HEIGHT)
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
      clipboard: {
        defaultValue: new Clipboard()
      },
      debug: {
        defaultValue: false
      },
      ui: {
        /*
        * Keys:
        * globalTab, globalTimeline, inspector, menuBar, interactiveHolder, sequenceOverview, tabContainer, window, settings
        */
        initialize () {
          if (!this._deserializing) this.ui = {};
        }
      },
      _snappingDisabled: {}
    };
  }

  async initialize () {
    if ($world.get('lively top bar')) this.customizeTopBar();
    connect($world, 'onTopBarLoaded', this, 'customizeTopBar');
    this.initializeLayout();
    this.ui.window = this.openInWindow({
      title: 'Interactives Editor',
      name: 'window for interactives editor',
      acceptsDrops: false
    });
    await this.initializePanels();
    connect(this.ui.window, 'close', this, 'abandon');
    connect(this.ui.window, 'position', this, 'positionChanged');
    connect(this.ui.window, 'minimized', this, 'onWindowMinimizedChange');
    return this;
  }

  customizeTopBar () {
    const bar = $world.get('lively top bar');
    bar.registerCustomShape('Lottie Animation', LottieMorph, 'A', ['camera-retro', { paddingTop: '1px' }]);
    bar.registerCustomShape('Share Button', SocialMediaButton, 'S', ['share-alt', { paddingTop: '1px' }]);
  }

  async initializePanels () {
    this.ui.interactiveGraph = this.addMorph(new InteractiveGraph({
      position: pt(0, 0),
      extent: pt(CONSTANTS.SIDEBAR_WIDTH, CONSTANTS.SUBWINDOW_HEIGHT),
      _editor: this,
      borderWidth: {
        bottom: 0,
        left: 0,
        right: CONSTANTS.BORDER_WIDTH,
        top: 0,
        valueOf: (value) => value.left
      }
    }));

    this.ui.interactiveHolder = this.addMorph(new InteractiveHolder({ _editor: this }));

    this.ui.inspector = new InteractiveMorphInspector({
      position: pt(CONSTANTS.INTERACTIVE_HOLDER_WIDTH + CONSTANTS.SIDEBAR_WIDTH, 0),
      extent: pt(CONSTANTS.SIDEBAR_WIDTH, CONSTANTS.SUBWINDOW_HEIGHT),
      _editor: this,
      borderWidth: {
        bottom: 0,
        left: CONSTANTS.BORDER_WIDTH,
        right: 0,
        top: 0,
        valueOf: (value) => value.left
      }
    });
    this.addMorph(this.ui.inspector);

    this.ui.menuBar = new MenuBar({
      position: pt(0, CONSTANTS.SUBWINDOW_HEIGHT),
      _editor: this,
      borderWidth: {
        bottom: CONSTANTS.BORDER_WIDTH,
        left: 0,
        right: 0,
        top: CONSTANTS.BORDER_WIDTH,
        valueOf: (value) => value.left
      }
    });
    this.ui.menuBar.disableUIElements();
    this.addMorph(this.ui.menuBar);
    connect(this, 'onDisplayedTimelineChange', this.ui.menuBar, 'onGlobalTimelineTab', {
      updater: `($update, displayedTimeline) => { 
        if (displayedTimeline == source.ui.globalTimeline) $update();
      }`
    });
    connect(this, 'onDisplayedTimelineChange', this.ui.menuBar, 'onSequenceView', {
      updater: `($update, displayedTimeline) => { 
        if (displayedTimeline !== source.ui.globalTimeline) $update();
      }`
    });

    this.ui.globalTimeline = new GlobalTimeline({
      position: pt(0, 0),
      extent: pt(CONSTANTS.EDITOR_WIDTH, CONSTANTS.TIMELINE_HEIGHT),
      _editor: this
    });

    this.ui.tabContainer = await resource('part://tabs/tabs').read();
    Object.assign(this.ui.tabContainer, {
      position: pt(0, CONSTANTS.SUBWINDOW_HEIGHT + CONSTANTS.MENU_BAR_HEIGHT),
      extent: pt(CONSTANTS.EDITOR_WIDTH, CONSTANTS.TIMELINE_HEIGHT),
      showNewTabButton: false,
      tabHeight: 28,
      visible: false
    });
    this.ui.tabContainer.getSubmorphNamed('tab content container').acceptsDrops = false;
    connect(this.ui.tabContainer, 'onSelectedTabChange', this, 'onDisplayedTimelineChange', {
      updater: `($update, selectedAndPreviousTab) => {
        selectedAndPreviousTab.prev ? 
          $update(target.getTimelineFor(selectedAndPreviousTab.curr),target.getTimelineFor(selectedAndPreviousTab.prev)) :
          $update(target.getTimelineFor(selectedAndPreviousTab.curr))
      }`
    });
    connect(this.ui.tabContainer, 'onTabClose', this, 'onTabClose');

    this.ui.globalTab = await this.ui.tabContainer.addTab('[no interactive loaded]', this.ui.globalTimeline);
    this.ui.globalTab.closeable = false;
    this.ui.globalTab.borderColor = COLOR_SCHEME.PRIMARY;

    this.addMorph(this.ui.tabContainer);
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

  async createInteractive (name) {
    this.interactive = await Interactive.base({ name });
  }

  initializeInteractive (interactive) {
    if (!interactive) return;
    this.ui.interactiveHolder.loadContent(interactive);
    this.ui.globalTimeline.loadContent(interactive);
    this.ui.interactiveGraph.buildTree();

    this.ui.tabContainer.visible = true;

    interactive.sequences.forEach(sequence => {
      sequence.withAllSubmorphsDo(submorph => {
        if (!submorph.isSequence) {
          connect(submorph, 'onAbandon', this, 'removeMorphFromInteractive', { converter: '() => source' });
          connect(submorph, 'onRemove', this, 'moveMorphOutOfInteractive', { converter: '() => source' });
        }
      });
    });

    this.interactive.scrollOverlay.scrollToResize = true;

    connect(this.interactive, 'onInternalScrollChange', this, 'onExternalScrollChange');

    connect(this.interactive, 'name', this.ui.globalTab, 'caption').update(this.interactive.name);
    connect(this.ui.globalTab, 'caption', this.interactive, 'name');

    connect(this.interactive, 'remove', this, 'reset');
    connect(this.interactive, '_length', this.ui.menuBar.ui.scrollPositionInput, 'max').update(this.interactive.length);
    connect(this.ui.interactiveHolder, 'extent', this.interactive, 'scale', { converter: '(extent) => this.scale = extent.y / target.extent.y' });
    connect(this.interactive, 'interactiveZoomed', this, 'onInteractiveZoomed');

    connect(this.interactive.scrollOverlay, 'newMorph', this, 'addMorphToInteractive');
    connect(this.interactive.scrollOverlay, 'rejectDrop', this, 'rejectDropOnInteractive');

    // trigger update of timeline dependents
    this.onDisplayedTimelineChange(this.ui.globalTimeline);
  }

  onInteractiveZoomed () {
    this.ui.interactiveHolder.updateScrollbarVisibility();
  }

  // call this to propagate changes to the scrollPosition to the actual interactive
  onInternalScrollChange (scrollPosition) {
    if (!this.interactive) return;
    this.interactive.onExternalScrollChange(scrollPosition);
    this.onScrollChange(scrollPosition);
  }

  // hook to change the scrollPosition from within the editor
  // use this method for any editor elements that want to change the scroll position
  // e.g., menubar buttons or context menus
  internalScrollChangeWithGUIUpdate (scrollPosition) {
    this.ui.menuBar.ui.scrollPositionInput.number = scrollPosition;
  }

  // listens for actual scrolling happening on the Interactive
  onExternalScrollChange (scrollPosition) {
    // this will not trigger the connection for number on scrollPositionInput
    this.ui.menuBar.ui.scrollPositionInput.setProperty('number', scrollPosition);
    this.ui.menuBar.ui.scrollPositionInput.relayout(false);
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
    if (this.ui.settings && this.ui.settings.owner) this.ui.settings.owner.close();
    this.ui.settings = null;
    this.interactiveInEditMode = false;

    this.interactive.sequences.forEach(sequence => {
      sequence.withAllSubmorphsDo(submorph => {
        if (!submorph.isSequence) {
          disconnect(submorph, 'onAbandon', this, 'removeMorphFromInteractive');
          disconnect(submorph, 'onRemove', this, 'moveMorphOutOfInteractive');
        }
      });
    });

    this.interactive.scrollOverlay.scrollToResize = false;

    disconnect(this.interactive, 'onInternalScrollChange', this, 'onExternalScrollChange');

    disconnect(this.interactive, 'name', this.ui.globalTimeline, 'name');
    disconnect(this.interactive, 'remove', this, 'reset');

    disconnect(this.ui.interactiveHolder, 'extent', this.interactive, 'scale');
    disconnect(this.interactive, 'interactiveZoomed', this, 'onInteractiveZoomed');

    disconnect(this.interactive, 'name', this.ui.globalTab, 'caption');
    disconnect(this.interactive, 'onLengthChange', this.ui.globalTimeline, '_activeAreaWidth');
    disconnect(this.interactive, '_length', this.ui.menuBar.ui.scrollPositionInput, 'max');

    disconnect(this.interactive.scrollOverlay, 'newMorph', this, 'addMorphToInteractive');
    disconnect(this.interactive.scrollOverlay, 'rejectDrop', this, 'rejectDropOnInteractive');

    const morphsToClear = [this.ui.tabContainer, this.ui.menuBar, this.ui.inspector, this.ui.interactiveGraph];
    morphsToClear.forEach(morph =>
      morph.withAllSubmorphsDo(submorph => {
        if (submorph.attributeConnections) {
          submorph.attributeConnections.forEach(attributeConnection => {
            const target = attributeConnection.targetObj;
            if (Interactive.isMorphInInteractive(target)) attributeConnection.disconnect();
          });
        }
      }));

    this.ui.globalTimeline.clear();
    this.tabs.forEach(tab => {
      if (tab !== this.ui.globalTab) {
        tab.close();
        tab.abandon();
      }
    });

    this.ui.inspector.deselect();
    this.ui.interactiveGraph.removeTree();
    this.ui.interactiveGraph.removeConnections();

    this.ui.interactiveHolder.showEmptyInteractiveHolderPlaceholder();
    this.ui.menuBar.disableUIElements();
    this.updateZoomInputNumber(1);
    this.internalScrollChangeWithGUIUpdate(0);
  }

  ejectInteractive () {
    const interactive = this.interactive;
    this.reset();
    $world.addMorph(interactive);
    interactive.position = pt(100, 100);
  }

  reset () {
    this.clearInteractive();
    this.setProperty('interactive', undefined);
    this.ui.tabContainer.visible = false;
  }

  async initializeSequenceView (sequence) {
    const sequenceTab = this.getTabFor(sequence);
    if (sequenceTab) {
      sequenceTab.selected = true;
      return this.getTimelineFor(sequenceTab);
    }

    const timeline = this.initializeSequenceTimeline(sequence);
    const tab = await this.ui.tabContainer.addTab(sequence.name, timeline);
    tab.borderColor = COLOR_SCHEME.PRIMARY;
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
      { keys: 'Ctrl-A', command: 'select all items' },
      { keys: 'Ctrl-C', command: 'copy selection' },
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
    return this.getTimelineFor(this.ui.tabContainer.selectedTab);
  }

  get sequenceTimelines () {
    return this.tabs.filter(tab => tab !== this.ui.globalTab).map(tab => this.getTimelineFor(tab));
  }

  get tabs () {
    return this.ui.tabContainer.tabs;
  }

  getTabFor (sequence) {
    return this.tabs.find(tab => this.getTimelineFor(tab).isSequenceTimeline && this.getTimelineFor(tab).sequence === sequence);
  }

  getTimelineFor (tab) {
    return tab && tab.content;
  }

  getTimelineForSequence (sequence) {
    return this.getTimelineFor(this.getTabFor(sequence));
  }

  getSequenceFor (tab) {
    return this.getTimelineFor(tab).sequence;
  }

  get currentSequence () {
    return this.getSequenceFor(this.ui.tabContainer.selectedTab);
  }

  get selectedTimelineSequences () {
    return this.displayedTimeline.selectedTimelineSequences;
  }

  copySequence (sequence) {
    this.clipboard.addSequence(sequence);
  }

  pasteSequenceAt (start, layer) {
    const { sequence, animations, morphs } = this.clipboard.content;
    const sequenceProps = { ...sequence._morphicState, submorphs: [], animations: [], start, layer };
    const newSequence = new Sequence(sequenceProps);
    newSequence.name = `copy of ${newSequence.name}`;
    morphs.forEach(morph => {
      // morph.copy also copies connections
      // this is undesirable for us which is why we copy the morph without connections
      // and restore the original ones later
      // TODO: only filter our connections, maybe some are wanted
      const connections = morph.attributeConnections;
      morph.attributeConnections = [];
      const copiedMorph = morph.copy();
      copiedMorph.name = 'copy of ' + copiedMorph.name;
      morph.attributeConnections = connections;
      newSequence.addMorph(copiedMorph);
      const animationsTargetingMorph = animations.filter(animation => animation.target == morph);
      animationsTargetingMorph.forEach(animation => {
        const copiedAnimation = animation.copy();
        copiedAnimation.target = copiedMorph;
        newSequence.addAnimation(copiedAnimation);
      });
    });
    this.interactive.addSequence(newSequence);
    const timelineSequence = this.ui.globalTimeline.createTimelineSequence(newSequence);
  }

  rejectDropOnInteractive (event) {
    event.hand.grabbedMorphs.forEach(morph => {
      const properties = event.hand._grabbedMorphProperties.get(morph);
      properties.prevOwner.addMorph(morph);
      morph.position = properties.prevPosition;
      Object.assign(morph, properties.pointerAndShadow);
    });
    error('Add in sequence view!');
  }

  addMorphToInteractive (morph) {
    if (!morph) return;
    this.displayedTimeline.removePlaceholder();
    this.currentSequence.addMorph(morph);
    this.onMorphAddition(morph); // Additional actions that are morph specific
    this.ui.inspector.targetMorph = morph;
    this.displayedTimeline._createOverviewLayers = true;
    const newLayer = this.displayedTimeline.createOverviewTimelineLayer(morph);
    this.displayedTimeline._createOverviewLayers = false;
    this.displayedTimeline.onActiveAreaWidthChange();
    connect(morph, 'onRemove', this, 'moveMorphOutOfInteractive', { converter: '() => source' });
    connect(morph, 'onAbandon', this, 'removeMorphFromInteractive', { converter: '() => source' });
    newLayer.redraw();
    this.interactive.scrollOverlay.newMorph = null;
  }

  onMorphAddition (morph) {
    if (morph.isLottieMorph) {
      if (this.currentSequence.getAnimationForMorphProperty(morph, 'progress')) return;
      const animation = new NumberAnimation(morph, 'progress');
      animation.addKeyframes([new Keyframe(0, 0, { name: 'animation start' }), new Keyframe(1, 1, { name: 'animation end', easing: 'linear' })]);
      this.currentSequence.addAnimation(animation);
    }
  }

  copyMorph (morphToCopy) {
    const sequenceOfMorph = Sequence.getSequenceOfMorph(morphToCopy);
    const animationsToCopy = sequenceOfMorph.getAnimationsForMorph(morphToCopy);
    this.clipboard.addMorph(morphToCopy, animationsToCopy);
  }

  cutMorph (morphToCut) {
    this.copyMorph(morphToCut);
    this.removeMorphFromInteractive(morphToCut, false);
  }

  moveMorphOutOfInteractive (morph) {
    const sequenceOfMorph = Sequence.getSequenceOfMorph(morph);
    this.prepareToRemoveMorph(morph, sequenceOfMorph);
    sequenceOfMorph.abandonMorph(morph, true);
  }

  removeMorphFromInteractive (morph, abandonMorph = true) {
    const sequenceOfMorph = Sequence.getSequenceOfMorph(morph);
    sequenceOfMorph.abandonMorph(morph, !abandonMorph);
    this.prepareToRemoveMorph(morph, sequenceOfMorph);
  }

  prepareToRemoveMorph (morph, sequenceOfMorph) {
    disconnect(morph, 'onRemove', this, 'moveMorphOutOfInteractive');
    disconnect(morph, 'onAbandon', this, 'removeMorphFromInteractive');

    const tab = this.getTabFor(sequenceOfMorph);
    if (tab) {
      const timeline = this.getTimelineFor(tab);
      timeline.timelineLayers.filter(timelineLayer => timelineLayer.morph == morph).forEach(timelineLayer => timeline.abandonTimelineLayer(timelineLayer));
    }
    if (this.ui.inspector.targetMorph == morph) {
      this.ui.inspector.deselect();
    }
    if (sequenceOfMorph.isEmpty && tab) {
      const timeline = this.getTimelineFor(tab);
      timeline.addPlaceholder();
    }
  }

  get inputFieldClasses () {
    return ['ValueScrubber', 'ColorPropertyView', 'TabCaption', 'StringWidget', 'Text'];
  }

  inputFieldFocused () {
    const focusedMorph = this.env.eventDispatcher.eventState.focusedMorph; // TODO: This could be done with a utility in EventDispatcher
    if (!focusedMorph) return false;
    const className = focusedMorph.constructor.name;
    return this.inputFieldClasses.includes(className);
  }

  onDisplayedTimelineChange (displayedTimeline, previouslyDisplayedTimeline) {
    if (!this.interactive) return displayedTimeline;

    if (displayedTimeline === this.ui.globalTimeline) {
      this.interactive.showAllSequences();
      this.interactiveInEditMode = false;
    } else {
      displayedTimeline.scrollContainerToStart();
      this.internalScrollChangeWithGUIUpdate(displayedTimeline.start);
      this.interactive.showOnly(this.currentSequence);
      this.interactiveInEditMode = true;
    }
    if (previouslyDisplayedTimeline) {
      disconnect(this.ui.window, 'extent', previouslyDisplayedTimeline, 'relayout');
      disconnect(this, 'onScrollChange', previouslyDisplayedTimeline, 'updateRulerAndCursor');
    }
    this.updateZoomInputNumber(displayedTimeline.zoomFactor);
    connect(this.ui.window, 'extent', displayedTimeline, 'relayout').update(this.ui.window.extent);
    connect(this, 'onScrollChange', displayedTimeline, 'updateRulerAndCursor').update(this.interactive.scrollPosition);
    return displayedTimeline;
  }

  onZoomChange (newZoom) {
    let undo;
    // when grabbing in sequence view an undo is already in progress
    // a new undo might destroy the grab halo
    if (!this.env.undoManager.undoInProgress) { undo = this.undoStart('interactive-editor-change-zoom'); }
    this.displayedTimeline.zoomFactor = newZoom;
    if (undo) this.undoStop('interactive-editor-change-zoom');
  }

  updateZoomInputNumber (zoomFactor) {
    this.ui.menuBar.ui.zoomInput.number = zoomFactor * 100;
  }

  get snappingEnabled () {
    return !this._snappingDisabled;
  }

  get commands () {
    return [
      {
        name: 'move sequence right or increase scroll position',
        doc: 'Move the selected sequences right or increase the scrollPosition by args.stepSize units',
        exec: (morph, args) => {
          if (!this.interactive || this.inputFieldFocused()) return;
          if (this.displayedTimeline.isGlobalTimeline && this.selectedTimelineSequences.length > 0) {
            this.displayedTimeline.moveTimelineSequencesBy(this.selectedTimelineSequences, args.stepSize);
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
          if (this.displayedTimeline.isGlobalTimeline && this.selectedTimelineSequences.length > 0) {
            this.displayedTimeline.moveTimelineSequencesBy(this.selectedTimelineSequences, -args.stepSize);
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
        name: 'select all items',
        exec: () => { if (!this.inputFieldFocused()) this.displayedTimeline.selectAllItems(); }
      },
      {
        name: 'deselect all items',
        exec: () => { if (!this.inputFieldFocused()) this.displayedTimeline.deselectAllItems(); }
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
          const toggleSnappingButton = this.ui.menuBar.ui.toggleSnappingButton;
          toggleSnappingButton.active = !this._snappingDisabled;
        }
      },
      {
        name: 'find keyframe',
        exec: async () => {
          const keyframeSearchStrings = this.interactive.sequences
            .flatMap(sequence => sequence.animations)
            .flatMap(animation => animation.keyframes
              .map(keyframe => {
                return {
                  isListItem: true,
                  string: `${keyframe.name} - ${animation.property} on ${animation.target.name} [${animation.sequence.name}]`,
                  value: keyframe
                };
              }
              )
            );
          const result = await $world.listPrompt('Select a keyframe', keyframeSearchStrings, { filterable: true });
          if (result.selected.length > 0) {
            await this.goto(result.selected[0]);
          }
        }
      },
      {
        name: 'scroll to start',
        doc: 'set scrollPosition to start of sequence of sequence view or start of interactive',
        exec: () => {
          this.internalScrollChangeWithGUIUpdate(this.currentSequence ? this.currentSequence.start : 0);
        }
      },
      {
        name: 'scroll to previous item',
        doc: 'Scroll to previous sequence or keyframe',
        exec: () => {
          const sequence = this.currentSequence;
          const nextPosition = sequence ? sequence.getAbsolutePosition(sequence.getPrevKeyframePositionForAbsolutePosition(this.interactive.scrollPosition)) : this.interactive.getPrevSequenceStartOrEnd();
          if (nextPosition == undefined || isNaN(nextPosition)) return;
          this.internalScrollChangeWithGUIUpdate(nextPosition);
        }
      },
      {
        name: 'scroll to next item',
        doc: 'Scroll to next sequence or keyframe',
        exec: () => {
          const sequence = this.currentSequence;
          const nextPosition = sequence ? sequence.getAbsolutePosition(sequence.getNextKeyframePositionForAbsolutePosition(this.interactive.scrollPosition)) : this.interactive.getNextSequenceStartOrEnd();
          if (nextPosition == undefined || isNaN(nextPosition)) return;
          this.internalScrollChangeWithGUIUpdate(nextPosition);
        }
      },
      {
        name: 'scroll to end',
        doc: 'Scroll to the end of the interactive or the open sequence',
        exec: () => {
          this.internalScrollChangeWithGUIUpdate(this.currentSequence ? this.currentSequence.end : this.interactive.length);
        }
      },
      {
        name: 'zoom to fit timeline',
        doc: 'Zoom so that the complete timeline can be seen',
        exec: () => {
          this.displayedTimeline.zoomToFit();
        }
      },
      {
        name: 'create new layer',
        exec: () => {
          if (!this.interactive) return;

          const newZIndex = this.interactive.highestZIndex + 10;
          const newLayer = new Layer({ zIndex: newZIndex });

          this.interactive.addLayer(newLayer);
          this.ui.globalTimeline.createGlobalLayer(newLayer);
          this.ui.globalTimeline.onActiveAreaWidthChange();
        }
      },
      {
        name: 'open sequence after the current one',
        exec: async () => {
          if (!this.displayedTimeline.isSequenceTimeline) return;
          const nextSequence = this.interactive.getSequenceInLayerAfter(this.currentSequence);
          if (nextSequence) await this.goto(nextSequence);
        }
      },
      {
        name: 'open sequence before the current one',
        exec: async () => {
          if (!this.displayedTimeline.isSequenceTimeline) return;
          const prevSequence = this.interactive.getSequenceInLayerBefore(this.currentSequence);
          if (prevSequence) await this.goto(prevSequence);
        }
      },
      {
        name: 'create new sequence',
        exec: (_, args = { openInHand: true }) => {
          if (!this.interactive) return;

          // Assign a valid position to the new sequence
          const lastSequenceInFirstLayer = this.interactive.getLastSequenceInLayer(this.interactive.layers[0]);
          const startingPosition = lastSequenceInFirstLayer ? lastSequenceInFirstLayer.end : 0;

          const newSequence = new Sequence({ name: 'unnamed sequence', start: startingPosition, duration: CONSTANTS.NEW_SEQUENCE_LENGTH });
          newSequence.layer = this.interactive.layers[0];
          this.interactive.addSequence(newSequence);

          if (args.openInHand) this.ui.globalTimeline.createTimelineSequenceInHand(newSequence);

          return newSequence;
        }
      },
      {
        name: 'copy selection',
        doc: 'Copy selected items. Currently only works for one selected sequence',
        exec: () => {
          const selectedTimelineSequence = this.ui.globalTimeline.selectedTimelineSequences[0];
          if (selectedTimelineSequence) {
            this.copySequence(selectedTimelineSequence.sequence);
          }
        }
      },
      {
        name: 'show keybindings',
        exec: async () => {
          const textForEasingSelection = this.keybindingStringFromObject(EasingSelection.keybindings());
          const textForEditor = this.keybindingStringFromObject(this.keybindings);
          const textForMouseInteractions = [`${KeyHandler.prettyCombo('Alt')}Mouseclick — Add an Item to selection`,
            `${KeyHandler.prettyCombo('Shift')}Mouseclick — Blockselection (in global Timeline)`,
            `${KeyHandler.prettyCombo('Ctrl')}Mousewheel — Zoom in the timeline`,
            `${KeyHandler.prettyCombo('Alt')}Mousewheel — Scroll horizontally in the timeline`,
            `${KeyHandler.prettyCombo('Ctrl')}Mousewheel — Zoom in the Interactive`].map(string => '\t' + string).join('\n');

          await this.owner.toggleFader(true);

          const fader = this.owner.get('fader');
          fader.onMouseDown = function () {
            this.owner.toggleFader(false);
          };
          fader.fill = fader.fill.withA(0.7);
          fader.ui = {};
          fader.layout = new HorizontalLayout({
            autoResize: false
          });
          fader.ui.leftContainer = new QinoqMorph({
            layout: new VerticalLayout({
              direction: 'centered',
              align: 'left',
              autoResize: false,
              spacing: CONSTANTS.FONT_SIZE_TEXT
            }),
            name: 'left container',
            fill: COLOR_SCHEME.TRANSPARENT,
            borderWidth: 0,
            extent: pt(this.width / 2, this.height)
          });
          fader.addMorph(fader.ui.leftContainer);
          fader.ui.rightContainer = new QinoqMorph({
            name: 'right container',
            fill: COLOR_SCHEME.TRANSPARENT,
            borderWidth: 0,
            extent: pt(this.width / 2, this.height)
          });
          fader.addMorph(fader.ui.rightContainer);
          const closeLabel = new Label({
            position: pt(fader.ui.rightContainer.width - CONSTANTS.FONT_SIZE_HEADINGS - 15, 15),
            fontWeight: 'bold',
            fontColor: COLOR_SCHEME.BACKGROUND,
            fontSize: CONSTANTS.FONT_SIZE_HEADINGS,
            nativeCursor: 'pointer'
          });
          Icon.setIcon(closeLabel, 'times');
          fader.ui.rightContainer.addMorph(closeLabel);
          fader.ui.leftContainer.addMorph(new Label({
            textString: 'List of available Keybindings in the Editor',
            fontWeight: 'bold',
            fontColor: COLOR_SCHEME.BACKGROUND,
            fontSize: CONSTANTS.FONT_SIZE_HEADINGS
          }));
          fader.ui.leftContainer.addMorph(new Label({
            textString: textForEditor,
            fontColor: COLOR_SCHEME.BACKGROUND,
            fontSize: CONSTANTS.FONT_SIZE_TEXT
          }));
          fader.ui.leftContainer.addMorph(new Label({
            textString: 'List of available mouse interactions',
            fontWeight: 'bold',
            fontColor: COLOR_SCHEME.BACKGROUND,
            fontSize: CONSTANTS.FONT_SIZE_HEADINGS
          }));
          fader.ui.leftContainer.addMorph(new Label({
            textString: textForMouseInteractions,
            fontColor: COLOR_SCHEME.BACKGROUND,
            fontSize: CONSTANTS.FONT_SIZE_TEXT
          }));
          fader.ui.leftContainer.addMorph(new Label({
            textString: 'List of available Keybindings in the Easing Selection',
            fontWeight: 'bold',
            fontColor: COLOR_SCHEME.BACKGROUND,
            fontSize: CONSTANTS.FONT_SIZE_TEXT
          }));
          fader.ui.leftContainer.addMorph(new Label({
            textString: textForEasingSelection,
            fontColor: COLOR_SCHEME.BACKGROUND,
            fontSize: CONSTANTS.FONT_SIZE_TEXT - 2
          }));
        }
      },
      {
        name: 'open interactive settings',
        exec: () => {
          if (this.ui.settings) {
            this.ui.settings.owner.activate();
            return;
          }
          this.ui.settings = new Settings({ _editor: this });
          connect(this.ui.settings.owner, 'close', this.ui, 'settings', { converter: () => null });
        }
      }];
  }

  keybindingStringFromObject (keybindings) {
    return keybindings.map(keybinding => `\t${KeyHandler.prettyCombo(keybinding.keys)} — ${keybinding.command.command ? keybinding.command.command : keybinding.command}`).join('\n');
  }

  // Focus on a specific item in the interactive
  async goto (item) {
    // necessary due to abitrary order of deserialization of the submorphs
    if (this._deserializing) return;
    if (item.isKeyframe) {
      const keyframe = item;
      const findResult = this.interactive.findKeyframe(keyframe);
      if (!findResult) return;
      const { animation, sequence } = findResult;
      const tab = await this.goto(sequence);
      this.internalScrollChangeWithGUIUpdate(this.currentSequence.getAbsolutePositionFor(keyframe));

      // Needed for scrolling to the correct position when opening existing tab
      await delay(30);

      this.getTimelineFor(tab).scrollToKeyframe(keyframe, animation);
      return;
    }
    if (item.isSequence) {
      const sequence = item;
      const tab = this.getTabFor(sequence) || await this.initializeSequenceView(sequence);
      tab.selected = true;
      return tab;
    }
    if (item.isMorph && Interactive.isMorphInInteractive(item)) {
      const sequence = Sequence.getSequenceOfMorph(item);
      await this.goto(sequence);
      this.ui.inspector.targetMorph = item;
      item.show();
    }
    if (item.isAnimation) {
      if (item.keyframes.length > 0) {
        await this.goto(item.keyframes[0]);
      }
    }
  }

  abandon () {
    config.altClickDefinesThat = this._altClickDefinesThatStorage;
    this.clipboard.clear();
    this.clearInteractive();
    disconnect($world, 'onTopBarLoaded', this, 'customizeTopBar');
    super.abandon();
  }

  onHoverIn () {
    const bar = $world.get('lively top bar');
    if (bar) bar.activeHaloItems = HALO_ITEMS;
    this._altClickDefinesThatStorage = config.altClickDefinesThat;
    // this key in the morphic config is set to false, when clicking on a morph while Alt is pressed,
    // this does not bind `that` to the clicked morph
    // the binding of `that` is what triggers the show()
    config.altClickDefinesThat = false;
  }

  onHoverOut () {
    const bar = $world.get('lively top bar');
    if (bar) bar.activeHaloItems = ['*'];
    config.altClickDefinesThat = this._altClickDefinesThatStorage;
  }

  pasteMorphFromClipboard () {
    const { morph, animations } = this.clipboard.content;

    // morph.copy also copies connections
    // this is undesirable for us which is why we copy the morph without connections
    // and restore the original ones later
    // TODO: only filter our connections, maybe some are wanted
    const connections = morph.attributeConnections;
    morph.attributeConnections = [];

    const copiedMorph = morph.copy();
    copiedMorph.name = 'copy of ' + copiedMorph.name;
    morph.attributeConnections = connections;
    // it is important that the animations are setup before the copiedMorph is added to the Interactive
    // this way it is ensured that the automatic progress animations on lottie morphs work as expected
    const copiedAnimations = animations.map(animation => animation.copy());
    copiedAnimations.forEach((animation) => {
      animation.target = copiedMorph;
      this.currentSequence.addAnimation(animation);
    });
    this.addMorphToInteractive(copiedMorph);

    const layer = this.displayedTimeline.timelineLayers.find(timelineLayer => timelineLayer.morph === copiedMorph);
    layer.addTimelineKeyframes();
    this.ui.inspector.animationsInspector.updateRespectiveAnimations();
    return copiedMorph;
  }

  renameInteractiveWithPrompt () {
    const name = this.interactive.name;
    $world.prompt('Enter new Name for the Interactive', { input: name }).then((newName) => {
      if (newName) this.interactive.name = newName;
    });
  }

  isInSequenceView () {
    return !!this.currentSequence;
  }
}

class InteractiveHolder extends QinoqMorph {
  static get properties () {
    return {
      acceptsDrops: {
        defaultValue: true
      },
      name: {
        defaultValue: 'interactive holder'
      },
      extent: {
        defaultValue: pt(CONSTANTS.INTERACTIVE_HOLDER_WIDTH, CONSTANTS.SUBWINDOW_HEIGHT),
        after: ['_editor', 'ui'],
        set (extent) {
          this.setProperty('extent', extent);
          if (!this._deserializing) this.updateScrollbarVisibility();
        }
      },
      borderColor: {
        defaultValue: COLOR_SCHEME.ON_BACKGROUND_DARKER_VARIANT
      },
      borderWidth: {
        defaultValue: {
          left: 1,
          top: 0,
          bottom: 0,
          right: 0
        }
      },
      position: {
        defaultValue: pt(CONSTANTS.SIDEBAR_WIDTH, 0)
      },
      placeholderCaption: {
        defaultValue: 'Open an Interactive by grab-and-dropping it here, or...'
      },
      clipMode: {
        defautValue: 'hidden'
      },
      _editor: {
        set (editor) {
          this.setProperty('_editor', editor);
          this.showEmptyInteractiveHolderPlaceholder();
        }
      },
      animationPreview: {
        set (animationPreview) {
          if (!animationPreview && this.animationPreview) {
            this.animationPreview.remove();
          } else if (animationPreview) {
            if (this.animationPreview) this.animationPreview.remove();
            if (!this._deserializing) this.addMorph(animationPreview);
          }
          this.setProperty('animationPreview', animationPreview);
        }
      }
    };
  }

  onDrop (event) {
    if (event.type != 'morphicdragend') return;
    const grabbedMorph = arr.first(event.hand.grabbedMorphs);
    if (grabbedMorph.isInteractive) {
      this.editor.interactive = grabbedMorph;

      // Restore style properties set during grab
      const { pointerAndShadow } = event.hand._grabbedMorphProperties.get(grabbedMorph) || {};
      Object.assign(grabbedMorph, pointerAndShadow);
    } else {
      error('You have to drop an interactive here');
    }
  }

  loadContent (interactive) {
    this.withAllSubmorphsDo(submorph => {
      if (submorph !== this) submorph.remove();
    });

    this.addMorph(interactive);
    //
    interactive.position = pt(0, 0);
    // trigger correct bounds on scrollable content of interactive
    interactive.updateInteractiveLength();

    // this should not be necessary, but setting this via defaultValue does not suffice
    this.clipMode = 'hidden';
    interactive.fitBounds(this.extent);
  }

  showEmptyInteractiveHolderPlaceholder () {
    this.clipMode = 'hidden';
    this.submorphs = [];

    const placeholderColor = COLOR_SCHEME.ON_SURFACE_VARIANT;

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

    const newInteractiveButton = new QinoqButton({
      textString: 'Create a new interactive',
      padding: rect(8, 5, 0, -2),
      target: this.editor,
      fontSize: 15,
      action: 'createInteractiveWithNamePrompt',
      active: true,
      fontWeight: 'bolder'
    });

    const container = new QinoqMorph({
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

  addAnimationPreview (animation) {
    if (animation.type != 'point') return;

    this.animationPreview = PositionAnimationPreview.forAnimation(animation, { extent: this.extent });
  }

  removeAnimationPreview () {
    this.animationPreview = null;
  }

  updateScrollbarVisibility () {
    if (!this.interactive) return;

    // only show scrollbars if they are necessary
    const scrollBarWidth = this.scrollbarOffset.x;
    if (this.interactive.bounds().width - scrollBarWidth > this.width ||
         this.interactive.bounds().height - scrollBarWidth > this.height) {
      this.clipMode = 'scroll';
    }
    if (!(this.interactive.bounds().width - scrollBarWidth > this.width) &&
         !(this.interactive.bounds().height - scrollBarWidth > this.height)) {
      this.clipMode = 'hidden';
    }
  }

  get isInteractiveHolder () {
    return true;
  }
}

class PositionAnimationPreview extends Canvas {
  static forAnimation (animation, props = {}) {
    return new PositionAnimationPreview({ animation, ...props });
  }

  static get properties () {
    return {
      fill: {
        defaultValue: COLOR_SCHEME.TRANSPARENT
      },
      extent: {
        defaultValue: pt(533, 300)
      },
      animation: {
        set (animation) {
          this.setProperty('animation', animation);
          this.whenRendered().then(() => this.drawCurve());
        }
      }
    };
  }

  diamond (position, extent, fill = '#' + COLOR_SCHEME.KEYFRAME_BORDER.toHexString()) {
    const context = this.context;
    const x = position.x;
    const y = position.y;
    const width = extent.x;
    const height = extent.y;
    context.beginPath();
    context.moveTo(x, y - height / 2);
    context.lineTo(x - width / 2, y);
    context.lineTo(x, y + height / 2);
    context.lineTo(x + width / 2, y);
    context.closePath();

    context.fillStyle = fill;
    context.fill();
  }

  drawCurve () {
    if (this.animation.keyframes.length < 2) return;
    if (!this.world()) return;
    this.clear();

    const values = Object.entries(this.animation.getValues(0.001, true));

    const lineStyle = { color: COLOR_SCHEME.PRIMARY };
    let previousPosition;
    values.forEach(positionValuePair => {
      const currentPosition = positionValuePair[1];
      if (previousPosition) this.line(previousPosition, currentPosition, lineStyle);
      previousPosition = currentPosition;
    });

    this.line(previousPosition, this.animation.keyframes[this.animation.keyframes.length - 1], lineStyle);

    this.animation.keyframes.forEach(keyframe => {
      const value = this.animation.transformValue(keyframe.value);
      this.diamond(value, pt(15, 15));
    });
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

    this.ui.leftContainer = new QinoqMorph({
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

    this.ui.scrollPositionToolbar = new QinoqMorph({
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

    this.ui.rightContainer = new QinoqMorph({
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
      target: this.editor,
      command: 'create new sequence',
      icon: 'ticket-alt',
      name: 'addSequenceButton',
      container: 'leftContainer'
    });

    this.buildIconButton({
      tooltip: 'Create a new layer',
      target: this.editor,
      command: 'create new layer',
      icon: 'layer-group',
      name: 'addLayerButton',
      container: 'leftContainer'
    });

    this.buildIconButton({
      tooltip: 'Go to start',
      target: this.editor,
      command: 'scroll to start',
      doubleCommand: 'open sequence before the current one',
      icon: 'fast-backward',
      name: 'gotoStartButton',
      container: 'scrollPositionToolbar'
    });

    this.buildIconButton({
      tooltip: 'Go to previous sequence',
      target: this.editor,
      command: 'scroll to previous item',
      icon: 'step-backward',
      name: 'gotoPrevButton',
      container: 'scrollPositionToolbar'
    });

    this.buildScrollPositionInput();

    this.buildIconButton({
      tooltip: 'Go to next sequence',
      target: this.editor,
      command: 'scroll to next item',
      icon: 'step-forward',
      name: 'gotoNextButton',
      container: 'scrollPositionToolbar'
    });

    this.buildIconButton({
      tooltip: 'Go to end',
      target: this.editor,
      command: 'scroll to end',
      doubleCommand: 'open sequence after the current one',
      icon: 'fast-forward',
      name: 'gotoEndButton',
      container: 'scrollPositionToolbar'
    });

    this.buildIconButton({
      tooltip: 'Toggle snapping',
      target: this.editor,
      command: 'toggle snapping',
      icon: 'magnet',
      name: 'toggleSnappingButton',
      container: 'rightContainer',
      active: !this._snappingDisabled
    });

    this.buildIconButton({
      tooltip: 'Zoom to fit timeline',
      target: this.editor,
      command: 'zoom to fit timeline',
      icon: 'expand-arrows-alt',
      name: 'fitZoomButton',
      container: 'rightContainer'
    });

    this.buildIconButton({
      tooltip: 'Find Keyframe',
      target: this.editor,
      command: 'find keyframe',
      icon: 'search-location',
      name: 'findKeyframeButton',
      container: 'rightContainer'
    });

    this.buildZoomInput();

    this.ui.rightContainer.addMorph(new QinoqMorph({
      name: 'divider',
      fill: COLOR_SCHEME.BACKGROUND_VARIANT,
      extent: pt(CONSTANTS.BORDER_WIDTH, CONSTANTS.MENU_BAR_HEIGHT - 10),
      borderRadius: 5
    }));

    this.buildIconButton({
      tooltip: 'Show Keybindings',
      target: this.editor,
      command: 'show keybindings',
      icon: 'keyboard',
      name: 'showKeybindingList',
      container: 'rightContainer'
    });

    this.buildIconButton({
      tooltip: 'Open Settings for Interactive',
      target: this.editor,
      command: 'open interactive settings',
      icon: 'cog',
      name: 'settingsButton',
      container: 'rightContainer'
    });
  }

  buildZoomInput () {
    this.ui.zoomInput = new NumberWidget({
      min: TIMELINE_CONSTANTS.MINIMAL_ZOOM,
      // these two are necessary for the correct layouting to be applied
      extent: CONSTANTS.MENU_BAR_WIDGET_EXTENT,
      autofit: false,
      floatingPoint: false,
      number: 100,
      tooltip: 'Set zoom factor',
      dropShadow: false,
      borderWidth: 2,
      unit: '%',
      borderColor: COLOR_SCHEME.PRIMARY
    });
    this.ui.zoomInput.getSubmorphNamed('value').fontColor = COLOR_SCHEME.ON_BACKGROUND;
    connect(this.ui.zoomInput, 'number', this.editor, 'onZoomChange', { converter: '(percent) => percent/100' });
    this.ui.rightContainer.addMorph(this.ui.zoomInput);
  }

  buildScrollPositionInput () {
    this.ui.scrollPositionInput = new NumberWidget({
      min: 0,
      // these two are necessary for the correct layouting to be applied
      extent: CONSTANTS.MENU_BAR_WIDGET_EXTENT,
      autofit: false,
      floatingPoint: false,
      tooltip: 'Set scroll position',
      dropShadow: false,
      borderWidth: 2,
      borderColor: COLOR_SCHEME.PRIMARY
    });
    this.ui.scrollPositionInput.getSubmorphNamed('value').fontColor = COLOR_SCHEME.ON_SURFACE;
    connect(this.ui.scrollPositionInput, 'number', this.editor, 'onInternalScrollChange');
    this.ui.scrollPositionToolbar.addMorph(this.ui.scrollPositionInput);
  }

  buildIconButton (options = {}) {
    const { name, morphName = 'aButton', active, container } = options;
    this.ui[name] = new QinoqButton({
      fontSize: 20,
      ...options,
      name: morphName
    });
    if (active) this.ui[name].active = true;
    this.ui[container].addMorph(this.ui[name]);
  }

  onGlobalTimelineTab () {
    if (!this.interactive) return;
    this.ui.addSequenceButton.enable();
    this.ui.addLayerButton.enable();
    this.ui.gotoStartButton.tooltip = 'Go to start';
    this.ui.gotoEndButton.tooltip = 'Go to end';
    this.ui.gotoNextButton.tooltip = 'Go to next sequence';
    this.ui.gotoPrevButton.tooltip = 'Go to previous sequence';
  }

  onSequenceView () {
    if (!this.interactive) return;
    this.ui.addSequenceButton.disable();
    this.ui.addLayerButton.disable();
    this.ui.gotoStartButton.tooltip = 'Go to start\nDouble click to open previous Sequence';
    this.ui.gotoEndButton.tooltip = 'Go to end\nDouble click to open next Sequence';
    this.ui.gotoNextButton.tooltip = 'Go to next keyframe';
    this.ui.gotoPrevButton.tooltip = 'Go to previous keyframe';
  }

  disableUIElements () {
    Object.values(this.ui).forEach(morph => {
      if (morph.isQinoqButton) morph.enabled = false;
    });
    this.ui.zoomInput.borderColor = COLOR_SCHEME.ON_BACKGROUND_DARKER_VARIANT;
    this.ui.scrollPositionInput.borderColor = COLOR_SCHEME.ON_BACKGROUND_DARKER_VARIANT;
  }

  enableUIElements () {
    Object.values(this.ui).forEach(morph => {
      if (morph.isQinoqButton) morph.enabled = true;
    });
    this.ui.zoomInput.borderColor = COLOR_SCHEME.PRIMARY;
    this.ui.scrollPositionInput.borderColor = COLOR_SCHEME.PRIMARY;
  }
}

export class Settings extends QinoqMorph {
  static get properties () {
    return {
      name: {
        defaultValue: 'Settings Menu'
      },
      resizable: {
        defaultValue: false
      },
      extent: {
        defaultValue: pt(260, 160)
      },
      ui: {
        after: ['_editor'],
        initialize () {
          if (this._deserializing) return;
          this.ui = {};
          this.initialize();
        }
      }
    };
  }

  initialize () {
    this.buildInteractiveSettings();
    this.openInWindow();
  }

  buildInteractiveSettings () {
    this.ui.interactiveSettings = new QinoqMorph({
      name: 'interactive settings'
    });
    this.ui.interactiveSettings.layout = new VerticalLayout({
      autoResize: true,
      spacing: 5
    });
    this.addMorph(this.ui.interactiveSettings);
    this.buildRemoveInteractiveButton();
    this.buildRenameInteractiveButton();
    this.buildScrollBarCheckbox();
    this.buildAspectRatioField();
  }

  buildRemoveInteractiveButton () {
    const button = new QinoqButton({
      name: 'ejectButton',
      textString: 'Eject Interactive',
      tooltip: 'Places the interactive in the world outside of the editor',
      padding: rect(8, 5, 0, -2),
      target: this.editor,
      filled: true,
      action: 'ejectInteractive'
    });
    this.ui.interactiveSettings.addMorph(button);
  }

  buildRenameInteractiveButton () {
    const button = new QinoqButton({
      name: 'renameButton',
      textString: 'Rename Interactive',
      padding: rect(8, 5, 0, -2),
      target: this.editor,
      filled: true,
      action: 'renameInteractiveWithPrompt'
    });
    this.ui.interactiveSettings.addMorph(button);
  }

  buildScrollBarCheckbox () {
    const checkbox = new LabeledCheckBox({
      name: 'scrollBarBox',
      label: 'Scrollbars enabled on the interactive',
      checked: this.interactive.isScrollBarVisible
    });
    checkbox.layout.spacing = 2;
    this.ui.interactiveSettings.addMorph(checkbox);
    connect(checkbox, 'checked', this.interactive, 'setScrollBarVisibility');
  }

  buildAspectRatioField () {
    const aspectRatioField = new QinoqMorph({
      name: 'aspect ratio field'
    });
    aspectRatioField.layout = new HorizontalLayout({
      spacing: 2
    });
    const checkbox = new LabeledCheckBox({
      name: 'fixedRatioBox',
      label: 'interactive has fixed aspect ratio',
      checked: !!this.interactive.fixedAspectRatio
    });
    checkbox.layout.spacing = 2;
    this.ui.interactiveSettings.addMorph(checkbox);

    this.ui.dropDownSelector = new DropDownSelector({
      name: 'aspectRatioDropDown',
      values: ['21/9', '16/9', '4/3', 'Custom'],
      borderWidth: 1,
      borderColor: COLOR_SCHEME.BACKGROUND_VARIANT
    });
    this.ui.dropDownSelector.selectedValue = '16/9';
    aspectRatioField.addMorph(this.ui.dropDownSelector);

    this.ui.inputLine = new InputLine({
      name: 'customRatioInput',
      visible: false,
      borderWidth: 1,
      borderColor: COLOR_SCHEME.BACKGROUND_VARIANT
    });
    aspectRatioField.addMorph(this.ui.inputLine);
    this.ui.interactiveSettings.addMorph(aspectRatioField);

    connect(checkbox, 'checked', this, 'toggleAspectRatio');
    connect(this.ui.dropDownSelector, 'selectedValue', this, 'dropDownSelectorUpdate');
    connect(this.ui.inputLine, 'inputAccepted', this, 'inputLineUpdate');
  }

  inputLineUpdate (input) {
    try {
      const newRatio = Settings.matchNumberOrFraction(input);
      if (!newRatio) throw new Error('The input was not a number!');
      this.interactive.fixedAspectRatio = newRatio;
      this.editor.onInteractiveZoomed();
      success('Ratio updated!');
    } catch (err) {
      error('Input a fraction (x/y)');
    }
  }

  static matchNumberOrFraction (inputString) {
    // eslint-disable-next-line no-useless-escape
    const match = inputString.match(RegExp('^(\\d+)((\\.\\d+)|(\\/\\d+))?$', 'i'));
    if (!match) return null;
    if (!match[2]) return Number(match[1]);
    if (match[2].includes('.')) return Number(match[1].concat(match[3]));
    if (match[2].includes('/')) return Number(match[1]) / Number(match[4].substring(1));
  }

  dropDownSelectorUpdate (input) {
    if (input == 'Custom') {
      this.ui.inputLine.visible = true;
      this.ui.inputLine.input = `${this.interactive.fixedAspectRatio}`;
    } else {
      this.ui.inputLine.visible = false;
      this.interactive.fixedAspectRatio = eval(input);
    }
    this.editor.onInteractiveZoomed();
  }

  toggleAspectRatio (bool) {
    bool ? this.enableAspectRatio() : this.disableAspectRatio();
  }

  enableAspectRatio () {
    this.ui.dropDownSelector.visible = true;
    this.ui.dropDownSelector.selectedValue = '16/9';
    this.interactive.fixedAspectRatio = 16 / 9;
  }

  disableAspectRatio () {
    this.ui.dropDownSelector.visible = false;
    this.ui.inputLine.visible = false;
    this.interactive.fixedAspectRatio = null;
  }

  isSettings () {
    return true;
  }
}
