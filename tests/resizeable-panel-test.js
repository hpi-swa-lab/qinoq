/* global it, describe, before, beforeEach, after, afterEach */
import { expect } from 'mocha-es6';
import { pt } from 'lively.graphics';
import { ResizeablePanel } from '../utilities/resizeable-panel.js';

let panel;

async function setup () {
  panel = new ResizeablePanel({
    name: 'panel',
    position: pt(140, 140),
    extent: pt(20, 20)
  });
  panel.resizers = true;
  $world.addMorph(panel);
  await panel.whenRendered();
}

function teardown () {
  panel.remove();
}

describe('resizeable panel', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('has no resizers by default', () => {
    panel.ui.resizers.north.visible = false;
    panel.ui.resizers.south.visible = false;
    panel.ui.resizers.east.visible = false;
    panel.ui.resizers.west.visible = false;
  });

  describe('has resizers', () => {
    it('that can be enabled and disabled together', () => {
      panel.resizers = true;
      panel.ui.resizers.north.visible = true;
      panel.ui.resizers.south.visible = true;
      panel.ui.resizers.east.visible = true;
      panel.ui.resizers.west.visible = true;

      panel.resizers = false;
      panel.ui.resizers.north.visible = false;
      panel.ui.resizers.south.visible = false;
      panel.ui.resizers.east.visible = false;
      panel.ui.resizers.west.visible = false;
    });

    it('that can be enabled and disabled individually', () => {
      panel.resizers = {
        north: true,
        south: true
      };
      panel.ui.resizers.north.visible = true;
      panel.ui.resizers.south.visible = true;
      panel.ui.resizers.east.visible = false;
      panel.ui.resizers.west.visible = false;

      panel.resizers = {
        north: false,
        west: true
      };
      panel.ui.resizers.north.visible = false;
      panel.ui.resizers.south.visible = true;
      panel.ui.resizers.east.visible = false;
      panel.ui.resizers.west.visible = true;

      panel.resizers = {
        east: false
      };
      panel.ui.resizers.north.visible = false;
      panel.ui.resizers.south.visible = true;
      panel.ui.resizers.east.visible = false;
      panel.ui.resizers.west.visible = true;
    });
  });

  describe('can be resized via resizer', () => {
    beforeEach(() => {
      panel.resizers = true;
    });

    it('in east direction', () => {
      expect(panel.ui.resizers.east.position).to.be.equal(pt(16, 0));

      $world.env.eventDispatcher.simulateDOMEvents({
        type: 'pointerdown',
        target: panel.ui.resizers.east,
        position: pt(156, 148)
      });

      $world.env.eventDispatcher.simulateDOMEvents({
        type: 'pointermove',
        target: panel.ui.resizers.east,
        position: pt(190, 148)
      });

      $world.env.eventDispatcher.simulateDOMEvents({
        type: 'pointermove',
        target: panel.ui.resizers.east,
        position: pt(210, 148)
      });

      $world.env.eventDispatcher.simulateDOMEvents({
        type: 'pointerup',
        target: panel.ui.resizers.east,
        position: pt(210, 148)
      });

      expect(panel.extent.x).to.be.equal(72);
      expect(panel.extent.y).to.be.equal(20);
      expect(panel.ui.resizers.north.extent.x).to.be.equal(72);
      expect(panel.ui.resizers.south.extent.x).to.be.equal(72);
      expect(panel.ui.resizers.east.position).to.be.equal(pt(68, 0));
    });

    it('in west direction', () => {
      expect(panel.ui.resizers.west.position).to.be.equal(pt(0, 0));

      $world.env.eventDispatcher.simulateDOMEvents({
        type: 'pointerdown',
        target: panel.ui.resizers.west,
        position: pt(142, 148)
      });

      $world.env.eventDispatcher.simulateDOMEvents({
        type: 'pointermove',
        target: panel.ui.resizers.west,
        position: pt(110, 148)
      });

      $world.env.eventDispatcher.simulateDOMEvents({
        type: 'pointermove',
        target: panel.ui.resizers.west,
        position: pt(90, 148)
      });

      $world.env.eventDispatcher.simulateDOMEvents({
        type: 'pointerup',
        target: panel.ui.resizers.west,
        position: pt(90, 148)
      });

      expect(panel.extent.x).to.be.equal(72);
      expect(panel.extent.y).to.be.equal(20);
      expect(panel.ui.resizers.north.extent.x).to.be.equal(72);
      expect(panel.ui.resizers.south.extent.x).to.be.equal(72);
      expect(panel.ui.resizers.west.position).to.be.equal(pt(0, 0));
    });

    it('in north direction', () => {
      expect(panel.ui.resizers.north.position).to.be.equal(pt(0, 0));

      $world.env.eventDispatcher.simulateDOMEvents({
        type: 'pointerdown',
        target: panel.ui.resizers.north,
        position: pt(148, 142)
      });

      $world.env.eventDispatcher.simulateDOMEvents({
        type: 'pointermove',
        target: panel.ui.resizers.north,
        position: pt(148, 130)
      });

      $world.env.eventDispatcher.simulateDOMEvents({
        type: 'pointermove',
        target: panel.ui.resizers.north,
        position: pt(148, 110)
      });

      $world.env.eventDispatcher.simulateDOMEvents({
        type: 'pointerup',
        target: panel.ui.resizers.north,
        position: pt(148, 90)
      });

      expect(panel.extent.x).to.be.equal(20);
      expect(panel.extent.y).to.be.equal(52);
      expect(panel.ui.resizers.west.extent.y).to.be.equal(52);
      expect(panel.ui.resizers.east.extent.y).to.be.equal(52);
      expect(panel.ui.resizers.north.position).to.be.equal(pt(0, 0));
    });

    it('in south direction', () => {
      expect(panel.ui.resizers.south.position).to.be.equal(pt(0, 16));

      $world.env.eventDispatcher.simulateDOMEvents({
        type: 'pointerdown',
        target: panel.ui.resizers.south,
        position: pt(148, 158)
      });

      $world.env.eventDispatcher.simulateDOMEvents({
        type: 'pointermove',
        target: panel.ui.resizers.south,
        position: pt(148, 170)
      });

      $world.env.eventDispatcher.simulateDOMEvents({
        type: 'pointermove',
        target: panel.ui.resizers.south,
        position: pt(148, 180)
      });

      $world.env.eventDispatcher.simulateDOMEvents({
        type: 'pointerup',
        target: panel.ui.resizers.south,
        position: pt(148, 180)
      });

      expect(panel.extent.x).to.be.equal(20);
      expect(panel.extent.y).to.be.equal(40);
      expect(panel.ui.resizers.west.extent.y).to.be.equal(40);
      expect(panel.ui.resizers.east.extent.y).to.be.equal(40);
      expect(panel.ui.resizers.south.position).to.be.equal(pt(0, 36));
    });
  });
});
