export class WebAnimation {
  constructor (targetMorph, property) {
    this.target = targetMorph;
    this.property = property;
    this.keyframes = [];
    this.webAnimation = null;
  }

  // Accepts EXACTLY two keyframes, one for the beginning and one for the end of the animation.
  // Provide Keyframes in the correct order.
  addKeyframes (keyframes) {
    this.keyframes = keyframes;
    this._keyframes = this.generateCSSKeyframes();
  }

  generateCSSKeyframes () {
    debugger;
    switch (this.property) {
      case 'position':
        const xOffset = this.keyframes[1].value.x - this.keyframes[0].value.x;
        const yOffset = this.keyframes[1].value.y - this.keyframes[0].value.y;
        return [
          { transform: 'translate(0px,0px)' }, // beginning
          { transform: `translate(${xOffset}px,${yOffset}px)` } // end
        ];
        this.translate = 'add';
        break;
      case 'scale':
        return [
          { transform: `scale(${this.keyframes[0].value})` }, // beginning
          { transform: `scale(${this.keyframes[1].value})` } // end
        ];
        this.translate = 'add';
        break;
      case 'fill':
        const c1 = this.keyframes[0].value;
        const c2 = this.keyframes[1].value;
        return [
          { backgroundColor: `${this.keyframes[0].value}` }, // beginning
          { backgroundColor: `${this.keyframes[1].value}` } // end
        ];
        this.translate = 'add';
        break;
      default:
        throw 'Provide Valid Property to Animate';
    }
  }

  set progress (progress) {
    this.targetNode = this.target.env.renderer.getNodeForMorph(this.target);
    if (!this.targetNode) return;
    if (!this.webAnimation) {
      this.webAnimation = this.target.env.renderer.getNodeForMorph(this.target).animate(
        this._keyframes,
        {
          fill: 'both',
          duration: 100,
          composite: this.translate
        }
      );
      this.webAnimation.pause();
    }
    this.webAnimation.currentTime = progress * 100;
    console.log(this.webAnimation.currentTime);
  }
}
