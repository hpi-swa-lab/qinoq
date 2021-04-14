import { Morph, VerticalLayout, Icon, Label } from 'lively.morphic';
import { CONSTANTS } from './constants.js';
import { pt } from 'lively.graphics';

export class TimelineLayerInfo extends Morph {
  static get properties () {
    return {
      timelineLayer: {
        set (timelineLayer) {
          this.setProperty('timelineLayer', timelineLayer);
          this._editor = timelineLayer.editor;
        }
      },
      ui: {
        after: ['timelineLayer', 'name'],
        initialize () {
          this.initialize();
        }
      },
      _editor: { },
      height: {
        defaultValue: CONSTANTS.LAYER_HEIGHT
      }
    };
  }

  get layer () {
    return this.timelineLayer.layer;
  }

  get timeline () {
    return this.timelineLayer.timeline;
  }

  get morph () {
    return this.timelineLayer.morph;
  }

  get isInGlobalTimeline () {
    return !!this.layer;
  }

  get isInSequenceTimeline () {
    return !this.isInGlobalTimeline;
  }

  get interactive () {
    return this.editor.interactive;
  }

  get editor () {
    return this._editor;
  }

  initialize () {
    this.ui = {};
    this.name = this.name || (this.isInGlobalTimeline ? this.layer.name : this.morph.name);
    this.ui.label = new Label({
      textString: this.name,
      reactsToPointer: false
    });
    this.addMorph(this.ui.label);

    if (this.isInGlobalTimeline) {
      this.ui.hideButton = new Label({ name: 'hide button', tooltip: 'Hide layer in interactive', nativeCursor: 'pointer', reactsToPointer: true });
      this.ui.hideButton.onMouseUp = (evt) => {
        // domEvt.button 0 is left click, the DOM event has a wrong buttons property, so evt.leftMouseButtonPressed() doesn't work currently
        if (evt.domEvt.button == 0) this.toggleLayerVisibility();
      };
      Icon.setIcon(this.ui.hideButton, 'eye');

      this.addMorph(this.ui.hideButton);
    }

    this.layout = new VerticalLayout({ spacing: 4, autoResize: false });
    this.restyleAfterHideToggle();
  }

  toggleLayerVisibility () {
    this.layer.hidden = !this.layer.hidden;
    this.restyleAfterHideToggle();
  }

  restyleAfterHideToggle () {
    if (!this.layer) return;
    Icon.setIcon(this.ui.hideButton, this.layer.hidden ? 'eye-slash' : 'eye');
    this.ui.hideButton.tooltip = this.layer.hidden ? 'Show layer in interactive' : 'Hide layer in interactive';
    this.interactive.redraw();
    this.timelineLayer.toggleHiddenStyle();
  }

  addCollapseToggle () {
    this.ui.collapseButton = new Label({ name: 'collapseButton', position: pt(10, 10), fontSize: 15, nativeCursor: 'pointer' });
    Icon.setIcon(this.ui.collapseButton, 'caret-right');
    this.ui.collapseButton.onMouseUp = () => { this.timelineLayer.isExpanded = !this.timelineLayer.isExpanded; };
    this.addMorph(this.ui.collapseButton);
  }

  restyleCollapseToggle () {
    Icon.setIcon(this.ui.collapseButton, this.timelineLayer.isExpanded ? 'caret-down' : 'caret-right');
  }

  async promptLayerName () {
    const newName = await $world.prompt('Layer name:', { input: this.layer.name });
    if (newName) {
      this.layer.name = newName;
      this.timelineLayer.name = newName;
      this.ui.label.textString = newName;
    }
  }

  async removeLayer () {
    const accept = await $world.confirm('Do you want to delete this layer?\nThis will remove all sequences in the layer.');
    if (accept) {
      this.interactive.removeLayer(this.layer);
      this.timeline.abandonTimelineLayer(this.timelineLayer);
    }
  }

  menuItems (evt) {
    const menuOptions = [];
    if (this.isInGlobalTimeline) {
      menuOptions.push(['✏️ Rename Layer', async () => await this.promptLayerName()]);
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
      menuOptions.push(['❌ Remove layer', async () => await this.removeLayer()]);
    }
    if (this.isInSequenceTimeline) {
      menuOptions.push(['🔍 Select morph', () => {
        this.editor.inspector.targetMorph = this.morph;
        if (this.morph.world()) this.morph.show();
      }]);
      if (this.timelineLayer.isOverviewLayer) {
        if (!this.timelineLayer.isExpanded && this.timelineLayer.mayBeExpanded) {
          menuOptions.push(['➕ Expand view', () => this.timelineLayer.isExpanded = true]);
        } else if (this.timelineLayer.isExpanded) {
          menuOptions.push(['➖ Collapse view', () => this.timelineLayer.isExpanded = false]);
        }
      }
    }
    return menuOptions;
  }
}
