# Team Report: Developer

**Role:** Frontend Development, Performance Engineering, Tooling

## Scope of Work

Complete technical implementation of the Ukho Archive as a single-page React application — project setup, build configuration, data architecture, all component development, animation systems, 3D integration, search engine, performance optimization, and deployment tooling.

## Deliverables

### 1. Project Architecture & Setup

Vite project initialization, React 18 configuration, dependency management (React, Three.js), build pipeline, font loading strategy (preload + @font-face with display optimization), HTML meta setup, Netlify deployment configuration.

### 2. Data Layer

Structured data model for 180 events (13 fields per event). Compilation of raw JSON into optimized JavaScript modules. Programs cross-reference system (293 pieces mapped to events via reverse lookup). Performer index (292 entries). Slide and media metadata. Minified data format with abbreviated keys for bundle efficiency.

### 3. Core Application (1,450 lines)

Monolithic React component tree with 30 components and custom hooks. Client-side routing via History API (pushState/popstate) with URL pattern matching. State management via React hooks with ref-based persistence across page transitions. No external routing or state management dependencies.

### 4. List View — Mobile

Full-screen card swipe interface with directional page transitions (400ms CSS animations), touch gesture handling (40px threshold, 500ms time window), mouse wheel navigation (200ms debounce), keyboard shortcuts (arrows, j/k, Enter). Floating field labels with position tracking.

### 5. List View — Desktop

Virtualized table rendering 180 events. Flow-based windowing with top/bottom spacer divs — no absolute positioning, zero overlap risk. 1,200px overscan buffer. Row height measurement via useLayoutEffect with persistent cache. rAF-throttled scroll tracking. Memoized row component with event delegation via data attributes. Entry wave animation with stagger, disabled after initial load.

### 6. Search Engine

Multi-field text search across name, program, performers, place, tags, date. String normalization pipeline: lowercase, Unicode NFD decomposition, combining mark removal. Cyrillic transliteration layer (10 character mappings). Map-based normalization cache for O(1) repeated lookups. 80ms debounce. Inline search highlight rendering. Program-aware search with composer/title parsing.

### 7. Everything View

Filterable index with 5 categories derived via useMemo. Category counts. Tap-to-search with automatic mode switch. Program-aware search parsing composer/title from dash-separated format. Scroll position preservation across mode switches.

### 8. Card Index Page

CSS Grid card layout with cascading build animation (30ms stagger). Click-to-expand event detail. Scroll position restoration. Poster lazy loading via intersection observer.

### 9. Event Detail Page

Structured display of all event fields. Photo gallery with fullscreen viewer — keyboard arrow navigation, Escape to close. Poster slide-in animation triggered by intersection observer. Related event navigation by ID.

### 10. 3D Integration

Three.js scene setup for home page: USDZ model loading, OrbitControls, ambient + directional lighting, transparent background. Grid-based wave animation (24x14 grid, 30fps throttle, poke interaction). Experimental portal canvas page.

### 11. Animation Systems

37 CSS @keyframes animations. requestAnimationFrame loops for canvas overlays. Frame-skip patterns for 30fps throttling. CSS 3D transforms (perspective, preserve-3d) for dice and door elements. Typewriter hook with configurable speed and start delay. Multi-step glitch animation (12-step clip-path + hue-rotate).

### 12. CRT Analog Overlay

Fullscreen canvas overlay: 4-layer radial vignette, animated specular highlight, stochastic grain noise (0.06% pixel sampling), sine-wave scanlines, random glitch with configurable probability, parallax texture based on scroll velocity. Device pixel ratio scaling for retina. Frame-skip throttling.

### 13. Performance Engineering

Custom budget tool (Node.js + Puppeteer) — automated bundle size validation, DOM node counting across 5 pages, heap memory measurement. rAF-throttled scroll handlers. React.memo on row components. Event delegation to avoid closure allocation. Normalization cache. Lazy image loading. Font preloading with font-display: block to eliminate FOUT.

### 14. Responsive Implementation

CSS clamp() for 14 fluid typography/spacing values. Window.innerWidth breakpoint checks. Touch + mouse event handlers. Mobile-specific UI (floating labels, swipe cards). Desktop-specific UI (table, hover states). Stable viewport height tracking to ignore mobile keyboard resize.

## Hours

| Phase | Hours |
|-------|-------|
| Project setup — Vite, React, fonts, HTML, build pipeline, deployment config | 8 |
| Data architecture — event schema, JSON compilation, program cross-references, indexes | 20 |
| Routing & state — History API, URL sync, page transitions, ref-based persistence | 12 |
| Home page — layout, typewriter hook, Three.js + USDZ integration, boot sequence | 14 |
| Card Index — grid layout, cascade animation, click-to-expand, scroll restoration | 12 |
| List mobile — card swipe, touch/wheel/keyboard nav, directional transitions, labels | 18 |
| List desktop — table, virtualization (windowing, height cache, spacers, overscan), delegation, memo | 24 |
| Search engine — normalization, transliteration, caching, debounce, multi-field match, highlights | 14 |
| Everything view — category derivation, filter tabs, tap-to-search, program search, scroll state | 10 |
| Event Detail — field layout, photo gallery, fullscreen viewer, keyboard nav, poster animations | 12 |
| Riddles page — typewriter engine, dice interaction, door 3D animation, event linking | 8 |
| CRT overlay — canvas pipeline, vignette, grain, scanlines, glitch, parallax, DPR scaling | 12 |
| 3D scenes — Three.js setup, USDZ loading, OrbitControls, lighting, wave grid, portals | 10 |
| Animation implementation — 37 @keyframes, transitions, cubic-bezier tuning, choreography | 14 |
| Performance optimization — virtualization, memo, delegation, throttling, cache, budget tooling | 18 |
| Responsive & cross-browser — clamp(), touch handlers, mobile/desktop branches, Safari prefixes | 12 |
| Bug fixes & polish — duplicate tags, search edge cases, font flash, alignment, scroll bugs | 12 |
| **Total** | **230** |
