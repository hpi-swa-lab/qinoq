import { QinoqMorph } from './qinoq-morph.js';
import { COLOR_SCHEME } from './colors.js';

import { morph, Morph } from 'lively.morphic';
import { InteractiveTree, InteractiveTreeData } from 'InteractiveTree';
import { rect } from 'lively.graphics';
import { connect } from 'lively.bindings';
import { filter, prewalk } from 'lively.lang/tree.js';

export class SequenceGraph extends QinoqMorph {
  static get properties () {
    return {
      name: {
        defaultValue: 'sequence graph'
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

  buildTree (treeData = this.treeData) {
    if (!treeData) return;
    this.removeTree();
    this.tree = new SequenceTree({ treeData: treeData, extent: this.extent, borderWidth: this.borderWidth, borderColor: this.borderColor });

    this.addMorph(this.tree);
  }

  removeTree () {
    if (this.tree) this.tree.remove();
  }

  removeConnections () {
    this.interactive.withAllSubmorphsDo(morph => {
      if (morph && morph.attributeConnections) {
        morph.attributeConnections.filter(connection => connection.targetObj == this || connection.targetMethodName == 'onInteractiveStructureUpdate').forEach(connection => connection.disconnect());
      }
    });
  }

  onInteractiveStructureUpdate () {
    const previousTreeData = this.tree.treeData;
    const newTreeData = this.treeData;
    const previousScroll = this.tree.scroll;
    const collapsedNodeNames = filter(previousTreeData.root,
      (node) => node.isCollapsed == false,
      (node) => node.children)
      .map(node => node.name);
    prewalk(newTreeData.root, (node) => {
      if (collapsedNodeNames.includes(node.name)) {
        newTreeData.collapse(node, false);
      }
    }, (node) => node.children);
    this.buildTree(newTreeData);
    this.tree.scroll = previousScroll;
  }

  interactiveToNode (interactive) {
    connect(interactive, 'onSequenceAddition', this, 'onInteractiveStructureUpdate');
    connect(interactive, 'onSequenceRemoval', this, 'onInteractiveStructureUpdate');
    return {
      name: `Interactive: ${interactive.name}`,
      isCollapsed: false,
      visible: true,
      children: interactive.sequences.map(sequence => this.sequenceToNode(sequence)),
      container: this.renderContainerFor(interactive)
    };
  }

  sequenceToNode (sequence) {
    connect(sequence, 'addMorph', this, 'onInteractiveStructureUpdate');
    connect(sequence, 'onMorphRemoval', this, 'onInteractiveStructureUpdate');
    connect(sequence, 'onAnimationAddition', this, 'onInteractiveStructureUpdate');
    connect(sequence, 'onAnimationRemoval', this, 'onInteractiveStructureUpdate');
    return {
      name: `Sequence: ${sequence.name}`,
      isCollapsed: false,
      visible: true,
      container: this.renderContainerFor(sequence),
      children: sequence.submorphs.map(morphInInteractive => this.morphInInteractiveToNode(morphInInteractive, sequence))
    };
  }

  morphInInteractiveToNode (morph, sequenceOfMorph) {
    connect(morph, 'addMorph', this, 'onInteractiveStructureUpdate');
    connect(morph, 'onAbandon', this, 'onInteractiveStructureUpdate');
    return {
      name: `Morph: ${morph.name}`,
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
      children: [],
      isLeaf: true
    };
  }

  renderContainerFor (submorph = morph({ name: 'root' }), embedded = true) {
    const container = new TreeItemContainer({
      tree: this,
      fill: COLOR_SCHEME.TRANSPARENT,
      target: submorph,
      fontColor: COLOR_SCHEME.ON_SURFACE,
      opacity: submorph.visible ? 1 : 0.5,
      _editor: this.editor
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
    if (!this.interactive) return null;
    this.removeConnections();
    return new InteractiveTreeData(this.interactiveToNode(this.interactive));
  }
}

class SequenceTree extends InteractiveTree {
  onHoverOut (event) {
    // prevent default
  }
}

class TreeItemContainer extends QinoqMorph {
  static get properties () {
    return {
      target: {},
      tree: {}
    };
  }

  toggleSelected (active) {
    this.getLabel().fontColor = active ? COLOR_SCHEME.ON_SECONDARY : COLOR_SCHEME.ON_SURFACE;
    if (active) {
      this.editor.goto(this.target);
    }
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
