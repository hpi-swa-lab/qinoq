/* global it, describe, beforeEach */
import { expect } from 'mocha-es6';
import { QinoqButton } from '../components/qinoq-button.js';
import { Morph } from 'lively.morphic';
import { Color } from 'lively.graphics';

function mockClickEventFor (target) {
  return {
    targetMorph: target,
    state: {
      clickedMorph: target,
      prevClick:
                {
                  clickCount: 0
                }
    }
  };
}
describe('Qinoq Button', () => {
  let button, buttonFilled, target, action, counter, mockEvent, mockEventFilled;

  beforeEach(() => {
    counter = 0;
    target = new Morph();
    target.addCommands([{
      name: 'action-command',
      exec: () => { counter = counter + 2; }
    }]);
    target.action = function () { counter++; };
    button = new QinoqButton({ target: target, action: 'action' });
    buttonFilled = new QinoqButton({ target: target, action: 'action', filled: true });
  });

  it('is a QinoqButton', () => {
    expect(button.isQinoqButton).to.be.ok;
  });

  it('executes a command when pressed', () => {
    button.command = 'action-command';
    expect(counter).to.be.equal(0);
    button.onMouseUp();
    expect(counter).to.be.equal(2);
  });

  it('executes action when pressed and no command is set', () => {
    expect(counter).to.be.equal(0);
    button.onMouseUp();
    expect(counter).to.be.equal(1);
    button.command = 'action-command';
    button.onMouseUp();
    expect(counter).to.be.equal(3);
  });

  it('changes style for duration of click', () => {
    button.onMouseDown(mockClickEventFor(button));
    expect(button.styleSet).to.be.equal('filled');
    button.onMouseUp();
    expect(button.styleSet).to.be.equal('unfilled');

    buttonFilled.onMouseDown(mockClickEventFor(buttonFilled));
    expect(buttonFilled.styleSet).to.be.equal('unfilled');
    buttonFilled.onMouseUp();
    expect(buttonFilled.styleSet).to.be.equal('filled');
  });

  it('can be disabled and enabled', () => {
    button.disable();
    expect(button.styleSet).to.be.equal('disabled');
    expect(button.reactsToPointer).to.be.equal(false);
    button.enable();
    expect(button.styleSet).to.be.equal('unfilled');
    expect(button.reactsToPointer).to.be.equal(true);

    buttonFilled.disable();
    buttonFilled.enable();
    expect(buttonFilled.styleSet).to.be.equal('filled');
  });

  it('has a hover effect on the border', () => {
    const defaultBorderColor = Color.rgb(button.borderColor.r, button.borderColor.g, button.borderColor.b);
    button.onHoverIn();
    expect(button.borderColor).to.not.be.deep.equal(defaultBorderColor);
    button.onHoverOut();
    const bc = Color.rgb(button.borderColor.r, button.borderColor.g, button.borderColor.b);
    expect(defaultBorderColor.equals(bc)).to.be.ok;
  });

  it('resets style if pressed and then hovered out without lifting mouse button', () => {
    button.onMouseDown(mockClickEventFor(button));
    button.onHoverIn();
    button.onHoverOut();
    expect(button.styleSet).to.be.equal('unfilled');

    buttonFilled.onMouseDown(mockClickEventFor(buttonFilled));
    buttonFilled.onHoverIn();
    buttonFilled.onHoverOut();
    expect(buttonFilled.styleSet).to.be.equal('filled');
  });
});
