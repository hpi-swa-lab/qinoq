import { QinoqMorph } from './qinoq-morph.js';
import { COLOR_SCHEME } from './colors.js';

import { InteractiveTree, InteractiveTreeData } from 'InteractiveTree';
import { rect } from 'lively.graphics';
import { connect } from 'lively.bindings';
import { filter, find, prewalk } from 'lively.lang/tree.js';
import { morph } from 'lively.morphic';

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

  onInteractiveStructureUpdate (changeSpecification = {}) {
    const previousTreeData = this.tree.treeData;
    const previousScroll = this.tree.scroll;

    const patchable = ('parent' in changeSpecification);

    if (!patchable) {
      // Rebuild tree completly, apply collapse status
      const newTreeData = this.treeData;

      const collapsedNodeNames = filter(previousTreeData.root,
        (node) => node.isCollapsed == false,
        this.childGetter)
        .map(node => node.name);
      prewalk(newTreeData.root, (node) => {
        if (collapsedNodeNames.includes(node.name)) {
          newTreeData.collapse(node, false);
        }
      }, this.childGetter);
      this.buildTree(newTreeData);
    } else {
      const parent = find(this.tree.treeData.root, (node) => node.name === changeSpecification.parent, this.childGetter);
      if (!parent) return;
      if ('addedNode' in changeSpecification) {
        const addedNode = this.arbitraryToNode(changeSpecification.addedNode, parent);
        parent.children.push(addedNode);
      }
      if ('removedNode' in changeSpecification) {
        const removedNodeTarget = changeSpecification.removedNode;
        if (removedNodeTarget) {
          parent.children = parent.children.filter(node => node.target !== removedNodeTarget);
        } else { // connection from onAbandon does not supply the abandoned node
          parent.children = this.generateChildrenOfNode(parent.target);
        }
      }
      this.tree.update();
    }
    this.tree.scroll = previousScroll;
  }

  interactiveToNode (interactive) {
    connect(interactive, 'onSequenceAddition', this, 'onInteractiveStructureUpdate', { converter: '(sequence) => {return {addedNode : sequence, parent: source.id}}' });
    connect(interactive, 'onSequenceRemoval', this, 'onInteractiveStructureUpdate', { converter: '(sequence) => {return {removedNode : sequence, parent: source.id}}' });
    return {
      name: interactive.id,
      target: interactive,
      isCollapsed: false,
      visible: true,
      children: this.generateChildrenOfNode(interactive),
      container: this.renderContainerFor(interactive)
    };
  }

  sequenceToNode (sequence) {
    connect(sequence, 'addMorph', this, 'onInteractiveStructureUpdate', { converter: '(morph) => {return {addedNode : morph, parent: source.id}}' });
    connect(sequence, 'onMorphRemoval', this, 'onInteractiveStructureUpdate', { converter: '(morph) => {return {removedNode : morph, parent: source.id}}' });
    connect(sequence, 'onAnimationAddition', this, 'onInteractiveStructureUpdate', { converter: '(animation) => {return {addedNode : animation, parent: animation.target.id}}' });
    connect(sequence, 'onAnimationRemoval', this, 'onInteractiveStructureUpdate', { converter: '(animation) => {return {removedNode : animation, parent: animation.target.id}}' });
    return {
      name: sequence.id,
      target: sequence,
      isCollapsed: false,
      sequence: sequence,
      visible: true,
      container: this.renderContainerFor(sequence),
      children: this.generateChildrenOfNode(sequence)
    };
  }

  morphInInteractiveToNode (morph, sequenceOfMorph) {
    connect(morph, 'addMorph', this, 'onInteractiveStructureUpdate', { converter: '(morph) => {return {addedNode : morph, parent: source.id}}' });
    if (!morph.owner.isSequence) connect(morph, 'onAbandon', this, 'onInteractiveStructureUpdate', { converter: '(morph) => {return {removedNode : null, parent: source.id}}' });
    return {
      name: morph.id,
      target: morph,
      isCollapsed: true,
      sequence: sequenceOfMorph,
      visible: true,
      container: this.renderContainerFor(morph),
      children: this.generateChildrenOfNode(morph, { sequence: sequenceOfMorph })
    };
  }

  animationToNode (animation) {
    return {
      name: `${animation.type} animation on ${animation.property}`,
      target: animation,
      isCollapsed: true,
      visible: true,
      container: this.renderContainerFor(animation),
      children: this.generateChildrenOfNode(animation)
    };
  }

  keyframeToNode (keyframe) {
    return {
      name: keyframe.id,
      target: keyframe,
      isCollapsed: false,
      visible: true,
      container: this.renderContainerFor(keyframe),
      children: [],
      isLeaf: true
    };
  }

  arbitraryToNode (item, parent) {
    if (item.isKeyframe) return this.keyframeToNode(item);
    if (item.isAnimation) return this.animationToNode(item);
    if (item.isSequence) return this.sequenceToNode(item);
    if (item.isInteractive) return this.interactiveToNode(item);
    if (item.isMorph) return this.morphInInteractiveToNode(item, parent.sequence);
    console.warn('Could not match input to node!');
  }

  generateChildrenOfNode (item, additionalParams = {}) {
    if (item.isKeyframe) return [];
    if (item.isAnimation) return item.keyframes.map(keyframe => this.keyframeToNode(keyframe));
    if (item.isSequence) return item.submorphs.map(morphInInteractive => this.morphInInteractiveToNode(morphInInteractive, item));
    if (item.isInteractive) return item.sequences.map(sequence => this.sequenceToNode(sequence));
    if (item.isMorph) {
      return [item.submorphs.map(morphInInteractive => this.morphInInteractiveToNode(morphInInteractive, additionalParams.sequence)),
        additionalParams.sequence.getAnimationsForMorph(item).map(animation => this.animationToNode(animation))].flat();
    }
    console.warn('Could not match input to node!');
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

  get childGetter () {
    return (node) => node.children;
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
