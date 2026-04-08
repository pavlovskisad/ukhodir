## Project Summary: ukho — directory

**Repo:** `pavlovskisad/ukhodir` — React/Vite SPA, Netlify deploys from `main` branch.
**Feature branch:** `claude/reduce-slideshow-size-YeguT`
**All code lives in:** `src/App.jsx` (single-file app) + `src/data.js` (data)

### Architecture
- Three.js `USDLoader` renders `public/kopalyny.usdz` on the Portals page
- `useBarBottom()` hook with `ResizeObserver` dynamically measures fixed bar position
- `norm()` function at line ~10 of App.jsx normalizes search across curly quotes, accents, case
- 3-tier opacity: `#000` (titles), `rgba(0,0,0,0.4)` (content), `rgba(0,0,0,0.2)` (meta)
- Spaced letter-spacing typography for menus/titles
- Year carousel: pinned selected year + flat auto-scrolling ticker for rest
- BottomBar (dashboard) positioned at top below menu; search above years
- Everything mode: tabs for names/performers/programs/places/tags — tapping an item sets search and switches to list mode

### Data
- `data.js` exports: `EVENTS`, `SLIDES`, `MEDIA`, `PERFORMERS` (292 curated names)
- `PERFORMERS` array is used in Everything mode instead of auto-extracted performer data
- Event search uses `norm()` for accent/quote-insensitive matching

### What's Done (all merged to main)
- USDZ native rendering via Three.js
- Simplified 3-tier typography
- Tightened line-height + guaranteed block gaps
- BottomBar moved to top, search above years
- Year carousel (pinned + ticker)
- Curated PERFORMERS list in Everything mode
- Field labels in event detail view
- Spaced letter-spacing for menus/titles
- `norm()` search normalization for Unicode matching
- Fixed 6 unmatched performers (typos in event data + apostrophe mismatches)

### What's Left (the pending task)
- **Add curated PIECES list to Everything mode** — user uploaded a PDF to GitHub with ~500+ piece/program entries. Need to:
  1. Add `PIECES` array to `data.js` (parse from the PDF on GitHub)
  2. Rename "programs" to "pieces" in Everything mode
  3. Use `PIECES` instead of auto-extracted `[...new Set(reversed.flatMap(e=>e.pr))]` in the `everything` useMemo (line ~320 of App.jsx)
  4. Ensure `jumpFrom()` search routing works with `norm()` matching
  5. Build, commit, push, merge to main

### Key Code Locations (App.jsx)
- `norm()`: line ~10
- Import: line 5 — `import { EVENTS, SLIDES, MEDIA, PERFORMERS } from './data.js'`
- `everything` useMemo: line ~320 — currently has `programs:[...new Set(reversed.flatMap(e=>e.pr)...)]`
- `jumpFrom`: line ~324 — sets search and switches to list mode
- Search filter: line ~275 — uses `norm()` on both query and event fields
- Everything mode render: line ~338
