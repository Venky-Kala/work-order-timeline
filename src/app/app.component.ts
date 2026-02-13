import { Component } from '@angular/core';
import { TimelineComponent } from './components/timeline/timeline.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TimelineComponent],
  template: `
    <div class="app-wrapper">
      <header class="app-header">
        <span class="logo">
          <span class="logo-nao">N</span><svg
            class="logo-inverted-v"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 6 7"
            fill="none"><path d="M0.75 7 L3 0.5 L5.25 7" stroke="#3E40DB" stroke-width="1.5" stroke-linejoin="miter"/></svg><span class="logo-nao">O</span><span class="logo-logic">LOGIC</span>
        </span>
      </header>
      <main>
        <app-timeline></app-timeline>
      </main>
    </div>
  `,
  styles: [`
    .app-wrapper {
      min-height: 100vh;
      background: #FFFFFF;
    }

    .app-header {
      padding: 20px 101px 0;       /* Y:20 from top, X:101 from left */
    }

    main {
      padding: 65px 0 0 101px;     /* Keep left padding for alignment; no right padding so table extends right */
    }

    .logo {
      display: inline-flex;
      align-items: baseline;
      width: 80px;                  /* Sketch: 80px fixed */
      height: 10px;                 /* Sketch: 10px fixed */
      font-size: 9px;
      letter-spacing: 1px;
      line-height: 10px;
      font-family: 'Circular-Std', 'Circular Std', -apple-system, BlinkMacSystemFont, sans-serif;
      overflow: hidden;
    }

    .logo-nao {
      font-weight: 700;
      color: #3E40DB;              /* Sketch: rgba(62, 64, 219, 1) */
    }

    /* Inverted V replacing the letter A — matches CircularStd Bold at 9px */
    .logo-inverted-v {
      width: 6px;
      height: 7px;
      display: inline-block;
      vertical-align: baseline;
      margin: 0 0.5px;             /* Fine-tune letter-spacing to match 1px */
      flex-shrink: 0;
    }

    .logo-logic {
      font-weight: 500;
      color: #3E40DB;              /* Same as NAO — Sketch: rgba(62, 64, 219, 1) */
    }
  `]
})
export class AppComponent {}
