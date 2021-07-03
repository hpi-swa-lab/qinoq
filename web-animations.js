export class WebAnimationPointAnimation {
  constructor (targetMorph) {
    this.target = targetMorph;
    this.keyframes = [];
    this.webAnimation = null;
  }

  // currently accepts EXACTLY two keyframes, one for the beginning and one for the end of the animation
  // provide keyframes in the correct order
  addKeyframes (keyframes) {
    this.keyframes = keyframes; // who knows what they might be good for
    const xOffset = this.keyframes[1].value.x - this.keyframes[0].value.x;
    const yOffset = this.keyframes[1].value.y - this.keyframes[0].value.y;
    this._keyframes = [
      { transform: 'translate(0px,0px)' }, // beginning
      { transform: `translate(${xOffset}px,${yOffset}px)` } // end
    ];
  }

  set progress (progress) {
    this.targetNode = this.target.env.renderer.getNodeForMorph(this.target);
    if (!this.targetNode) return;
    if (!this.webAnimation) {
      this.webAnimation = this.target.env.renderer.getNodeForMorph(this.target).animate(
        this._keyframes,
        {
          fill: 'both',
          duration: 100
        }
      );
      this.webAnimation.pause();
    }
    this.webAnimation.currentTime = progress * 100;
    console.log(this.webAnimation.currentTime);
  }
}
