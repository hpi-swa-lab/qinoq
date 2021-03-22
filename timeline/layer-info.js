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

  get morph () {
    return this.timelineLayer.morph;
  }

  get isInGlobalTimeline () {
    return !!this.layer;
  }

  get interactive () {
    return this._editor.interactive;
  }

  initialize () {
    this.ui = {};
    this.name = this.name || (this.isInGlobalTimeline ? this.layer.name : this.morph.name);
    this.ui.label = new Label({
      textString: this.name
    });
    this.addMorph(this.ui.label);

    if (this.isInGlobalTimeline) {
      this.ui.hideButton = new Label({ name: 'hide button', tooltip: 'Hide layer in interactive', nativeCursor: 'pointer', reactsToPointer: true });
      this.ui.hideButton.onMouseUp = () => this.toggleLayerVisibility();
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
}
