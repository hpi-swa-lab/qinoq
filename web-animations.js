export class WebAnimation {
  static usesTransform (prop) {
    return [
      'position',
      'scale'
    ].includes(prop);
  }

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
    this._keyframes.forEach((kf, i) => {
      kf.offset = this.keyframes[i].position;
    });
    if (this.keyframes[1].position != 1) {
      this._keyframes.push(JSON.parse(JSON.stringify(this._keyframes[1])));
      this._keyframes[2].offset = 1;
    }
  }

  generateCSSKeyframes () {
    switch (this.property) {
      case 'position':
        const xOffset = this.keyframes[1].value.x - this.keyframes[0].value.x;
        const yOffset = this.keyframes[1].value.y - this.keyframes[0].value.y;
        return [
          { transform: 'translate(0px,0px)' }, // beginning
          { transform: `translate(${xOffset}px,${yOffset}px)` } // end
        ];
        break;
      case 'scale':
        return [
          { transform: `scale(${this.keyframes[0].value})` }, // beginning
          { transform: `scale(${this.keyframes[1].value})` } // end
        ];
        break;
      case 'fill':
        const c1 = this.keyframes[0].value;
        const c2 = this.keyframes[1].value;
        return [
          { backgroundColor: `${this.keyframes[0].value}` }, // beginning
          { backgroundColor: `${this.keyframes[1].value}` } // end
        ];
        break;
      default:
        throw 'Provide Valid Property to Animate';
    }
  }

  set progress (progress) {
    this.targetNode = this.target.env.renderer.getNodeForMorph(this.target);
    if (!this.targetNode) return;
    if (!this.webAnimation) {
      const timingOptions = {
        fill: 'forwards',
        duration: 100
      };
      if (WebAnimation.usesTransform(this.property)) {
        timingOptions.composite = 'add';
      }
      this.webAnimation = this.target.env.renderer.getNodeForMorph(this.target).animate(
        this._keyframes,
        timingOptions
      );
      this.webAnimation.pause();
    }
    this.webAnimation.currentTime = progress * 100;
  }
}
