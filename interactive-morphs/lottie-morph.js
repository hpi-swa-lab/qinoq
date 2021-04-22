// This code was adapted from typeshift.components

import { HTMLMorph } from 'lively.morphic';
import { resource } from 'lively.resources';

import Lottie from 'https://jspm.dev/lottie-web';
import { Sequence, Keyframe, NumberAnimation } from 'qinoq';
import { Color } from 'lively.graphics';

export class LottieMorph extends HTMLMorph {
  static get properties () {
    return {
      animationDataUrl: {
        copyAssetOnFreeze: true,
        async set (url) {
          if (!url.startsWith(document.location.origin) && !url.startsWith('http')) {
            let baseUrl;
            if (url.startsWith('/')) baseUrl = document.location.origin;
            else baseUrl = document.location.href + (document.location.href.endsWith('/') ? '' : '/..');

            url = resource(baseUrl).join(url).withRelativePartsResolved().url;
          }
          if (this.animationDataUrl == url) return;
          this.setProperty('animationDataUrl', url);
          this.lottieAnimation = null;
          this.animationData = this.fixAssets(await resource(url).readJson(), url);
          this.initialize();
        }
      },
      progress: {
        defaultValue: 0,
        min: 0,
        max: 1,
        isFloat: true,
        set (progress) {
          if (!this.isReady()) return;
          this.setProperty('progress', progress);
          this.renderFrame(Number.parseInt(this.lottieAnimation.totalFrames * progress));
        }
      },
      animationData: {
        serialize: false
      },
      hasGeneratedProgressAnimation: {
        defaultValue: false
      }
    };
  }

  menuItems () {
    let items = super.menuItems();
    items = items.slice(3); // remove edit CSS and edit HTML options
    items.unshift(
      ['change animation data url...', async () => {
        const url = await this.world().prompt('Enter Animation Data URL:', { input: this.animationDataUrl, lineWrapping: true, width: 600 });
        if (url) this.animationDataUrl = url;
      }],
      { isDivider: true });
    return items;
  }

  async initialize () {
    // if (!this.world()) return; // do not initialize an animation on morphs not rendered
    await this.whenRendered();
    this.domNode.innerHTML = '';
    this.lottieAnimation = Lottie.loadAnimation({
      animationData: this.animationData,
      renderer: 'svg',
      autoplay: false,
      container: this.domNode
    });
  }

  destroyAnimation () {
    if (!this.lottieAnimation) return;
    this.lottieAnimation.destroy();
    this.lottieAnimation = null;
  }

  fixAssets (animationData, dataUrl) {
    const folderAccessor = 'u';
    for (const asset of animationData.assets || []) {
      if (asset[folderAccessor]) {
        asset[folderAccessor] = resource(dataUrl).parent().join(asset[folderAccessor]).url;
      }
    }
    return animationData;
  }

  renderFrame (frame) {
    if (this.lottieAnimation) {
      this.lottieAnimation.renderer.renderFrame(this.lottieAnimation.firstFrame + frame);
    }
  }

  isReady () {
    if (!this.lottieAnimation) return false;
    return this.lottieAnimation.isLoaded;
  }

  generateProgressAnimation () {
    const sequence = Sequence.getSequenceOfMorph(this);
    if (sequence.getAnimationForMorphProperty(this, 'progress')) return;
    const animation = new NumberAnimation(this, 'progress');
    animation.addKeyframes([new Keyframe(0, 0, { name: 'animation start' }), new Keyframe(1, 1, { name: 'animation end', easing: 'linear' })]);
    sequence.addAnimation(animation);
    this.hasGeneratedProgressAnimation = true;
  }

  onOwnerChanged (newOwner) {
    if (newOwner && newOwner.isSequence && !this.hasGeneratedProgressAnimation) {
      this.generateProgressAnimation();
    }
  }
}
