import { QinoqMorph } from './qinoq-morph.js';
import { COLOR_SCHEME } from './colors.js';
import { rect, pt } from 'lively.graphics';
import { connect } from 'lively.bindings';
import { filter, find, prewalk } from 'lively.lang/tree.js';
import { morph, VerticalLayout } from 'lively.morphic';
import { InteractiveTree, InteractiveTreeData } from './components/foreign/interactive-tree.js';
import { SearchField } from 'lively.components/widgets.js';

const CONSTANTS = {
  DEFAULT_HEIGHT: 300, // When the first editor is opened in a world, the extent of the Graph is not properly set for some reason
  SEARCH_FIELD_HEIGHT: 26,
  SEARCH_FIELD_BORDER_RADIUS: 3
};

export class InteractiveGraph extends QinoqMorph {
  static get properties () {
    return {
      name: {
        defaultValue: 'sequence graph'
      },
      borderColor: {
        defaultValue: COLOR_SCHEME.BACKGROUND_VARIANT
      },
      tree: {},
      _editor: {
        set (_editor) {
          this.setProperty('_editor', _editor);
          this.build();
        }
      },
      searchField: { }
    };
  }

  get isInteractiveGraph () {
    return true;
  }

  build () {
    this.removeConnections();
    this.layout = new VerticalLayout({
      resizeSubmorphs: true
    });
    this.buildSearchField();
    this.buildTree();
  }

  buildSearchField () {
    this.searchField = new SearchField(
      {
        fontColor: COLOR_SCHEME.ON_BACKGROUND,
        height: CONSTANTS.SEARCH_FIELD_HEIGHT,
        borderRadius: CONSTANTS.SEARCH_FIELD_BORDER_RADIUS,
        readOnly: true,
        halosEnabled: this.editor.debug
      });
    connect(this.searchField, 'searchInput', this, 'onFilterChange');
    this.addMorph(this.searchField);
  }

  buildTree (treeData = this.generateTreeData()) {
    if (!treeData) return;
    this.removeTree();
    this.tree = new QinoqTree({
      treeData: treeData,
      extent: pt(this.width, Math.max(CONSTANTS.DEFAULT_HEIGHT, this.height - CONSTANTS.SEARCH_FIELD_HEIGHT)),
      borderWidth: this.borderWidth,
      borderColor: this.borderColor,
      selectionFontColor: COLOR_SCHEME.ON_PRIMARY,
      nonSelectionFontColor: COLOR_SCHEME.ON_SURFACE,
      halosEnabled: this.editor.debug
    });

    this.addMorph(this.tree);
    this.searchField.readOnly = false;
  }

  removeTree () {
    if (this.tree) {
      this.tree.remove();
      this.tree = null;
    }

    // Remove searchField availability when there is no tree
    this.searchField.textString = '';
    this.searchField.readOnly = true;
  }

  removeConnections () {
    if (!this.interactive) return;
    this.interactive.thisAndAllSubmorphs.forEach(morph => {
      if (morph && morph.attributeConnections) {
        morph.attributeConnections.filter(connection =>
          connection.targetObj.isInteractiveGraph ||
          connection.targetMethodName == 'onInteractiveStructureUpdate')
          .forEach(connection => connection.disconnect());
      }
    });
  }

  onInteractiveStructureUpdate (changeSpecification = {}) {
    /**
     * Is called through connections, when the tree of the interactive is changed,
     * e.g. addition/removal of morphs, animations, sequences
     *
     * When a changeSpecification is provided, the tree does not need to be rebuilt but
     * can be patched.
     *
     * Keys in changeSpecification:
     * - parent: name in tree of the parent of the node that changed (parent of added or removed node)
     * - addedNode: object that was added to the interactive (e.g. a new sequence)
     * - removedNode: object that was removed from the tree. Sometimes the removed object is not available,
     *  e.g. when a morph was abandoned. The key is then set to null to symbolize a deleted not available item.
     *
     */
    const previousScroll = this.tree.scroll;

    const patchable = ('parent' in changeSpecification);

    if (!patchable) {
      this.rebuildTree();
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

  rebuildTree () {
    const previousTreeData = this.tree.treeData;
    const newTreeData = this.generateTreeData();

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
      container: this.buildContainerFor(interactive)
    };
  }

  onNameChange (item) {
    if (!this.tree) return;
    const node = find(this.tree.treeData.root, (node) => node.target == item, this.childGetter);
    if (!node) return;
    node.container.refresh();
  }

  sequenceToNode (sequence) {
    connect(sequence, 'addMorph', this, 'onInteractiveStructureUpdate', { converter: '(morph) => {return {addedNode : morph, parent: source.id}}' });
    connect(sequence, 'onMorphRemoval', this, 'onInteractiveStructureUpdate', { converter: '(morph) => {return {removedNode : morph, parent: source.id}}' });
    connect(sequence, 'onAnimationAddition', this, 'onInteractiveStructureUpdate', { converter: '(animation) => {return {addedNode : animation, parent: animation.target.id}}' });
    connect(sequence, 'onAnimationRemoval', this, 'onInteractiveStructureUpdate', { converter: '(animation) => {return {removedNode : animation, parent: animation.target.id}}' });
    connect(sequence, 'onKeyframeAddedInAnimation', this, 'onInteractiveStructureUpdate', { converter: '(change) => {return {addedNode : change.keyframe, parent: change.animation.name}}' });
    connect(sequence, 'onKeyframeRemovedInAnimation', this, 'onInteractiveStructureUpdate', { converter: '(change) => {return {removedNode : change.keyframe, parent: change.animation.name}}' });
    connect(sequence, 'name', this, 'onNameChange', { converter: '() => source' });
    return {
      name: sequence.id,
      target: sequence,
      isCollapsed: true,
      sequence: sequence,
      visible: true,
      container: this.buildContainerFor(sequence),
      children: this.generateChildrenOfNode(sequence)
    };
  }

  morphInInteractiveToNode (morph, sequenceOfMorph) {
    connect(morph, 'addMorph', this, 'onInteractiveStructureUpdate', { converter: '(morph) => {return {addedNode : morph, parent: source.id}}' });
    if (!morph.owner.isSequence) connect(morph, 'onAbandon', this, 'onInteractiveStructureUpdate', { converter: '(morph) => {return {removedNode : null, parent: source.id}}' });
    connect(morph, 'name', this, 'onNameChange', { converter: '() => source' });
    return {
      name: morph.id,
      target: morph,
      isCollapsed: true,
      sequence: sequenceOfMorph,
      visible: true,
      container: this.buildContainerFor(morph),
      children: this.generateChildrenOfNode(morph, { sequence: sequenceOfMorph })
    };
  }

  animationToNode (animation) {
    return {
      name: animation.name,
      target: animation,
      isCollapsed: true,
      visible: true,
      container: this.buildContainerFor(animation),
      children: this.generateChildrenOfNode(animation)
    };
  }

  keyframeToNode (keyframe) {
    return {
      name: keyframe.uuid,
      target: keyframe,
      isCollapsed: false,
      visible: true,
      container: this.buildContainerFor(keyframe),
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
  }

  buildContainerFor (item, embedded = true) {
    const container = new TreeItemContainer({
      tree: this,
      fill: COLOR_SCHEME.TRANSPARENT,
      target: item,
      _editor: this.editor
    });
    container.refresh();
    return container;
  }

  generateTreeData () {
    if (!this.interactive) return null;
    this.removeConnections();
    return new InteractiveTreeData(this.interactiveToNode(this.interactive));
  }

  onFilterChange () {
    if (!this.tree) return;
    const searchTerm = this.searchField.textString;

    if (searchTerm) {
      this.applyFilter();
    } else {
      this.resetFilter();
    }
  }

  applyFilter () {
    if (!this._collapseState) this._collapseState = new WeakMap(this.tree.treeData.asList().map(n => [n, n.isCollapsed]));
    this.tree.treeData.asList().forEach(node =>
      node.isCollapsed = this._collapseState.has(node) ? this._collapseState.get(node) : true);
    this.unHighlightAll();
    let matchingNodes = filter(this.tree.treeData.root, (node) => this.searchField.matches(node.container.label.textString), this.childGetter);
    matchingNodes.forEach(node => node.container.highlight());

    let nodesToUncollapse = [...matchingNodes];
    let visitedNodes = new Set();
    while (nodesToUncollapse.length > 0) {
      let uncollapseNode = nodesToUncollapse.shift();
      visitedNodes.add(uncollapseNode);
      this.tree.treeData.collapse(uncollapseNode, false);
      let parentNode = find(this.tree.treeData.root, (node) => node.children.includes(uncollapseNode), this.childGetter);
      if (parentNode && !visitedNodes.has(parentNode)) nodesToUncollapse.push(parentNode);
    }
    this.tree.update();
  }

  unHighlightAll () {
    prewalk(this.tree.treeData.root, (node) => node.container.unHighlight(), this.childGetter);
  }

  resetFilter () {
    if (!this._collapseState) return;
    this.unHighlightAll();
    this.tree.treeData.asList().forEach(node =>
      node.isCollapsed = this._collapseState.has(node) ? this._collapseState.get(node) : true);
    delete this._collapseState;
    this.tree.update();
  }

  get childGetter () {
    return (node) => node.children;
  }
}

class QinoqTree extends InteractiveTree {
  onHoverOut (event) {
    // prevent onHoverOut in InteractiveTree, which triggers selection
  }
}

class TreeItemContainer extends QinoqMorph {
  static get properties () {
    return {
      target: {},
      tree: {}
    };
  }

  async toggleSelected (active) {
    if (this._deserializing || !this.tree || !this.tree.tree) return;
    const { selectionFontColor, nonSelectionFontColor } = this.tree.tree;
    this.submorphs
      .filter(m => !m._isControlElement && m.styleClasses.includes('Label'))
      .forEach(m => {
        m.fontColor = active ? selectionFontColor : nonSelectionFontColor;
      });

    if (active) {
      await this.editor.goto(this.target);
    }
  }

  refresh () {
    if (!this.target) return;
    this.submorphs = [
      this.buildLabel()
    ];
    this.height = 20;
  }

  get label () {
    return this.getSubmorphNamed('name label');
  }

  buildLabel () {
    const label = this.label || morph({
      type: 'label',
      name: 'name label',
      reactsToPointer: false,
      padding: rect(0, 2, 0, 0),
      acceptsDrops: false,
      fontSize: this.tree.fontSize,
      fontColor: COLOR_SCHEME.ON_BACKGROUND
    });

    label.value = this.target.name;
    return label;
  }

  highlight () {
    this.label.fontWeight = 'bold';
  }

  unHighlight () {
    this.label.fontWeight = 'normal';
  }
}
