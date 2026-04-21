# Ukho Archive — Product Overview

## Project Description

Ukho Archive is a digital archive and catalogue platform for Ukho, a Kyiv-based curatorial practice active since 2012 in contemporary music and performance art. The platform catalogues 180 events spanning 14 years of programming — concerts, opera productions, ensemble performances, exhibitions, and international collaborations — preserving the institutional memory of a practice that has operated largely outside formal institutional frameworks.

The archive is conceived as a three-stage project:

- **Stage 1** (live): Catalogue and essential media library
- **Stage 2** (June 2026): Full media library
- **Stage 3** (December 2026): Wiki and contextual layer

## Architecture

The platform is a single-page application (SPA) built with React 18, with no external routing or state management libraries. The entire interface is contained in a single component tree (~1,450 lines of application code), intentionally monolithic to minimize bundle overhead and dependency surface. Three.js powers 3D elements (home page model viewer, experimental portal page). Vite handles bundling and development.

There is no backend server. All event data (180 structured records with metadata for dates, programs, performers, venues, tags, posters, and photo documentation) is compiled into static JavaScript modules served alongside the application. Poster images and slideshow photography are hosted on a CDN.

## Pages and Navigation

- **Home** — Landing page with animated 3D model, project description, upcoming events (typewriter animation), umbrella project links (Kyiv Dispatch, Ukho Ensemble), and team credits.
- **Card Index** — Visual grid of all 180 events as poster cards with cascading reveal animation and click-to-expand detail view.
- **List** — Dual-mode data view. Mobile: full-screen swipeable cards with vertical touch/keyboard navigation. Desktop: virtualized table with 7 columns (ID, name, program, performers, place, tags, date) supporting search highlighting.
- **Everything** — Filterable index of all archive entities across 5 categories (names, performers, pieces, places, tags) with tap-to-search navigation into the list view.
- **Event Detail** — Full event page with poster, structured program listing, performer credits, venue, date, tags, and photo gallery with fullscreen viewer.
- **Riddles** — Curated text fragments presented with dice-roll navigation and animated door entry to associated events.
- **Portals** — Experimental Three.js canvas page (stage 2/3 development).

## Search and Filtering

Search is available across list and everything views. The search engine normalizes input using Unicode NFD decomposition, diacritic removal, and Cyrillic transliteration to support mixed-script queries. Results are highlighted inline. A year carousel provides temporal filtering (2012–2025). Search is debounced at 80ms to prevent interface lag.

## Visual Design System

Three typefaces: Satoshi (primary UI), Archaism (display/headlines), Commit Mono (terminal/data). Color palette: black text hierarchy (8%–90% opacity), accent green (#4af626), navigation blue (#0000ff), frosted white panels with backdrop blur.

A fullscreen canvas overlay renders CRT-style analog effects (vignette, grain, scanlines, random glitch) across all pages, referencing the materiality and impermanence of live performance. Interactive elements use CSS 3D transforms. Page transitions use directional slide animations.

## Performance

A custom performance budget system (Node.js + Puppeteer) validates bundle size (<1,400 KB), DOM node counts per page, and heap usage (<20 MB). The desktop list uses flow-based virtualization with 1,200px overscan, rendering only ~30–40 of 180 rows at a time. Fonts are preloaded. Canvas overlays use frame-throttled animation loops.

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18.3 |
| 3D | Three.js 0.183 |
| Build | Vite 5.4 |
| Styling | CSS-in-JS, 37 @keyframes animations |
| Fonts | Satoshi (CDN), Archaism + Commit Mono (local) |
| Data | Static JSON/JS modules, no backend |
| Performance | Custom Puppeteer budget tooling |
| Hosting | Static deployment (Netlify) |

## Data

- **180 events** (2012–2025), 13 fields per event
- **293 program/piece records** cross-referenced to events
- **292 performer entries**
- **180 poster images** (37 MB, WebP)
- **180 slideshow galleries** (48 MB, JPG/PNG)
- **3 font families** (618 KB local, 1 CDN)
- **1 3D model** (5.5 MB, USDZ)

## Project Team

| Role | Hours |
|------|-------|
| Art Director | 86 |
| Designer | 122 |
| Developer | 230 |
| Media Specialist | 154 |
| **Total** | **592** |
