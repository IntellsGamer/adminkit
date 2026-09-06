# AdminKit — offline modern admin (plain HTML/CSS/JS)

No CDN. No build step. Zero emojis — Font Awesome 6.5.2, Inter + Vazirmatn,
Jalali math and all component code vendored locally. Open any page directly —
even with no internet.

## Pages
- `index.html` — dashboard (hero, KPI tiles + sparklines + deltas, pills)
- `login.html` — split-screen login/register (icon inputs, password toggle,
  country dial codes, offline validation)
- `playground-sonner.html` — Sonner port (types, promise, burst stack,
  6 docks, live option rebuild, copy-paste)
- `playground-modal.html` — modal port (sizes, sticky footer, confirm)
- `playground-table.html` — DataTables-like grid (search/sort/page/export,
  module toggles)
- `playground-dropdown.html` — searchable dropdown (select replacement)
- `playground-datepicker.html` — Persian + Gregorian picker (jalaali-js core,
  month/year jump, min/max)
- `playground-buttons.html` — full button set + icon buttons

## Highlights
- Dark/light follows OS (`matchMedia`), re-applies on system change **only**
  when theme is `system` or never overridden; saved in `localStorage` (v2)
- Top bar carries live controls: layout toggle, theme-color dot, sun/moon,
  language, settings — everything also in the drawer
- Vertical sidebar (accordion, one-open) / mini mode (waterfall popup
  outside) / horizontal top menu with image mega-menu / hamburger on mobile
- EN/FA via `i18n/*.json` + auto RTL; idle minutes (0=off) → stay/leave
  progress → PIN lock (default `1234`, `Idle.setPin()`)
- Settings drawer sits opposite the sidebar and opens on first load

## Serve
`python3 -m http.server 8000 --bind 0.0.0.0` in this folder
(or just double-click the HTML files — fonts/icons resolve relatively).
