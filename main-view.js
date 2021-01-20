import { Morph, VerticalLayout, HorizontalLayout, GridLayout } from 'lively.morphic';
import { pt, Color } from 'lively.graphics';
import { Timeline } from './timeline.js';

export class MainView extends Morph {
  static get properties () {
    return {
      ui: {}
    };
  }

  constructor () {
    super();
    this.layout = new VerticalLayout({
      autoResize: false,
      align: 'center',
      direction: 'centered',
      spacing: 5
    });

    this.ui = {};
    this.initializeUpperComponents();
    this.initializeLowerComponents();

    this.addMorph(this.ui.upperContainer);
    this.addMorph(this.ui.lowerContainer);
  }

  initializeUpperComponents () {
    this.ui.upperContainer = new Morph({
      name: 'upper container',
      layout: new HorizontalLayout({
        spacing: 2
      })
    });
    this.ui.overview = new SequenceOverview();
    this.ui.upperContainer.addMorph(this.ui.overview);
    this.ui.preview = new Preview();
    this.ui.upperContainer.addMorph(this.ui.preview);
    this.ui.interactiveMorphInspector = new InteractiveMorphInspector();
    this.ui.upperContainer.addMorph(this.ui.interactiveMorphInspector);
  }

  initializeLowerComponents () {
    this.ui.lowerContainer = new Morph({
      name: 'lower container',
      layout: new HorizontalLayout({
        spacing: 2
      })
    });
    this.ui.timeline = new Timeline();
    this.ui.lowerContainer.addMorph(this.ui.timeline);
  }

  relayout () {
    this.width = this.owner.width;
    this.relayoutUpperContainer();
    this.relayoutLowerContainer();
  }

  relayoutUpperContainer () {
    const upperContainerWidth = this.owner.width - getTotalSpacing(this.ui.upperContainer) - this.layout.spacing * 2;
    const upperContainerHeight = this.height / 2;

    this.ui.upperContainer.height = upperContainerHeight;
    this.ui.upperContainer.width = upperContainerWidth;
    this.ui.overview.height = upperContainerHeight;
    this.ui.overview.width = upperContainerWidth / 8;
    this.ui.interactiveMorphInspector.width = upperContainerWidth / 8;
    this.ui.interactiveMorphInspector.height = upperContainerHeight;
    this.ui.preview.width = upperContainerWidth / 8 * 6;
    this.ui.preview.height = upperContainerHeight;
  }

  relayoutLowerContainer () {
    const lowerContainerWidth = this.width - getTotalSpacing(this.ui.lowerContainer) - this.layout.spacing * 2;
    this.ui.timeline.relayout(lowerContainerWidth);
  }
}

function getTotalSpacing (morph) {
  return morph.layout.spacing * (morph.submorphs.length - 1);
}

export class Preview extends Morph {
  constructor () {
    super();

    // this.extent = pt(400, 250);
    this.borderColor = new Color.rgb(220, 220, 220);
    this.borderWidth = 5;
  }
}

export class SequenceOverview extends Morph {
  constructor () {
    super();

    // this.extent = pt(80, 250);
    this.borderColor = new Color.rgb(220, 220, 220);
    this.borderWidth = 5;
  }
}

export class InteractiveMorphInspector extends Morph {
  constructor () {
    super();

    // this.extent = pt(80, 250);
    this.borderColor = new Color.rgb(220, 220, 220);
    this.borderWidth = 5;
  }
}
