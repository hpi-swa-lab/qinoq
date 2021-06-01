import { HorizontalLayout, Label } from 'lively.morphic';
import { pt } from 'lively.graphics';
import { COLOR_SCHEME } from '../colors.js';
import { disconnect, connect } from 'lively.bindings';
import { Sequence } from '../index.js';
import { QinoqMorph } from '../qinoq-morph.js';
import { resource } from 'lively.resources';
import { TargetPicker } from './target-picker.js';
import { CONSTANTS } from './constants.js';
import { StyleInspector } from './style-inspector.js';
import { AnimationsInspector } from './animations-inspector.js';

export class InteractiveMorphInspector extends QinoqMorph {
  static get properties () {
    return {
      name: {
        defaultValue: 'interactive morph inspector'
      },
      borderColor: {
        defaultValue: COLOR_SCHEME.BACKGROUND_VARIANT
      },
      ui: {
        after: ['_editor'],
        initialize () {
          if (this._deserializing) return;
          this.ui = {};
          this.build();
          connect($world, 'showHaloFor', this, 'selectMorphThroughHalo');
        }
      },
      targetMorph: {
        after: ['propertyControls'],
        set (morph) {
          if (this._deserializing) {
            this.setProperty('targetMorph', morph);
            return;
          }

          if (morph && morph != this.targetMorph) {
            this.animationsInspector.disbandConnections();

            this.styleInspector.onTargetMorphChange(morph);
            this.setProperty('targetMorph', morph);

            this.ui.headline.textString = `Inspecting ${morph.toString()}`;
            this.animationsInspector.initialize();
            this.ui.animationsInspectorTab.selected = true;
          }

          // this allows us to set the targetMorph to null when no morph is currently inspected
          if (!morph) {
            this.setProperty('targetMorph', null);
          }
        }
      },
      extent: {
        set (extent) {
          this.setProperty('extent', extent);
          if (!this._deserializing && this.ui && this.ui.tabContainer) this.ui.tabContainer.extent = pt(this.width, this.height - this.ui.headlinePane.height);
        }
      }
    };
  }

  get sequence () {
    return Sequence.getSequenceOfMorph(this.targetMorph);
  }

  get animationsInspector () {
    return this.ui.animationsInspector;
  }

  get styleInspector () {
    return this.ui.styleInspector;
  }

  buildTargetPicker () {
    this.ui.targetPicker = new TargetPicker({ inspector: this });
  }

  async build () {
    this.buildTargetPicker();

    this.ui.headlinePane = new QinoqMorph({ name: 'headline pane', fill: COLOR_SCHEME.TRANSPARENT });
    this.ui.headline = new Label({ name: 'headline', textString: 'No morph selected', fontWeight: 'bold' });
    this.ui.headlinePane.layout = new HorizontalLayout({ spacing: 5, align: 'center' });
    this.ui.headlinePane.addMorph(this.ui.targetPicker);
    this.ui.headlinePane.addMorph(this.ui.headline);
    this.addMorph(this.ui.headlinePane);

    this.ui.tabContainer = await resource('part://tabs/tabs').read();
    Object.assign(this.ui.tabContainer, {
      position: pt(0, 38),
      extent: pt(this.width, this.height - this.ui.headlinePane.height),
      showNewTabButton: false,
      tabHeight: 25
    });

    this.ui.animationsInspectorTab = await this.ui.tabContainer.addTab('animations');
    this.ui.animationsInspectorTab.closeable = false;
    this.ui.animationsInspectorTab.renamable = false;

    this.ui.styleInspectorTab = await this.ui.tabContainer.addTab('styling');
    this.ui.styleInspectorTab.closeable = false;
    this.ui.styleInspectorTab.renamable = false;

    this.initializeAnimationsInspector();
    this.initializeStyleInspector();

    this.ui.animationsInspectorTab.selected = true;
    this.addMorph(this.ui.tabContainer);
    this.ui.tabContainer.getSubmorphNamed('tab content container').acceptsDrops = false;
  }

  initializeStyleInspector () {
    this.ui.styleInspector = new StyleInspector({
      inspector: this,
      _editor: this.editor
    });
    this.ui.styleInspectorTab.content = this.styleInspector;
    this.ui.styleInspectorTab.borderColor = COLOR_SCHEME.PRIMARY;
  }

  initializeAnimationsInspector () {
    this.ui.animationsInspector = new AnimationsInspector({
      inspector: this,
      _editor: this.editor
    });
    this.ui.animationsInspectorTab.content = this.animationsInspector;
    this.ui.animationsInspectorTab.borderColor = COLOR_SCHEME.PRIMARY;
  }

  selectMorphThroughHalo (morph) {
    if (Array.isArray(morph)) morph = morph[0]; // Multi select through halo
    if (this.interactive && this.interactive.sequences.includes(Sequence.getSequenceOfMorph(morph))) {
      this.targetMorph = morph;
    }
  }

  updateInMorph () {
    this.animationsInspector.updateInMorph();
  }

  deselect () {
    if (!this.animationsInspector) return;
    this.animationsInspector.disbandConnections();
    this.ui.headline.textString = 'No morph selected';

    this.animationsInspector.remove();
    this.initializeAnimationsInspector();
    this.styleInspector.remove();
    this.initializeStyleInspector();

    this.targetMorph = null;
  }

  abandon () {
    disconnect($world, 'showHaloFor', this, 'selectMorphThroughHalo');
    super.abandon();
  }
}
