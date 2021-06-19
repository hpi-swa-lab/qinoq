import { VerticalLayout, Label } from 'lively.morphic';
import { COLOR_SCHEME } from '../colors.js';
import { QinoqMorph } from '../qinoq-morph.js';
import { QinoqButton } from '../components/qinoq-button.js';
import { TIMELINE_CONSTANTS } from './constants.js';

export class TimelineLayerInfo extends QinoqMorph {
  static get properties () {
    return {
      timelineLayer: {
        set (timelineLayer) {
          this.setProperty('timelineLayer', timelineLayer);
          if (!this._deserializing) this._editor = timelineLayer.editor;
        }
      },
      ui: {
        after: ['timelineLayer', 'name'],
        initialize () {
          if (!this._deserializing) this.initialize();
        }
      }
    };
  }

  get timeline () {
    return this.timelineLayer.timeline;
  }

  get morph () {
    return this.timelineLayer.morph;
  }

  initialize () {
    this.ui = {};
    this.layout = new VerticalLayout({
      autoResize: false,
      orderByIndex: true
    });

    this.ui.label = new Label({
      textString: this.name,
      reactsToPointer: false,
      fontColor: COLOR_SCHEME.ON_SURFACE
    });
    this.addMorphAt(this.ui.label, 0);
    this.updateLabel();
  }

  updateLabel () {
    this.ui.label.textString = this.name;
  }
}

export class GlobalTimelineLayerInfo extends TimelineLayerInfo {
  static get properties () {
    return {
      height: {
        defaultValue: TIMELINE_CONSTANTS.GLOBAL_LAYER_HEIGHT
      }
    };
  }

  get layer () {
    return this.timelineLayer.layer;
  }

  get isInGlobalTimeline () {
    return true;
  }

  initialize () {
    super.initialize();
    this.initializeVisibilityButton();
  }

  updateLabel () {
    this.name = this.layer.name;
    super.updateLabel();
  }

  initializeVisibilityButton () {
    this.ui.hideButton = new QinoqButton({
      name: 'hide button',
      tooltip: 'Hide layer in interactive',
      target: this,
      action: 'toggleLayerVisibility',
      icon: 'eye'
    });
    this.addMorphAt(this.ui.hideButton, 1);
    this.restyleAfterHideToggle();
  }

  toggleLayerVisibility () {
    this.layer.hidden = !this.layer.hidden;
    this.restyleAfterHideToggle();
  }

  restyleAfterHideToggle () {
    if (!this.layer) return;
    this.ui.hideButton.icon = this.layer.hidden ? 'eye-slash' : 'eye';
    this.ui.hideButton.active = this.layer.hidden;
    this.ui.hideButton.tooltip = this.layer.hidden ? 'Show layer in interactive' : 'Hide layer in interactive';
    this.interactive.redraw();
    this.timelineLayer.toggleHiddenStyle();
  }

  async promptLayerName () {
    const newName = await $world.prompt('Layer name:', { input: this.layer.name });
    if (newName) {
      this.layer.name = newName;
      this.timelineLayer.updateTooltip();
      this.updateLabel();
    }
  }

  async promptRemoveLayer () {
    const accept = await $world.confirm('Do you want to delete this layer?\nThis will remove all sequences in the layer.');
    if (accept) {
      this.removeLayer();
    }
  }

  removeLayer () {
    this.interactive.removeLayer(this.layer);
    this.timeline.abandonTimelineLayer(this.timelineLayer);
  }

  menuItems () {
    const menuOptions = [['✏️ Rename Layer', async () => await this.promptLayerName()]];
    if (this.layer.hidden) {
      menuOptions.push(['🐵 Show Layer', () => this.toggleLayerVisibility()]);
    }
    if (!this.layer.hidden) {
      menuOptions.push(['🙈 Hide Layer', () => this.toggleLayerVisibility()]);
    }
    if (this.timelineLayer.index > 0) {
      menuOptions.push(['⬆️ Move layer up', () => this.timelineLayer.moveLayerBy(-1)]);
    }
    if (this.timelineLayer.index < this.timelineLayer.highestIndex) {
      menuOptions.push(['⬇️ Move layer down', () => this.timelineLayer.moveLayerBy(1)]);
    }
    menuOptions.push(['🗑️ Remove layer', async () => await this.promptRemoveLayer()]);

    return menuOptions;
  }
}

export class SequenceTimelineLayerInfo extends TimelineLayerInfo {
  static get properties () {
    return {
      height: {
        defaultValue: TIMELINE_CONSTANTS.SEQUENCE_LAYER_HEIGHT
      }
    };
  }

  get isInSequenceTimeline () {
    return true;
  }

  get sequence () {
    return this.timeline.sequence;
  }

  updateLabel () {
    if (this.timelineLayer.isOverviewLayer) {
      this.name = this.morph.name;
    } else if (this.timelineLayer.animation) {
      this.name = this.timelineLayer.animation.property;
    }
    super.updateLabel();
  }

  onNumberOfKeyframeLinesInLayerChanged (containsKeyframes) {
    if (!containsKeyframes) this.disableCollapseButton();
    else this.enableCollapseButton();
  }

  addCollapseToggle () {
    this.ui.collapseButton = new QinoqButton({
      fontSize: 15,
      name: 'collapse button',
      target: this.timelineLayer,
      action: 'toggleExpand',
      icon: 'caret-right'
    });
    this.addMorphAt(this.ui.collapseButton, 1);
    this.disableCollapseButton();
  }

  enableCollapseButton () {
    this.ui.collapseButton.enable();
    this.ui.collapseButton.tooltip = 'Expand to see animated properties';
  }

  disableCollapseButton () {
    this.ui.collapseButton.disable();
    this.ui.collapseButton.tooltip = 'Expansion only available for morphs with keyframes';
  }

  restyleCollapseToggle () {
    this.ui.collapseButton.icon = this.timelineLayer.isExpanded ? 'caret-down' : 'caret-right';
  }

  async abandonMorph () {
    const accept = await $world.confirm('Do you want to delete this morph?\n This can not be undone.');
    if (accept) {
      this.editor.removeMorphFromInteractive(this.morph);
    }
  }

  async promptMorphName () {
    const newName = await $world.prompt('Morph name:', { input: this.morph.name });
    if (newName) {
      this.morph.name = newName;
    }
  }

  bringMorphToFront () {
    this.sequence.addMorphAt(this.morph, this.sequence.submorphs.length);
    this.timeline.reorderLayers();
  }

  bringMorphForward () {
    this.sequence.addMorphAt(this.morph, this.sequence.submorphs.indexOf(this.morph) + 2);
    this.timeline.reorderLayers();
  }

  sendMorphBackward () {
    this.sequence.addMorphAt(this.morph, this.sequence.submorphs.indexOf(this.morph) - 1);
    this.timeline.reorderLayers();
  }

  sendMorphToBack () {
    this.sequence.addMorphBack(this.morph);
    this.timeline.reorderLayers();
  }

  menuItems () {
    const menuOptions = [];
    menuOptions.push(['🔍 Select morph in inspector', () => {
      this.editor.ui.inspector.targetMorph = this.morph;
      if (this.morph.world()) this.morph.show();
    }]);
    menuOptions.push(['✏️ Rename morph', async () => await this.promptMorphName()]);
    menuOptions.push(['🗑️ Remove morph', async () => await this.abandonMorph()]);
    menuOptions.push(['⏹️ Show halo for morph', () => $world.showHaloFor(this.morph)]);
    if (this.timelineLayer.isOverviewLayer) {
      menuOptions.push(['👥 Copy Morph', () => this.editor.copyMorph(this.morph)]);
      menuOptions.push(['✂️ Cut Morph', () => this.editor.cutMorph(this.morph)]);
      if (this.editor.clipboard.containsMorph) menuOptions.push(['✏️ Paste Morph', () => this.editor.pasteMorphFromClipboard()]);
      menuOptions.push(['🍔 Order', [
        ['Bring to front', () => this.bringMorphToFront()],
        ['Bring forward', () => this.bringMorphForward()],
        ['Send backward', () => this.sendMorphBackward()],
        ['Send to back', () => this.sendMorphToBack()]
      ]]);
      if (this.timelineLayer.mayBeExpanded) {
        menuOptions.push(['➕ Expand view', () => this.timelineLayer.isExpanded = true]);
      } else if (this.timelineLayer.isExpanded) {
        menuOptions.push(['➖ Collapse view', () => this.timelineLayer.isExpanded = false]);
      }
    }
    return menuOptions;
  }
}
