import { Label, Icon } from 'lively.morphic';
import { string } from 'lively.lang';

import { error } from '../utilities/messages.js';

export const PRESETS = {
  FACEBOOK: {
    name: 'Facebook',
    icon: 'facebook-f',
    href: 'https://facebook.com/sharer/sharer.php?u={url}'
  },
  TWITTER: {
    name: 'Twitter',
    icon: 'twitter',
    href: 'https://twitter.com/intent/tweet/?text={text}&url={url}'
  },
  LINKED_IN: {
    name: 'LinkedIn',
    icon: 'linkedin-in',
    // url sharing is deprecated and only supports an URL
    // make sure that the website is properly designed with og tags
    href: 'https://www.linkedin.com/shareArticle?mini=true&url={url}'
  },
  XING: {
    name: 'Xing',
    icon: 'xing',
    href: 'https://www.xing.com/app/user?op=share;url={url};title={text}'
  },
  WHATSAPP: {
    name: 'WhatsApp',
    icon: 'whatsapp',
    href: 'whatsapp://send?text={text}%20{url}'
  },
  TELEGRAM: {
    name: 'Telegram',
    icon: 'telegram-plane',
    href: 'https://telegram.me/share/url?text={text}&url={url}'
  },
  REDDIT: {
    name: 'Reddit',
    icon: 'reddit-alien',
    href: 'https://reddit.com/submit/?url={url}&resubmit=true&title={text}'
  },
  E_MAIL: {
    name: 'E-mail',
    icon: 'envelope',
    href: 'mailto:?subject={subject}&body={text}%20{url}'
  },
  TUMBLR: {
    name: 'tumblr',
    icon: 'tumblr',
    href: 'https://www.tumblr.com/widgets/share/tool?posttype=link&title={title}&caption={text}&content={url}&canonicalUrl={url}&shareSource=tumblr_share_button'
  },
  PINTEREST: {
    name: 'Pinterest',
    icon: 'pintereset-p',
    href: 'https://pinterest.com/pin/create/button/?url={url}&media={url}&description={text}'
  },
  HACKER_NEWS: {
    name: 'Hacker News',
    icon: 'hacker-news-square',
    href: 'https://news.ycombinator.com/submitlink?u={url}&t={text}'
  },
  VK: {
    name: 'VK',
    icon: 'vk',
    href: 'http://vk.com/share.php?title={text}&url={url}'
  },
  INSTAGRAM: {
    name: 'Instagram',
    icon: 'instagram',
    href: 'https://instagram.com/{url}'
  }
};

export class SocialMediaButton extends Label {
  static get properties () {
    return {
      fontSize: {
        defaultValue: 22
      },
      nativeCursor: {
        defaultValue: 'pointer'
      },
      preset: {
        type: 'Enum',
        values: Object.values(PRESETS).map(preset => preset.name),
        after: ['tooltip', 'tokens', 'submorphs'],
        initialize () {
          if (!this._deserializing) {
            this.preset = PRESETS.TWITTER;
          }
        },
        set (presetOrPresetName) {
          const preset = typeof presetOrPresetName === 'string'
            ? Object.values(PRESETS).find(preset => preset.name === presetOrPresetName)
            : presetOrPresetName;
          if (!preset) {
            error(`Invalid preset: ${presetOrPresetName}`);
            return;
          }
          this.setProperty('preset', preset);
          this.onPresetChange(preset);
        }
      },
      tokens: {
        initialize () {
          if (!this._deserializing) {
            this.tokens = {};
          }
        }
      }
    };
  }

  get link () {
    return this.populateTokens(this.preset.href);
  }

  get presetValues () {
    return Object.values(PRESETS).map(preset => preset.name);
  }

  onPresetChange (preset) {
    this.updateIcon();
    this.updateTooltip();
    this.generateTokens();
  }

  populateTokens (link) {
    Object.values(this.tokens || {}).forEach(token => {
      link = link.replaceAll(`{${token.symbol}}`, encodeURIComponent(token.value));
    });
    return link;
  }

  generateTokens () {
    Object.values(this.tokens)
      .filter(token => typeof token === 'object') // skip values from keys like _rev
      .forEach(token => token.active = false);

    // matches all words with whitespace in it surrounded by {}
    // like {text}, {share link}, ...
    // eslint-disable-next-line no-useless-escape
    const tokenNames = (this.preset.href || '').match(new RegExp('(?<={)[\\w\\s]+', 'g')) || [];
    const newTokens = tokenNames.map(tokenName => {
      return {
        id: tokenName[0].toLowerCase() + string.camelCaseString(tokenName).substring(1),
        symbol: tokenName
      };
    });

    Object.values(newTokens).forEach(token => {
      const tokenId = token.id;
      delete token.id;
      token.value = (this.tokens[tokenId] ? this.tokens[tokenId].value : '') || '';
      token.active = true;
      this.tokens[tokenId] = token;
    });
  }

  updateIcon () {
    Icon.setIcon(this, this.preset.icon);
  }

  updateTooltip () {
    this.tooltip = 'Share via ' + this.preset.name;
  }

  onMouseUp () {
    window.open(this.link);
  }
}
