import { QinoqMorph } from '../qinoq-morph.js';
import { VerticalLayout } from 'lively.morphic';
import { AlignmentPanel, ShareSettingsPanel } from './panels.js';

export class StyleInspector extends QinoqMorph {
  static get properties () {
    return {
      name: {
        defaultValue: 'style inspector'
      },
      inspector: {},
      ui: {
        after: ['submorphs'],
        initialize () {
          if (this._deserializing) return;
          this.ui = {};
          this.build();
        }
      },
      clipMode: {
        defaultValue: 'auto'
      },
      enable: {
        defaultValue: false,
        set (bool) {
          if (this._deserializing) return;

          this.setProperty('enable', bool);
          this.initialize();
        }
      }
    };
  }

  get targetMorph () {
    return this.inspector.targetMorph;
  }

  __after_deserialize__ (snapshot, ref, pool) {
    delete ref.realObj.ui.panels._rev;
  }

  build () {
    this.ui.panels = {};

    this.layout = new VerticalLayout({
      resizeSubmorphs: true
    });

    this.ui.panels.alignment = this.addMorph(new AlignmentPanel({
      inspector: this.inspector,
      _editor: this.editor,
      title: 'Alignment'
    }));

    this.ui.panels.share = this.addMorph(new ShareSettingsPanel({
      inspector: this.inspector,
      _editor: this.editor,
      title: 'Share Settings'
    }));

    this.initialize();
  }

  initialize () {
    Object.values(this.ui.panels).forEach(panel => {
      panel.initialize();
    });
  }

  onTargetMorphChange (targetMorph) {
    Object.values(this.ui.panels).forEach(panel => {
      panel.onTargetMorphChange(targetMorph);
    });
  }
}
