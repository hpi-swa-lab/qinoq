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
      children: sequence.submorphs.map(morphInInteractive => this.morphInInteractiveToNode(morphInInteractive, sequence))
    };
  }

  morphInInteractiveToNode (morph, sequenceOfMorph) {
    return {
      name: morph.name,
      isCollapsed: true,
      visible: true,
      container: this.renderContainerFor(morph),
      children: [morph.submorphs.map(morphInInteractive => this.morphInInteractiveToNode(morphInInteractive, sequenceOfMorph)),
        sequenceOfMorph.getAnimationsForMorph(morph).map(animation => this.animationToNode(animation))].flat()
    };
  }

  animationToNode (animation) {
    return {
      name: `${animation.type} animation on ${animation.property}`,
      isCollapsed: true,
      visible: true,
      container: this.renderContainerFor(animation),
      children: animation.keyframes.map(keyframe => this.keyframeToNode(keyframe))
    };
  }

  keyframeToNode (keyframe) {
    return {
      name: keyframe.name,
      isCollapsed: false,
      visible: true,
      container: this.renderContainerFor(keyframe),
      children: []
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
}

class TreeItemContainer extends Morph {
  static get properties () {
    return {
      target: {},
      tree: {}
    };
  }

  toggleSelected (active) {
    this.getLabel().fontColor = active ? COLOR_SCHEME.ON_SECONDARY : COLOR_SCHEME.ON_SURFACE;
  }

  refresh () {
    if (!this.target) return;
    this.submorphs = [
      this.buildLabel()
    ];
    this.height = 20;
    this.opacity = this.target.visible ? 1 : 0.5;
  }

  getLabel () {
    return this.getSubmorphNamed('name label');
  }

  buildLabel () {
    const l = this.getSubmorphNamed('name label') || morph({
      type: 'label',
      name: 'name label',
      reactsToPointer: false,
      padding: rect(0, 0, 0, 0),
      acceptsDrops: false,
      fontSize: this.tree.fontSize
    });

    l.value = this.target.isAnimation ? this.getAnimationName() : this.target.name;
    return l;
  }

  getAnimationName () {
    return `${this.target.type} animation on ${this.target.property}`;
  }
}
