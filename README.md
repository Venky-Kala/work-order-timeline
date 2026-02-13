# Work Order Schedule Timeline

A production-grade, interactive Gantt-chart timeline built with **Angular 17** for managing work orders across multiple work centers. Designed pixel-perfect to a Sketch Cloud specification for the Naologic platform.

![Angular](https://img.shields.io/badge/Angular-17.3-DD0031?logo=angular)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript)
![Tests](https://img.shields.io/badge/Tests-137%20passing-brightgreen)
![Build](https://img.shields.io/badge/Build-428%20KB-blue)

---

## Features

- **Interactive Timeline Grid** — Horizontally scrollable with infinite-scroll range extension
- **Four Zoom Levels** — Hour, Day, Week, Month with instant switching
- **Work Order CRUD** — Create, edit, and delete via a slide-out panel
- **Overlap Detection** — Real-time date-range collision validation
- **Form Validation** — Required fields, date comparison, and overlap checks with inline errors
- **Client-Side Persistence** — Auto-saves to localStorage with versioned cache invalidation
- **Keyboard Navigation** — Full Tab, Enter, Space, Escape, and Arrow key support
- **WCAG 2.1 AA Accessibility** — ARIA roles, labels, live regions, focus management, and focus trapping
- **Micro-Interactions** — Panel slide-in, bar hover lift, dropdown entrance, error shake, smooth scroll
- **Pixel-Perfect Design** — Sketch-verified spacing, colors, typography, and component dimensions

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Angular 17.3 (Standalone Components) |
| Language | TypeScript 5.4 |
| State | RxJS BehaviorSubject + localStorage |
| Dates | date-fns 4.1 |
| UI Controls | @ng-select/ng-select, @ng-bootstrap/ng-bootstrap |
| Styling | SCSS with design tokens (Sketch-derived) |
| Testing | Jest 29 + jest-preset-angular |
| Build | Angular CLI + esbuild |

## Getting Started

### Prerequisites

- **Node.js** 18+ and **npm** 9+
- No browser installation required for tests (Jest runs headless)

### Install & Run

```bash
# Install dependencies
npm install

# Start development server
ng serve
```

Open [http://localhost:4200](http://localhost:4200) in your browser.

### Build for Production

```bash
ng build
```

Output is written to `dist/work-order-timeline/`.

### Run Tests

```bash
# Run all 137 tests
npm test

# Verbose output with individual test names
npm test -- --verbose

# Watch mode for development
npm test -- --watch
```

## Project Structure

```
src/app/
├── components/
│   ├── timeline/              # Main Gantt chart component (536 + 207 + 749 lines)
│   └── slide-panel/           # Create/Edit panel component (200 + 117 + 446 lines)
├── services/
│   ├── work-order.service.ts  # CRUD + overlap detection + persistence
│   └── timeline.service.ts    # Date-to-pixel engine + column generation
├── models/
│   ├── work-center.model.ts   # WorkCenterDocument interface
│   └── work-order.model.ts    # WorkOrderDocument + WorkOrderStatus type
├── data/
│   └── sample-data.ts         # 7 work centers, 20 realistic work orders
├── app.component.ts           # Root shell with Naologic branding
└── app.config.ts              # Application configuration
```

## Test Coverage

| Suite | Tests | Covers |
|---|---|---|
| WorkOrderService | 24 | CRUD, overlap detection (8 boundary cases), localStorage |
| TimelineService | 30 | Range initialization, column generation, pixel math, round-trip fidelity |
| SlidePanelComponent | 30 | Form init, validation pipeline, submit/cancel, ARIA attributes |
| TimelineComponent | 53 | Zoom, panel state, actions menu, keyboard nav, rendered ARIA DOM |
| **Total** | **137** | **100% pass rate** |

## Architecture

```
Presentation    TimelineComponent ←→ SlidePanelComponent
                     ↓ @Input/@Output        ↓
Services        TimelineService         WorkOrderService
                (date ↔ pixel)          (CRUD + overlap)
                                             ↓
Data            WorkCenterDocument · WorkOrderDocument → localStorage
```

## Documentation

See [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md) for the full technical deep-dive covering architecture, the timeline engine, accessibility implementation, animation specs, testing strategy, and key technical decisions.
