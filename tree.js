import { QinoqMorph } from './qinoq-morph.js';
import { COLOR_SCHEME } from './colors.js';

import { morph, Morph } from 'lively.morphic';
import { InteractiveTree, InteractiveTreeData } from 'InteractiveTree';
import { rect } from 'lively.graphics';

export class SequenceTree extends QinoqMorph {
  static get properties () {
    return {
      name: {
        defaultValue: 'sequence tree'
      },
      borderColor: {
        defaultValue: COLOR_SCHEME.BACKGROUND_VARIANT
      },
      tree: {
        after: ['_editor'],
        initialize () {
          this.buildTree();
        }
      }
    };
  }

  buildTree () {
    if (!this.treeData) return;
    if (this.tree) this.tree.remove();
    this.tree = new InteractiveTree({ treeData: this.treeData, extent: this.extent, borderWidth: this.borderWidth, borderColor: this.borderColor });

    this.addMorph(this.tree);
  }

  interactiveToNode (interactive) {
    return {
      name: interactive.name,
      isCollapsed: false,
      visible: true,
      children: interactive.sequences.map(sequence => this.sequenceToNode(sequence)),
      container: this.renderContainerFor(interactive)
    };
  }

  sequenceToNode (sequence) {
    return {
      name: sequence.name,
      isCollapsed: false,
      visible: true,
      container: this.renderContainerFor(sequence),
      children: sequence.submorphs.map(morphInInteractive => this.morphInInteractiveToNode(morphInInteractive))
    };
  }

  morphInInteractiveToNode (morph) {
    return {
      name: morph.name,
      isCollapsed: false,
      visible: true,
      container: this.renderContainerFor(morph),
      children: morph.submorphs.map(morphInInteractive => this.morphInInteractiveToNode(morphInInteractive))
    };
  }

  renderContainerFor (submorph = morph({ name: 'root' }), embedded = true) {
    const container = new TreeItemContainer({
      tree: this,
      fill: COLOR_SCHEME.TRANSPARENT,
      target: submorph,
      fontColor: COLOR_SCHEME.ON_SURFACE,
      opacity: submorph.visible ? 1 : 0.5
    });
    if (submorph._data) {
      container._data = submorph._data;
      submorph._data.container = container;
    } else {
      container._data = {
        name: submorph.name,
        isCollapsed: true,
        container,
        children: []
      };
    }
    container.refresh();
    return container;
  }

  get treeData () {
    if (!this.interactive) return;
    return new InteractiveTreeData(this.interactiveToNode(this.interactive));
  }

  toggleSelected (active) {
    if (!this.tree) return;
    const { selectionFontColor, nonSelectionFontColor } = this.tree;
    this.submorphs.filter(m => !m._isControlElement && m.styleClasses.includes('Label')).forEach(m => {
      m.fontColor = active ? selectionFontColor : nonSelectionFontColor;
    });
  }
}

class TreeItemContainer extends Morph {
  static get properties () {
    return {
      target: {},
      tree: {}
    };
  }

  refresh () {
    if (!this.target) return;
    this.submorphs = [
      this.getLabel()
    ];
    this.height = 20;
    this.opacity = this.target.visible ? 1 : 0.5;
  }

  getLabel () {
    const l = this.getSubmorphNamed('name label') || morph({
      type: 'label',
      name: 'name label',
      reactsToPointer: false,
      padding: rect(0, 0, 0, 0),
      acceptsDrops: false,
      fontSize: this.tree.fontSize
    });

    l.value = this.target.name;
    return l;
  }
}
