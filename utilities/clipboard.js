export class Clipboard {
  constructor () {
    this.contentType = null;
  }

  addMorph (morph, animations) {
    this.morph = morph;
    this.animations = animations;
    this.contentType = 'morph';
  }

  addSequence (sequence, morphs = sequence.submorphs, animations = sequence.animations) {
    this.sequence = sequence;
    this.morphs = morphs;
    this.animations = animations;
    this.contentType = 'sequence';
  }

  get content () {
    if (this.containsMorph) return { morph: this.morph, animations: this.animations };
    if (this.containsSequence) return { sequence: this.sequence, morphs: this.morphs, animations: this.animations };
    return null;
  }

  get containsMorph () {
    return this.contentType == 'morph';
  }

  get containsSequence () {
    return this.contentType == 'sequence';
  }

  clear () {
    this.morph = null;
    this.animations = null;
    this.sequence = null;
    this.morphs = null;
    this.contentType = null;
  }
}
