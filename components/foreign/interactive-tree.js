import { Tree, TreeData } from 'lively.components/tree.js';
import { morph, Icon, easings, Morph } from 'lively.morphic/index.js';
import { Color, Rectangle, rect, pt } from 'lively.graphics/index.js';
import { noUpdate } from 'lively.bindings/index.js';
import { arr, fun, tree } from 'lively.lang/index.js';

import { getClassName } from 'lively.serializer2';

export class InteractiveTreeContainer extends Morph {
  static get properties () {
    return {
      fill: {
        defaultValue: Color.transparent
      },
      isContainer: {
        get () {
          return true;
        }
      },
      tree: {

      },
      node: {
        readOnly: true,
        get () {
          const treeData = this.tree.treeData;
          return treeData && treeData.asList().find(m => m.container === this);
        }
      }
    };
  }

  onChildRemoved (child) {

  }

  onChildAdded (child) {

  }

  toggleSelected (active) {
    if (!this.tree) return;
    const { selectionFontColor, nonSelectionFontColor } = this.tree;
    this.submorphs.filter(m => !m._isControlElement && m.styleClasses.includes('Label')).forEach(m => {
      m.fontColor = active ? selectionFontColor : nonSelectionFontColor;
    });
  }

  onGrab (evt) {
    const tree = this.tree; const node = this.node;
    this.fill = Color.gray.withA(0.5);
    this.fontColor = tree.selectionFontColor;
    this.opacity = 0.8;
    super.onGrab(evt);
    if (!node) return;
    this.toggleSelected(false);
    tree.collapse(node);
    tree.treeData.parentNode(node).container.onChildRemoved(this);
    this._data = tree.treeData.remove(node);
    node.container.target.remove();
    tree.update(true);
  }

  wantsToBeDroppedOn (dropTarget) {
    this.showPreviewOn(dropTarget);
    return true;
  }

  showPreviewOn (target) {
    let tree;
    if (target.isContainer) {
      tree = target.tree;
    }
    if (target.isTree) {
      tree = target;
    }
    if (tree && tree.showDropPreviewFor) {
      tree.showDropPreviewFor(this);
    }
  }

  async insertAsChild (node) {
    this.tree.treeData.add(node._data, this.node, this.node.children[0]); // add as child of node
    this.tree.uncollapse(this.node);
    this.tree.treeData.remove(this.tree._previewNode);
    await this.tree.whenRendered();
    this.tree.update(true);
    this.onChildAdded(node);
  }

  onBeingDroppedOn (hand, recipient) {
    this.tree._dropInProgress = true;
    super.onBeingDroppedOn(hand, recipient);
    const after = () => {
      this.fill = Color.gray.withA(0.5);
      this.opacity = 1;
      this.tree._dropInProgress = false;
      this.tree.refresh();
    };

    if (recipient.isTree) {
      recipient.insertAtPlaceholder(this).then(after);
    } else if (recipient.isContainer) {
      recipient.insertAsChild(this).then(after);
    } else {
      after();
    }
  }
}

export class InteractiveTreeData extends TreeData {
  display (node) {
    // display the morph container of that node by default

    // in case it provides a "fast render" (i.e. text based) version
    // render that in case we are not about to interact with that node
    return [node.container || '<NO CONTAINER>', {}];
  }

  isCollapsed (node) { return node.isCollapsed; }
  collapse (node, bool) { node.isCollapsed = bool; }
  getChildren (node) {
    return node.isLeaf
      ? null
      : node.children.filter(n => n && (this.filterActive ? n.visible : true));
  }

  isLeaf (node) { return !node.children || node.children.filter(n => n && (this.filterActive ? n.visible : true)).length == 0; }

  add (node, parent = this.root, before) {
    if (!parent.children) parent.children = [];
    if (before) { arr.pushAt(parent.children, node, parent.children.indexOf(before)); } else parent.children.push(node);
    parent.isLeaf = false;
  }

  replace (nodeA, nodeB) {
    const parent = this.parentNode(nodeA);
    const idx = parent.children.indexOf(nodeA);
    parent.children[idx] = nodeB;
  }

  next (node) {
    const parent = this.parentNode(node);
    return parent && parent.children[parent.children.indexOf(node) + 1];
  }

  isBefore (nodeA, nodeB) {
    this.next(nodeA) === nodeB;
  }

  isAfter (nodeA, nodeB) {
    this.next(nodeB) === nodeA;
  }

  addBefore (node, next) {
    this.add(node, this.parentNode(next), next);
  }

  addAfter (node, prev) {
    const parent = this.parentNode(prev);
    const nextIndex = parent.children.indexOf(prev) + 1;
    this.add(node, parent, parent.children[nextIndex]);
  }

  remove (node) {
    const parent = this.parentNode(node);
    if (!parent) return;
    arr.remove(parent.children, node);
    if (parent.children == []) {
      parent.children = null;
    }
    return node;
  }

  async filter (iterator, maxDepth = 1) {
    await this.uncollapseAll((node, depth) => depth < maxDepth + 1);
    const active = this.filterActive;
    this.filterActive = false;
    this.asListWithIndexAndDepth(false).reverse().forEach(({ node, depth }) => {
      if (depth == 0) return (node.visible = true);
      node.visible = iterator(node);
      if (!node.visible && !node.isCollapsed && node.children.find(n => n.visible)) {
        node.visible = true;
        node.container.opacity = 0.5;
      } else node.container.opacity = 1;
      return node.visible;
    });
    this.filterActive = active;
  }
}

export class InteractiveTree extends Tree {
  update (force) {
    super.update(force);
    this.treeData && this.relayoutContainers();
    if (force) {
      this.embeddedMorphs.forEach(m => {
        if (m.isContainer) {
          m.fill = Color.transparent;
          m.fontFamily = this.fontFamily;
          m.fontSize = this.fontSize;
        }
      });
    }
  }

  onDrop (evt) {
    super.onDrop(evt);
    this.treeData.remove(this._previewNode);
    this.update(true);
  }

  onDropHoverIn (evt) {
    // prevents the default text behavior
  }

  onDropHoverUpdate (evt) {
    // prevent default
  }

  onDropHoverOut (evt) {
    // prevent default
  }

  async onHoverOut (evt) {
    super.onHoverOut(evt);
    if (this._previewNode && this._previewNode.container.world()) {
      this.treeData.remove(this._previewNode);
    }
    this.resetContainerSelection();
    this.update(true);
  }

  async insertAtPlaceholder (node) {
    const newParent = this.treeData.parentNode(this._previewNode);
    this.treeData.replace(this._previewNode, node._data);
    this.treeData.remove(this._previewNode);
    await this.whenRendered();
    this.update(true);
    newParent.container.onChildAdded(node);
  }

  scrollUpSlowly () {
    if (this._scrollingUp) return;
    this._scrollingUp = true;
    const scrollUp = async () => {
      if (this._scrollingUp && this.scroll.y > 0) {
        await this.animate({
          scroll: this.scroll.subXY(0, 30),
          duration: 300,
          easing: easings.linear
        });
        scrollUp();
      } else {
        this._scrollingUp = false;
      }
    };
    scrollUp();
  }

  scrollDownSlowly () {
    if (this._scrollingDown) return;
    this._scrollingDown = true;
    const scrollDown = async () => {
      if (this._scrollingDown && this.scroll.y < this.scrollExtent.y - this.height) {
        await this.animate({
          scroll: this.scroll.addXY(0, 30),
          duration: 300,
          easing: easings.linear
        });
        scrollDown();
      } else {
        this._scrollingDown = false;
      }
    };
    scrollDown();
  }

  stopScrollingSlowly () {
    this._scrollingUp = this._scrollingDown = false;
  }

  resetContainerSelection () {
    this.embeddedMorphs.forEach(m => {
      if (m.isContainer) m.fill = Color.transparent;
    });
  }

  showDropPreviewFor (target) {
    const borderDist = 4;
    const pos = this.localize(target.globalBounds().center());
    const docPos = this.textPositionFromPoint(pos);
    const nodes = this.treeData.asListWithIndexAndDepth(({ node }) =>
      node != this._previewNode && node.container.world());
    const { node } = nodes.find(node => node.i - 1 === docPos.row) || {};
    const hoveredContainer = node && node.container;
    const placeholder = this.ensurePlaceholder();
    const previewContainer = placeholder.container;
    const previewIsShown = !!previewContainer.world();

    const positionInFrame = pos.subPt(this.scroll).subPt(this.scrollbarOffset);

    if (positionInFrame.y < 10) {
      this.scrollUpSlowly();
    } else if (positionInFrame.y > this.height - 50) {
      this.scrollDownSlowly();
    } else {
      this.stopScrollingSlowly();
    }

    this.resetContainerSelection();

    if (!hoveredContainer) {
      if (nodes.length > docPos.row) {
        return;
      }
      if (arr.last(this.treeData.root.children) === placeholder) return;
      this.treeData.remove(placeholder);
      this.treeData.add(placeholder);
      this.update(true);
    }
    if (hoveredContainer) {
      const charBounds = this.textLayout.boundsFor(this, docPos);
      if (Math.abs(charBounds.top() - pos.y) < borderDist) {
        if (this.treeData.isBefore(placeholder, node)) return;
        this.treeData.remove(placeholder);
        this.treeData.addBefore(placeholder, node);
        this.update(true);
      } else if (Math.abs(charBounds.bottom() - pos.y) < borderDist &&
                 (node.isCollapsed || this.treeData.isLeaf(node))) {
        if (this.treeData.isAfter(placeholder, node)) return;
        this.treeData.remove(placeholder);
        this.treeData.addAfter(placeholder, node);
        this.update(true);
      } else {
        hoveredContainer.fill = Color.gray;
        if (!previewIsShown) return;
        this.treeData.remove(placeholder);
        this.update(true);
      }
    }
  }

  ensurePlaceholder () {
    const basicLineExtent = pt(this.width - 100, this.document.getLine(0).height);
    if (!this._previewNode) {
      this._previewNode = {
        container: morph({
          acceptsDrops: false,
          reactsToPointer: false,
          fill: Color.gray,
          borderRadius: 5
        }),
        isCollapsed: true,
        isLeaf: true
      };
    }
    this._previewNode.container.extent = basicLineExtent;
    return this._previewNode;
  }

  relayoutContainers () {
    const lineHeight = this.charBoundsFromTextPosition({
      row: 0, column: 6
    }).height;
    this.textLayout.charBoundsOfRow(this, 0).map(m => m.height);
    this.treeData.asListWithIndexAndDepth().forEach(({ node, i }) => {
      node.container.nativeCursor = 'grab';
      node.container.width = this.width - 25 - node.container.left;
      if (node.container.toggleSelected) { node.container.toggleSelected(i == this.selectedIndex); }
    });
    // eslint-disable-next-line no-self-assign
    this.anchors.forEach(a => a.position = a.position);
  }
}

export class SceneGraphTree extends InteractiveTree {
  static get properties () {
    return {
      target: {
        serialize: false
      }
    };
  }

  // this.reset()
  // this.onLoad()

  beforePublish () {
    this.submorphs = [];
    this.reset();
  }

  selectMorphInTarget (morph) {
    const node = this.treeData.asList().find(n => n.container.target === morph);
    if (node && this.selectedNode != node) this.selectPath(this.treeData.pathOf(node));
  }

  async onLoad () {
    await this.whenRendered();
    if (this.ownerChain().find(m => m.isComponent)) return;
    this.submorphs = [];
    await this.whenRendered();
    this.get('inspector').makeEditorVisible(true);
    this.get('inspector').makeEditorVisible(false);
    this.setTarget($world);
  }

  adjustProportions (evt) {
    const { y } = evt ? evt.state.dragDelta : { y: 0 };
    const inspector = this.get('inspector');
    const resizer = this.get('scene graph resizer');
    const selector = this.get('mode selector');
    const connectionTree = this.get('connections tree');

    this.height += y;
    inspector.height -= y;
    connectionTree.height -= y;
    resizer.top = this.bottom;
    resizer.left = 0;
    selector.top = resizer.bottom;
    connectionTree.top = inspector.top = selector.bottom + 5;
  }

  reset () {
    this.treeData = new InteractiveTreeData({
      children: [],
      container: morph()
    });
    this.get('inspector').targetObject = {};
    this.selectedNode = null;
    this.anchors.filter(a => a.id == null).forEach(a => this.removeAnchor(a));
  }

  // this.setTarget($world)
  // this.treeData

  setTarget (morph) {
    // scan the morph hierarchy, collapse all initially, create all nodes
    this.target = morph;
    this.treeData = this.getTreeFromSubmorphHierarchy(morph);
    this.uncollapse(this.treeData.root);
  }

  isNodeOutOfSync (node) {
    if (node === this._previewNode) return false; // preview does not represent a real morph
    if (node.container.nameNeedsUpdate) return true;
    const actualSubmorphs = node.container.target.submorphs.filter(m => !this.ignoreMorph(m));
    if (actualSubmorphs.length != node.children.length) return true;
    if (actualSubmorphs.map(m => m.name).join('') != node.children.map(m => m.target ? m.target.name : '').join('')) return true;
    return false;
  }

  getNewChildren (node) {
    const nodeSubmorphs = node.container.target.submorphs.map(m =>
      m.__scene_graph_target__ ? m.__scene_graph_target__() : m
    ).filter(m => !this.ignoreMorph(m));
    const newChildren = [];
    for (const i in nodeSubmorphs) {
      const m = nodeSubmorphs[i];
      const children = arr.without(node.children, this._previewNode);
      const existingChild = children.find(n => n.container.target.id == m.id);
      if (existingChild) newChildren[i] = existingChild;
      else newChildren[i] = this.readMorphHierarchy(m);
    }
    return newChildren;
  }

  refresh () {
    // update the treeData in place and rerender the tree
    if (this._updating || this._dropInProgress) return;
    let changes = false;
    tree.prewalk(this.treeData.root, (node) => {
      if (this.isNodeOutOfSync(node)) {
        changes = true;
        node.name = node.container.target.name;
        node.container.refresh(); // because the tree will only update structure
        node.children = this.getNewChildren(node);
      }
    }, node => node.children);
    this.update(changes);
  }

  // this.refresh()

  ignoreMorph (m) {
    if (!m.isMorph) return false;
    return m.isContainer || m.isWindow || m.getWindow() || m.isEpiMorph || m.isHand ||
      ['lively.halos'].includes(m.constructor[Symbol.for('lively-module-meta')].package.name) ||
      ['MorphicSideBar', 'SideBarToggler', 'UserFlap', 'Menu', 'CommentIndicator'].includes(m.constructor.name);
  }

  onDropHoverOut (evt) {
    const container = evt.hand.grabbedMorphs[0];
    const target = evt.hand.findDropTarget();
    if (target === this) return;
    if (target && target.ownerChain().includes(this)) return;
    if (container && container.isContainer) container.onDragOutside();
  }

  onDropHoverIn (evt) {
    const morph = evt.hand.grabbedMorphs[0];
    if (morph && !morph.isContainer) {
      $world.halos().forEach(h => h.remove());
      morph.remove();
      Object.assign(morph, evt.hand._grabbedMorphProperties.get(morph).pointerAndShadow);
      const container = this.renderContainerFor(morph, false);
      evt.hand.grab(container);
      container.leftCenter = pt(-20, 0);
    }
  }

  getTreeFromSubmorphHierarchy (morph) {
    return new InteractiveTreeData(this.readMorphHierarchy(morph));
  }

  readMorphHierarchy (morph) {
    return tree.mapTree(morph, (m, children) => {
      return {
        name: m.name,
        isCollapsed: true,
        container: this.renderContainerFor(m),
        visible: true,
        children
      };
    }, m => {
      return m.submorphs.filter(sub =>
        m.isWorld ? !this.ignoreMorph(sub) : true
      );
    });
  }

  // this.refresh()

  renderContainerFor (submorph = morph({ name: 'root' }), embedded = true) {
    const container = new MorphContainer({
      tree: this,
      fill: embedded ? Color.transparent : Color.gray.withA(0.5),
      fontColor: this.nonSelectionFontColor,
      fontFamily: this.fontFamily,
      target: submorph,
      opacity: submorph.visible ? 1 : 0.5
      // layout: new HorizontalLayout({ spacing: 2, align: 'center' }),
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
    return container;
  }

  collapseAll () {
    this.treeData.asList().forEach(node =>
      node != this.treeData.root ? (node.isCollapsed = true) : (node.isCollapsed = false));
  }

  async filterMorphs (term) {
    const searchTerm = term.tokens[0];

    if (!this.treeData.filterActive) {
      this._collapseState = new WeakMap(this.treeData.asList().map(n => [n, n.isCollapsed]));
    }

    this.treeData.filterActive = !!searchTerm;
    await this.treeData.filter(node => {
      const matches = !searchTerm || node.container.target.name.includes(searchTerm);
      node.container.highlightTerm(searchTerm);
      return matches;
    }, 3);
    if (!this.treeData.filterActive) {
      this.treeData.asList().forEach(node =>
        node.isCollapsed = this._collapseState.has(node) ? this._collapseState.get(node) : true);
    }
    this.refresh();
  }

  // this.setTarget(this.get('Rich Text Control'))
}

export class MorphContainer extends InteractiveTreeContainer {
  static get properties () {
    return {
      fontFamily: {
        after: ['submorphs'],
        derived: true,
        set (family) {
          this.submorphs[0].fontFamily = family;
        }
      },
      fontColor: {
        after: ['submorphs'],
        derived: true,
        set (color) {
          this.submorphs[0].fontColor = color;
        }
      },
      fontSize: {
        derived: true,
        set (size) {
          this.submorphs[0].fontSize = size;
        }
      },
      target: {
        serialize: false
      },
      dragTriggerDistance: {
        defaultValue: 15
      },
      borderRadius: { defaultValue: 4 },
      nameNeedsUpdate: {
        derived: true,
        get () {
          if (this.target) {
            if (this.submorphs[0].textString.slice(2, -1) != this.target.name) return true;
            if (this.connectionCount != (this.target.attributeConnections || []).length) return true;
          }
          return false;
        }
      },
      grabbable: { defaultValue: true },
      draggable: { defaultValue: true },
      submorphs: {
        after: ['target', 'tree'],
        initialize () {
          this.refresh();
        }
      },
      sideBar: {
        derived: true,
        get () {
          return this.owner.owner;
        }
      }
    };
  }

  async refresh () {
    const target = this.target;
    if (!target) return;
    this.reactsToPointer = true;
    this.dropShadow = false;
    let last;
    this.submorphs = [
      this.getLabel(),
      target.comments.length > 0 && this.getCommentControls(),
      target.layout && this.getLayoutControls(),
      this.getConnectionControls()
    ].filter(Boolean).map((m, i) => {
      m.fitIfNeeded();
      m.left = last ? last.right + 5 : 0;
      m.top = 2;
      last = m;
      return m;
    });
    this.height = 20;
    this.opacity = target.visible ? 1 : 0.5;
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

    const displayedName = l.textString.slice(2, -1);

    if (!displayedName || displayedName != this.target.name) { l.value = [...this.getIcon(this.target), ' ' + this.target.name + ' ']; }
    return l;
  }

  getIcon (target) {
    const klassIconMapping = {
      Morph: 'square',
      Ellipse: 'circle',
      Text: 'font',
      Label: 'tag',
      Polygon: 'draw-polygon',
      Path: 'bezier-curve',
      Image: 'image',
      Canvas: 'chess-board',
      HTMLMorph: 'code'
    };
    return Icon.textAttribute(klassIconMapping[getClassName(target)] || 'codepen', {
      paddingTop: '4px',
      fontSize: this.tree.fontSize - 2,
      opacity: 0.6
    });
  }

  getLayoutControls () {
    const layoutLabel = this.getSubmorphNamed('layout label') || morph({
      type: 'label',
      name: 'layout label',
      borderRadius: 3,
      acceptsDrops: false,
      padding: Rectangle.inset(4, 2, 4, 2),
      fill: Color.orange,
      fontColor: Color.white
    });

    layoutLabel._isControlElement = true;
    if (layoutLabel.textString != this.target.layout.name()) { layoutLabel.value = this.target.layout.name(); }
    return layoutLabel;
  }

  getCommentControls () {
    const commentLabel = this.getSubmorphNamed('comment label') || morph({
      type: 'label',
      name: 'comment label',
      tooltip: 'Open comment browser to browse all comments',
      borderRadius: 3,
      acceptsDrops: false,
      padding: Rectangle.inset(4, 2, 4, 2),
      fill: Color.rgb(241, 196, 15),
      fontColor: Color.black
    });

    commentLabel._isControlElement = true;
    const commentCountString = `${this.target.comments.length} comment${(this.target.comments.length == 1 ? '' : 's')}`;

    if (commentLabel.textString != commentCountString) { commentLabel.value = commentCountString; }
    return commentLabel;
  }

  getConnectionControls () {
    this.connectionCount = this.target.attributeConnections
      ? this.target.attributeConnections.filter(m => !m.targetObj.isHalo).length
      : 0;
    const connectionsLabel = this.getSubmorphNamed('connections label') || morph({
      acceptsDrops: false,
      borderRadius: 3,
      type: 'label',
      name: 'connections label',
      padding: Rectangle.inset(4, 2, 4, 2),
      nativeCursor: 'pointer',
      fill: Color.red,
      fontColor: Color.white
    });
    connectionsLabel._isControlElement = true;
    connectionsLabel.visible = !this.connectionHalo && !!this.connectionCount;
    const connectionState = this.connectionCount
      ? `${this.connectionCount} connection${this.connectionCount > 1 ? 's' : ''}`
      : 'Manage Connections';
    if (connectionsLabel.textString != connectionState) { connectionsLabel.value = connectionState; }
    return connectionsLabel;
  }

  highlightTerm (term) {
    const label = this.submorphs[0];
    const iconPart = label.textAndAttributes.slice(0, 2);
    const termToHighlight = label.textString.slice(1); // just remove the icon
    const inBetween = termToHighlight.split(term);
    if (inBetween.length === 1) {
      label.textAndAttributes = [...iconPart, inBetween[0]];
      return;
    }

    label.textAndAttributes = [...iconPart, ...arr.flatten(
      arr.interpose(
        inBetween.map(x => [x, {}]), [term, { fontWeight: '900' }]
      )
    )];
  }

  getClassControls () {

  }

  wantsToBeDroppedOn (target) {
    const res = super.wantsToBeDroppedOn(target);
    if (![target, ...target.ownerChain()].includes(this.tree)) this.onDragOutside();
    return res;
  }

  async onGrab (evt) {
    this.tree._dropInProgress = true;
    const globalTargetPosition = this.target.globalPosition;
    super.onGrab(evt);
    this._data.globalTargetPosition = globalTargetPosition;
    await this.whenRendered();
    if (!this.tree.fullContainsWorldPoint(this.globalPosition)) { this.onDragOutside(); } else this.leftCenter = pt(-20, 0);
    this.tree._dropInProgress = false;
  }

  // fixme: prevent concurrent calls of this method
  onDragOutside () {
    if (this._draggedOutside) return;
    this._draggedOutside = true;
    if (!this.queue) {
      this.queue = fun.createQueue('container-hover-queue', async (self, thenDo) => {
        const {
          opacity: originalOpacity,
          scale: originalScale
        } = self.target;
        self.target.opacity = 0;
        self.target.scale = 0.5;
        $world.halos().forEach(h => h.remove());
        $world.firstHand.grab(self.target);
        self.target._data = self._data;
        self.remove();
        self.target.position = pt(0, 0);
        await self.target.animate({
          opacity: originalOpacity,
          scale: originalScale,
          duration: 200
        });
        thenDo();
      });
    }
    this.queue.push(this);
  }

  onChildAdded (child) {
    const nextIndex = this.node.children.indexOf(child.node || child._data) + 1;
    const neighbor = this.node.children[nextIndex];
    child.target.remove();
    if (neighbor) {
      const actualIndex = this.target.submorphs.indexOf(neighbor.container.target);
      this.target.addMorphAt(child.target, actualIndex);
    } else { this.target.addMorph(child.target); }
    if (child._data.globalTargetPosition) { child.target.position = this.target.localize(child._data.globalTargetPosition); }
  }

  onChildRemoved (child) {
    // child.show()
  }

  toggleConnectionControl (active) {
    this.getSubmorphNamed('connections label').visible = active;
  }

  async toggleSelected (active) {
    super.toggleSelected(active);
    if (this._active === active) return;
    this._active = active;
    if (active && this.target && this.target.isMorph && this.world()) {
      await this.target.whenRendered();
      this.get('inspector').targetObject = this.target;
      this.get('connections tree').inspectConnectionsOf(this.target);
      if (this.connectionHalo) return;
      for (const halo of this.world().halos()) {
        if (halo.target === this.target) return;
        halo.remove();
      }
      noUpdate({
        sourceObj: this.world(),
        targetObj: this.sideBar,
        sourceAttribute: 'showHaloFor',
        targetAttribute: 'selectNode'
      }, () => this.world().showHaloFor(this.target));
    }
  }
}
