import { VerticalLayout, Icon, Label } from 'lively.morphic';
import { CONSTANTS } from './constants.js';
import { pt, rect } from 'lively.graphics';
import { COLOR_SCHEME } from '../colors.js';
import { Sequence } from '../index.js';
import { QinoqMorph } from '../qinoq-morph.js';
import { QinoqButton } from '../components/qinoq-button.js';

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
      spacing: 4,
      autoResize: false,
      orderByIndex: true
    });

    this.ui.label = new Label({
      textString: this.name,
      reactsToPointer: false
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
        defaultValue: CONSTANTS.LAYER_HEIGHT
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
    menuOptions.push(['❌ Remove layer', async () => await this.promptRemoveLayer()]);

    return menuOptions;
  }
}

export class SequenceTimelineLayerInfo extends TimelineLayerInfo {
  static get properties () {
    return {
      height: {
        defaultValue: CONSTANTS.SEQUENCE_LAYER_HEIGHT
      }
    };
  }

  get isInSequenceTimeline () {
    return true;
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

  menuItems () {
    const menuOptions = [];
    menuOptions.push(['🔍 Select morph in inspector', () => {
      this.editor.ui.inspector.targetMorph = this.morph;
      if (this.morph.world()) this.morph.show();
    }]);
    menuOptions.push(['✏️ Rename morph', async () => await this.promptMorphName()]);
    menuOptions.push(['❌ Remove morph', async () => await this.abandonMorph()]);
    menuOptions.push(['▭ Show halo for morph', () => $world.showHaloFor(this.morph)]);
    if (this.timelineLayer.isOverviewLayer) {
      menuOptions.push(['🗐 Copy Morph', () => this.editor.copyMorph(this.morph)]);
      menuOptions.push(['✂️ Cut Morph', () => this.editor.cutMorph(this.morph)]);
      if (this.editor.clipboard.containsMorph) menuOptions.push(['✏️ Paste Morph', () => this.editor.pasteMorphFromClipboard()]);
      if (this.timelineLayer.mayBeExpanded) {
        menuOptions.push(['➕ Expand view', () => this.timelineLayer.isExpanded = true]);
      } else if (this.timelineLayer.isExpanded) {
        menuOptions.push(['➖ Collapse view', () => this.timelineLayer.isExpanded = false]);
      }
    }
    return menuOptions;
  }
}
