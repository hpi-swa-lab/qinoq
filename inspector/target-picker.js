import { Button } from 'lively.components';
import { rect, pt } from 'lively.graphics';
import { Icon } from 'lively.morphic';
import { InteractiveMorphSelector } from 'lively.halos';
import { Sequence } from '../interactive.js';
import { CONSTANTS } from './constants.js';

export class TargetPicker extends Button {
  static get properties () {
    return {
      name: {
        defaultValue: 'target picker'
      },
      padding: {
        defaultValue: rect(2, 2, 0, 0)
      },
      tooltip: {
        defaultValue: 'Choose Inspection Target'
      },
      inspector: {
        async initialize () {
          this.initializeUI();
        }
      }
    };
  }

  async initializeUI () {
    // opacity is only relevant for optical reasons so one does not see the awaited changes
    this.opacity = 0;
    this.master = { auto: 'styleguide://System/buttons/light' };
    await this.whenRendered();
    this.label = Icon.textAttribute('crosshairs');
    await this.whenRendered();
    this.extent = pt(CONSTANTS.TARGET_PICKER_DIAMETER, CONSTANTS.TARGET_PICKER_DIAMETER);
    this.borderRadius = CONSTANTS.TARGET_PICKER_BORDER_RADIUS;
    this.opacity = 1;
  }

  async onMouseUp (event) {
    this.inspector.targetMorph = await InteractiveMorphSelector.selectMorph($world, null, morph => Sequence.getSequenceOfMorph(morph) && Sequence.getSequenceOfMorph(morph).focused);
  }
}
