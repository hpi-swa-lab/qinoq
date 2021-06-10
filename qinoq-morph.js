import { DeserializationAwareMorph } from './utilities/deserialization-morph.js';

// QinoqMorphs are components of the editor
export class QinoqMorph extends DeserializationAwareMorph {
  static get properties () {
    return {
      _editor: {},
      halosEnabled: {
        get () {
          return this.editor && this.editor.debug;
        }
      },
      acceptsDrops: {
        defaultValue: false
      },
      // Propagate events targeting this morph, which would target the eventPropagationTarget if this morph
      // would be removed. Only implemented for onContextMenu.
      eventPropagationTarget: {}
    };
  }

  get isQinoqMorph () {
    return true;
  }

  get editor () {
    return this._editor;
  }

  get interactive () {
    return this.editor.interactive;
  }

  onMouseDown (event) {
    super.onMouseDown(event);
    if (!event.targetMorph.mayBeSelected) $world.get('interactives editor').execCommand('deselect all items');
  }

  onContextMenu (event) {
    if (this.eventPropagationTarget) {
      if (event.targetMorph == this && event.targetMorphs[1] == this.eventPropagationTarget) {
        event.targetMorphs.shift();
        this.eventPropagationTarget.onContextMenu(event);
      }
    } else {
      super.onContextMenu(event);
    }
  }

  menuItems () {
    if (this.editor && this.editor.debug) {
      return super.menuItems();
    }
    return [];
  }
}
