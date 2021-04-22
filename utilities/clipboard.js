export class Clipboard {
  constructor () {}

  addMorph (morph, animations) {
    this.morph = morph;
    this.animations = animations;
  }

  get content () {
    if (this.containsMorph) return { morph: this.morph, animations: this.animations };
    return null;
  }

  get containsMorph () {
    return (this.morph && this.animations);
  }

  clear () {
    this.morph = null;
    this.animations = null;
  }
}
