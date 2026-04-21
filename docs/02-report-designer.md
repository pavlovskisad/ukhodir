# Team Report: Designer

**Role:** UX/UI Design, Interface Implementation, Interaction Design

## Scope of Work

Translation of the art director's creative vision into concrete interface designs and interaction specifications. Executed all page layouts, responsive adaptations, component design, and animation parameterization. Participated in creative decisions in an advisory capacity and led all implementation-level design choices — spacing, sizing, component behavior, micro-interactions.

## Deliverables

### 1. Page Layouts (7 views)

Detailed layouts for all pages: Home (section spacing, content hierarchy, 3D element placement, typewriter area), Card Index (grid proportions, card sizing, reveal sequence), List mobile (card composition, field hierarchy, floating label positions), List desktop (column ratios, header treatment, row density), Everything (filter tab layout, watermark integration, item density), Event Detail (poster/metadata/gallery proportions, section ordering), Riddles (text area, control placement, dice/door positioning).

### 2. Responsive Design

Mobile-first responsive system using fluid units (14 clamp() definitions for typography and spacing). Touch interaction specifications — swipe thresholds, tap feedback scales, draggable element behavior. Desktop adaptations — hover states, table layout, keyboard shortcut integration. Breakpoint strategy at 768px with distinct mobile and desktop component variants.

### 3. Component Design

Specifications for all reusable interface elements: Menu bar (frosted glass panel, tab styling, active states), Bottom bar (search input, mode toggle, pagination, year filter integration), Floating dice (size, 3D face proportions, dot placement, drag area), Year carousel (item spacing, auto-scroll speed, decay easing), Photo viewer (overlay opacity, navigation arrow placement, close behavior), TapButton (press/release scale values, timing).

### 4. Animation Parameterization

Translation of art director's motion philosophy into concrete specs: timing values for all 37 @keyframes, cubic-bezier easing curves, stagger intervals (30ms cards, 16ms rows, 13ms everything items), duration calibration (400ms transitions, 8s idle floats, 0.7s cursor blinks). CRT overlay parameter tuning — grain density, scanline spacing, glitch probability and duration, vignette layer opacities.

### 5. Interaction Specifications

Tap feedback scales (0.95 hover, 0.90 active, 0.12s transition), selection blink pattern (120ms flash, 1,500ms random interval), search highlight styling (green background, 1px padding), scroll behavior, filter tab active/inactive states (blue vs 12% opacity), dice scale per context (1.12x desktop).

### 6. Design Iteration

Implementation of art director feedback across multiple refinement rounds: menu opacity and blur calibration, filter tab sizing and color adjustments, typography weight and size fine-tuning, element alignment corrections, spacing adjustments, watermark opacity values.

## Hours

| Phase | Hours |
|-------|-------|
| Design research — UX patterns, component benchmarking, technical constraints | 8 |
| Home page layout — sections, hierarchy, 3D placement, typewriter, links | 8 |
| Card Index layout — grid system, card proportions, cascade timing, expand behavior | 8 |
| List view mobile — card composition, field hierarchy, swipe UX, floating labels, transitions | 12 |
| List view desktop — column ratios, header, hover states, row density, virtualization UX | 10 |
| Everything view — filter tabs, watermark sizing, item layout, tap-to-search flow | 6 |
| Event Detail layout — poster/metadata proportions, gallery, section spacing, navigation | 8 |
| Riddles page — text presentation, control positioning, dice/door layout | 4 |
| Component specifications — menu, bottom bar, dice, year carousel, photo viewer, buttons | 10 |
| Animation parameters — timing, easing, stagger values for 37 animations, CRT tuning | 8 |
| Interaction design — tap/hover feedback, selection patterns, highlight styling, scroll | 6 |
| Responsive adaptation — fluid units, breakpoints, touch vs mouse, mobile/desktop variants | 10 |
| Design iteration — art director feedback, refinement rounds, alignment/spacing fixes | 14 |
| **Total** | **122** |
