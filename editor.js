import { ProportionalLayout, HorizontalLayout, VerticalLayout, Icon, Label, Morph } from 'lively.morphic';
import { connect, disconnectAll, disconnect } from 'lively.bindings';
import { pt, Color } from 'lively.graphics';
import { COLOR_SCHEME } from './colors.js';
import { InteractiveMorphInspector } from './inspector.js';
import { resource } from 'lively.resources';
import { arr } from 'lively.lang';
import { GlobalTimeline, SequenceTimeline } from './timeline/index.js';
import { Sequence } from 'interactives-editor';
import { NumberWidget } from 'lively.ide/value-widgets.js';

const CONSTANTS = {
  EDITOR_WIDTH: 1000,
  EDITOR_HEIGHT: 550,
  PREVIEW_WIDTH: 533,
  SUBWINDOW_HEIGHT: 300,
  BORDER_WIDTH: 3,
  MENU_BAR_HEIGHT: 32,
  NEW_SEQUENCE_LENGTH: 125,
  SPACING: 3,
  SCROLL_POSITION_TOOLBAR_X_OFFSET: 360
};
CONSTANTS.SIDEBAR_WIDTH = (CONSTANTS.EDITOR_WIDTH - CONSTANTS.PREVIEW_WIDTH) / 2;

export class InteractivesEditor extends Morph {
  static get properties () {
    return {
      interactive: {
        set (interactive) {
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
      globalTimeline: {
      },
      inspector: {
      },
      interactiveScrollPosition: {
        defaultValue: 0
      }
    };
  }

  async initialize () {
    this.initializeLayout();
    await this.initializePanels();
    this.window = this.openInWindow({
      title: 'Interactives Editor',
      name: 'window for interactives editor'
    });
    connect(this.window, 'close', this, 'clearInteractive');
    return this;
  }

  async initializePanels () {
    this.sequenceOverview = this.addMorph(new SequenceOverview({ position: pt(0, 0) }));

    this.preview = new Preview();
    this.preview.initialize(this);
    this.addMorph(this.preview);

    this.inspector = new InteractiveMorphInspector({
      position: pt(CONSTANTS.PREVIEW_WIDTH + CONSTANTS.SIDEBAR_WIDTH, 0),
      extent: pt(CONSTANTS.SIDEBAR_WIDTH, CONSTANTS.SUBWINDOW_HEIGHT),
      borderWidth: CONSTANTS.BORDER_WIDTH
    });
    this.inspector.initialize(this);
    this.addMorph(this.inspector);

    this.menuBar = new MenuBar({ position: pt(0, CONSTANTS.SUBWINDOW_HEIGHT) });
    this.menuBar.initialize(this);
    this.addMorph(this.menuBar);

    this.globalTimeline = new GlobalTimeline({
      position: pt(0, CONSTANTS.SUBWINDOW_HEIGHT),
      extent: pt(CONSTANTS.EDITOR_WIDTH, CONSTANTS.EDITOR_HEIGHT - CONSTANTS.SUBWINDOW_HEIGHT)
    });
    this.globalTimeline.initialize(this);

    this.tabContainer = await resource('part://tabs/tabs').read();
    Object.assign(this.tabContainer, {
      position: pt(0, CONSTANTS.SUBWINDOW_HEIGHT + CONSTANTS.MENU_BAR_HEIGHT),
      extent: pt(CONSTANTS.EDITOR_WIDTH, CONSTANTS.EDITOR_HEIGHT - CONSTANTS.SUBWINDOW_HEIGHT),
      showNewTabButton: false,
      tabHeight: 28,
      visible: false
    });

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

  initializeInteractive (interactive) {
    if (!interactive) return;
    this.interactiveScrollPosition = interactive.scrollPosition; // make sure the scrollPosition is up to date when loading content to preview and globalTimeline
    this.preview.loadContent(interactive);
    this.globalTimeline.loadContent(interactive);

    this.tabContainer.visible = true;

    connect(this.interactive, 'scrollPosition', this, 'interactiveScrollPosition');
    connect(this, 'interactiveScrollPosition', this.interactive, 'scrollPosition');
    connect(this.interactive, 'name', this.globalTab, 'caption').update(this.interactive.name);
    connect(this.globalTab, 'caption', this.interactive, 'name');
    connect(this.globalTab, 'onSelectionChange', this, 'onDisplayedTimelineChange',
      { updater: '($update, selected) => {if (selected) $update(source.content)}' });
    connect(this.globalTab, 'onSelectionChange', this.menuBar, 'onGlobalTimelineTab');
    connect(this.globalTab, 'onSelectionChange', this.interactive, 'showAllSequences', {
      updater: '($update, selected) => {if (selected) $update()}'
    });
    connect(this.globalTab, 'onSelectionChange', this, 'onZoomChangeFromModel', {
      updater: '($update, selected) => {if (selected) $update(selected.zoomFactor * 100)}'
    });
    connect(this.globalTab, 'onSelectionChange', this.getTimelineFor(this.globalTab), 'onScrollChange', {
      updater: `($update, selected) => {
        if (selected) $update(editor.interactiveScrollPosition);
      }`,
      varMapping: { editor: this }
    }).update(this.globalTab.selected);
  }

  disbandTabConnections (tab) {
    disconnectAll(tab);
    if (this.getTimelineFor(tab)) disconnectAll(this.getTimelineFor(tab));
    if (this.getSequenceFor(tab)) disconnect(this.getSequenceFor(tab), 'name', tab, 'caption');
  }

  triggerInteractiveScrollPositionConnections () {
    this.interactiveScrollPosition = this.interactiveScrollPosition;
  }

  clearInteractive () {
    if (!this.interactive) return;
    disconnect(this, 'interactiveScrollPosition', this.interactive, 'scrollPosition');
    disconnect(this.interactive, 'name', this.globalTimeline, 'name');
    disconnect(this.interactive, 'scrollPosition', this.globalTimeline, 'interactiveScrollPosition');
    disconnect(this.interactive, 'scrollPosition', this, 'interactiveScrollPosition');
    disconnect(this.interactive, 'name', this.globalTab, 'caption');

    disconnect(this.globalTab, 'caption', this.interactive, 'name');
    disconnect(this.globalTab, 'onSelectionChange', this, 'onDisplayedTimelineChange');
    disconnect(this.globalTab, 'onSelectionChange', this.menuBar, 'onGlobalTimelineTab');
    disconnect(this.globalTab, 'onSelectionChange', this.interactive, 'showAllSequences');
    disconnect(this.globalTab, 'onSelectionChange', this.getTimelineFor(this.globalTab), 'onScrollChange');

    this.tabs.forEach(tab => { if (tab !== this.globalTab) tab.close(); });

    this.interactive.remove();
    this.inspector.deselect();
    this.preview.showEmptyPreviewPlaceholder();
  }

  async initializeSequenceView (sequence) {
    this.interactiveScrollPosition = sequence.start;

    const sequenceTab = this.getTabFor(sequence);
    if (sequenceTab) {
      sequenceTab.selected = true;
      return this.getTimelineFor(sequenceTab);
    }

    const timeline = this.initializeSequenceTimeline(sequence);
    const tab = await this.tabContainer.addTab(sequence.name, timeline);
    connect(sequence, 'name', tab, 'caption');
    connect(tab, 'caption', sequence, 'name');
    connect(tab, 'onSelectionChange', this, 'onDisplayedTimelineChange',
      { updater: '($update, selected) => {if (selected) $update(source.content)}' });
    connect(tab, 'onSelectionChange', this.interactive, 'showOnly', {
      updater: `($update, selected) => {
        if (selected) $update(sequence);
      }`,
      varMapping: { sequence: this.getSequenceFor(tab) }
    }).update(tab.selected);
    connect(tab, 'onSelectionChange', this.getTimelineFor(tab), 'onScrollChange', {
      updater: `($update, selected) => {
        if (selected) $update(editor.interactiveScrollPosition);
      }`,
      varMapping: { editor: this }
    }).update(tab.selected);
    connect(tab, 'onSelectionChange', this.menuBar, 'onSequenceView');
    connect(tab, 'onClose', tab, 'disbandTabConnections', { converter: '() => source' });
    connect(tab, 'onSelectionChange', this, 'onZoomChangeFromModel', {
      updater: '($update, selected) => {if (selected) $update(selected.zoomFactor * 100)}'
    });
  }

  initializeSequenceTimeline (sequence) {
    const sequenceTimeline = new SequenceTimeline({ position: pt(0, CONSTANTS.SUBWINDOW_HEIGHT), extent: pt(CONSTANTS.EDITOR_WIDTH, CONSTANTS.EDITOR_HEIGHT - CONSTANTS.SUBWINDOW_HEIGHT) });
    sequenceTimeline.initialize(this);
    sequenceTimeline.loadContent(sequence);
    return sequenceTimeline;
  }

  get keybindings () {
    return [
      { keys: 'Left', command: 'move scrollposition backwards' },
      { keys: 'Right', command: 'move scrollposition forward' }
    ].concat(super.keybindings);
  }

  get displayedTimeline () {
    return this.getTimelineFor(this.tabContainer.selectedTab);
  }

  get sequenceTimelines () {
    return this.tabs.filter(tab => tab !== this.globalTab).map(tab => tab.content);
  }

  get tabs () {
    return this.tabContainer.tabs;
  }

  getTabFor (sequence) {
    return this.tabs.find(tab => tab.content.isSequenceTimeline && tab.content.sequence === sequence);
  }

  getTimelineFor (tab) {
    if (!tab) {
      debugger;
    }
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
    const newSequence = new Sequence({ name: 'unnamed sequence' });

    // Assign a valid position to the new sequence
    const lastSequenceInFirstLayer = this.interactive.getLastSequenceInLayer(this.interactive.layers[0]);
    const startingPosition = lastSequenceInFirstLayer ? lastSequenceInFirstLayer.end : 0;
    newSequence.initialize(startingPosition, CONSTANTS.NEW_SEQUENCE_LENGTH);
    newSequence.layer = this.interactive.layers[0];
    this.interactive.addSequence(newSequence);

    this.globalTimeline.createTimelineSequenceInHand(newSequence);
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

  onZoomChangeFromInput (zoom) {
    if (this._updatingZoomFromModel) return;
    this._updatingZoomFromInput = true;
    this.displayedTimeline.zoomFactor = zoom;
    this._updatingZoomFromInput = false;
  }

  onZoomChangeFromModel (zoom) {
    if (this._updatingZoomFromInput) return;
    this._updatingZoomFromModel = true;
    this.ui.zoomInput.number = zoom;
    this._updatingZoomFromModel = false;
  }

  onDisplayedTimelineChange (newTimeline) {
    // Hook for listening to changes of the displayed timeline
    return newTimeline;
  }

  get commands () {
    return [
      {
        name: 'move scrollposition forward',
        doc: 'Move the scrollPosition of the interactive forward by one unit',
        exec: () => {
          if (this.interactive && !this.inputFieldFocused() && this.interactive.scrollPosition < this.interactive.length) {
            this.interactive.scrollPosition++;
            this.interactive.scrollOverlay.scroll = pt(0, this.interactive.scrollPosition); // Should be done in the setter, but it is not shown in the interactive without this line
          }
        }
      },
      {
        name: 'move scrollposition backwards',
        doc: 'Move the scrollPosition of the interactive back by one unit',
        exec: () => {
          if (this.interactive && !this.inputFieldFocused() && this.interactive.scrollPosition > 0) {
            this.interactive.scrollPosition--;
            this.interactive.scrollOverlay.scroll = pt(0, this.interactive.scrollPosition);
          }
        }
      }];
  }
}

class Preview extends Morph {
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
        defaultValue: 'Open an Interactive by grab-and-dropping it here.'
      },
      _editor: {}
    };
  }

  get editor () {
    return this._editor;
  }

  initialize (editor) {
    this._editor = editor;
    this.showEmptyPreviewPlaceholder();
  }

  onDrop (evt) {
    if (evt.type != 'morphicdrop') {
      return;
    }
    const grabbedMorph = arr.first(evt.hand.grabbedMorphs);
    if (grabbedMorph.isInteractive) {
      this.editor.interactive = grabbedMorph;
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
    this.withAllSubmorphsDo(submorph => {
      if (submorph !== this) submorph.remove();
    });

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
      submorphs: [icon, text]
    });

    this.addMorph(container);
  }
}

class MenuBar extends Morph {
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
        defaultValue: {}
      },
      _editor: {}
    };
  }

  get editor () {
    return this._editor;
  }

  initialize (editor) {
    this._editor = editor;
    this.ui.layoutContainer = new Morph({
      layout: new HorizontalLayout({
        spacing: CONSTANTS.SPACING,
        autoResize: true
      }),
      fill: COLOR_SCHEME.TRANSPARENT,
      borderWidth: 0
    });

    this.ui.scrollPositionToolbar = new Morph({
      layout: new HorizontalLayout({
        spacing: CONSTANTS.SPACING,
        autoResize: true
      }),
      name: 'scroll position toolbar',
      position: pt(CONSTANTS.SCROLL_POSITION_TOOLBAR_X_OFFSET, 0),
      extent: this.extent,
      fill: COLOR_SCHEME.TRANSPARENT,
      borderWidth: 0
    });

    this.addMorph(this.ui.layoutContainer);
    this.addMorph(this.ui.scrollPositionToolbar);

    this.buildIconButton({
      tooltip: 'Create a new sequence',
      action: () => {
        this.editor.createNewSequence();
      },
      icon: 'plus',
      name: 'addSequenceButton'
    });

    this.buildIconButton({
      tooltip: 'Go to start',
      action: () => {
        this.editor.interactiveScrollPosition = this.editor.currentSequence ? this.editor.currentSequence.start : 0;
      },
      icon: 'fast-backward',
      name: 'gotoStartButton',
      container: 'scrollPositionToolbar'
    });

    this.buildIconButton({
      tooltip: 'Go to previous sequence',
      action: () => {
        const sequence = this.editor.currentSequence;
        const nextPosition = sequence ? sequence.getAbsolutePosition(sequence.getPrevKeyframePosition(sequence.progress)) : this.editor.interactive.getPrevSequenceStart(this.editor.interactiveScrollPosition);
        if (nextPosition == undefined || isNaN(nextPosition)) return;
        this.editor.interactiveScrollPosition = nextPosition;
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
        const nextPosition = sequence ? sequence.getAbsolutePosition(sequence.getNextKeyframePosition(sequence.progress)) : this.editor.interactive.getNextSequenceStart(this.editor.interactiveScrollPosition);
        if (nextPosition == undefined || isNaN(nextPosition)) return;
        this.editor.interactiveScrollPosition = nextPosition;
      },
      icon: 'step-forward',
      name: 'gotoNextButton',
      container: 'scrollPositionToolbar'
    });

    this.buildIconButton({
      tooltip: 'Go to end',
      action: () => {
        this.editor.interactiveScrollPosition = this.editor.currentSequence ? this.editor.currentSequence.end : this.editor.interactive.length;
      },
      icon: 'fast-forward',
      name: 'gotoEndButton',
      container: 'scrollPositionToolbar'
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
      // fontColor: COLOR_SCHEME.ON_SURFACE
    });
    connect(this.ui.zoomInput, 'number', this.editor, 'onZoomChangeFromInput', { converter: '(percent) => percent/100' });
    connect(this.editor, 'onDisplayedTimelineChange', this.ui.zoomInput, 'number', { converter: '(timeline) => timeline.zoomFactor * 100' });
    this.ui.scrollPositionToolbar.addMorph(this.ui.zoomInput);
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
      // fontColor: COLOR_SCHEME.ON_SURFACE
    });
    connect(this.ui.scrollPositionInput, 'number', this, 'onScrollPositionInputChange');
    connect(this.editor, 'interactiveScrollPosition', this, 'onInteractiveScrollPositionChange');
    this.ui.scrollPositionToolbar.addMorph(this.ui.scrollPositionInput);
  }

  buildIconButton (options = {}) {
    const { action, tooltip, name, morphName = 'aButton', icon, container = 'layoutContainer' } = options;
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

  onScrollPositionInputChange (number) {
    if (!this._updatingFromScroll) {
      this._updatingFromInput = true;
      this.editor.interactiveScrollPosition = number;
      this._updatingFromInput = false;
    }
  }

  onInteractiveScrollPositionChange (scrollPosition) {
    if (!this._updatingFromInput) {
      this._updatingFromScroll = true;
      this.ui.scrollPositionInput.number = scrollPosition;
      this._updatingFromScroll = false;
    }
  }

  onGlobalTimelineTab () {
    this.ui.addSequenceButton.reactsToPointer = true;
    this.ui.addSequenceButton.fontColor = COLOR_SCHEME.SECONDARY;
    this.ui.gotoNextButton.tooltip = 'Go to next sequence';
    this.ui.gotoPrevButton.tooltip = 'Go to previous sequence';
  }

  onSequenceView () {
    this.ui.addSequenceButton.reactsToPointer = false;
    this.ui.addSequenceButton.fontColor = COLOR_SCHEME.ON_BACKGROUND_VARIANT;
    this.ui.gotoNextButton.tooltip = 'Go to next keyframe';
    this.ui.gotoPrevButton.tooltip = 'Go to previous keyframe';
  }
}

class SequenceOverview extends Morph {
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
      },
      editor: {}
    };
  }
}
