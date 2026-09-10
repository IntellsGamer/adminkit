# AdminKit — آفلاین، مدرن، دوزبانه / Offline Modern Bilingual Admin

> **English docs first, then مستندات فارسی.** Plain HTML + CSS + JS. No CDN.
> No build step. No emojis — Font Awesome only.

---

# PART 1 — ENGLISH

## 1. What is this?

AdminKit is a complete, offline-first admin template: dashboard, login/register,
and a **playground page for every ported module** (toast, modal, table,
dropdown, date picker, buttons). Each playground is a live test bench **and**
copy-paste documentation for future development.

Core promises:

| Promise | How |
|---|---|
| Works with no internet | Every CSS/JS/font/icon vendored locally |
| Dark / light follows your OS | `matchMedia` + change listener, gated (see §5) |
| English + Persian, full RTL | External `i18n/*.json` dictionaries (see §7) |
| Settings survive reloads | Everything in `localStorage` (see §19) |
| Easy to reuse later | One tiny global per module (`toast`, `Modal`, `DataGrid`, `NiceSelect`, `DatePicker`, `ThemeStore`, `Idle`) |

## 2. Quick start

**Option A — just open it:** double-click `index.html`. Works offline.
Limitation: on `file://`, the language dictionaries cannot `fetch`, so pages
stay in their baked-in language until served over HTTP (see FAQ §21).

**Option B — local server (recommended):**

```bash
cd adminkit
python3 -m http.server 8000 --bind 0.0.0.0
# open http://localhost:8000/index.html
```

**Option C — any static host:** upload the folder as-is (GitHub Pages,
Nginx, IIS, VB.NET `wwwroot`, …). No server code needed.

## 3. Pages

| File | What | Use it for |
|---|---|---|
| `homepage.html` | Locked-horizontal index: hero, what-is-this, feature cards, all-pages links. `data-lock-layout="horizontal"`, topbar has theme + language only | Landing / index (NOT the dashboard) |
| `index.html` | Dashboard: hero, KPI tiles + sparklines + delta pills, activity, idle card | Home page |
| `products.html` | Shop grid from `Shop.PRODUCTS`, search + category + sort, add-to-cart | Shop demo |
| `cart.html` | Cart lines, qty steppers, subtotal, checkout → toast + clear | Cart demo |
| `gallery.html` | Gradient-cover grid + `Modal` lightbox, category filter | Gallery demo |
| `tickets.html` | Ticket list (search + status filter), new-ticket form, thread modal with reply + status | Support desk demo |
| `401.html` / `403.html` / `404.html` / `500.html` | Vercel-style error cards: big code, icon, home + dashboard buttons | Error pages |
| `login.html` | Split-screen login/register: icon inputs, password eye-toggle, country dial-code select, offline validation | Auth page |
| `playground-sonner.html` | Toast lab: all types, rich gallery, recipes, event log, live Toaster rebuild | Learn/test `toast` |
| `playground-modal.html` | Modal lab: sizes, sticky footer, confirm, template triggers | Learn/test `Modal` |
| `playground-table.html` | Grid lab: search/sort/numbered paging/export/columns + module toggles | Learn/test `DataGrid` |
| `playground-dropdown.html` | Searchable select lab | Learn/test `NiceSelect` |
| `playground-datepicker.html` | Jalali + Gregorian picker lab, 1-or-2-month mode | Learn/test `DatePicker` |
| `playground-buttons.html` | Full button set + icon buttons | Copy button classes |
| `playground-tabs.html` | Underline / pills / vertical tabs lab | Learn/test `Tabs` |
| `playground-tooltip.html` | `data-tip` 4-position lab (CSS-only) | Learn/test tooltips |
| `playground-carousel.html` | 5 carousels: slide / fade / autoplay / thumbs / marquee, mouse drag | Learn/test `Carousel` |
| `playground-grid.html` | 12-col `col-*` → `col-xl-*` lab with live rows | Learn/test grid |
| `playground-inputgroup.html` | Prefix / suffix / button addons + sm/lg lab | Copy input groups |

Every page shares the same shell: sidebar, top bar, settings drawer,
idle/lock overlays. Change the theme once — it follows you across pages via
`localStorage`.

## 4. Theme settings (UI)

**Top bar (always visible, identical on every page except `homepage.html`):** hamburger (mobile + overlay mode) ·
horizontal menus (horizontal layout only; extra entries auto-collapse into a
`More ⌄` overflow entry) · search at the top of the sidebar — topbar in
horizontal mode (command-palette page jumper, ↓↑ + Enter) · cart shortcut
(badge `data-cart-count`, hides at 0) ·
theme dropdown (System default / Light / Dark + primary color + 6 swatches +
layout + sidebar mode + horizontal style + glass switch) · language dropdown (English / فارسی) ·
notifications dropdown (badge + mark-all-read) · profile dropdown (profile /
settings / logout) · gear (opens settings drawer).

`homepage.html` is the exception: horizontal-locked index with theme +
language dropdowns only (no search, notifications, profile, gear, drawer).

The old one-off top-bar buttons (`#layoutToggle`, `#topPrimary`,
`#themeToggle`, `EN`/`فا`) are gone — every theme control now lives in the
theme dropdown (top bar) and stays in sync with the settings drawer via
`ThemeStore`. If you still have the old IDs on a custom page they keep working,
but new pages should copy the unified `<header class="topbar">` shell.

**Settings drawer** (gear icon; sits on the **opposite side** of the sidebar;
**opens automatically on first visit**):

| Setting | Values | Notes |
|---|---|---|
| Theme | System / Light / Dark | System follows the OS live |
| Primary color | color input + 6 swatches | Default amber `#f59e0b`; recolors accents, tiles, progress, focus rings |
| Menu layout | Vertical / Horizontal | Horizontal hides sidebar, shows top mega-menu |
| Horizontal style | Bar / Dock | Bar = menu inside topbar (default). Dock = separated floating island below topbar (elib-web docked style, new). Only one bar is fitted/shown at a time |
| Sidebar mode | Full / Icon / Mini / Overlay | Icon = icons + tiny labels, submenus pop **outside** as waterfall cards (renamed from Mini; old `mini` storage auto-migrates to `icon`). Mini = icon-only rail, hover/focus expands to full, leaves collapses. Overlay = hidden rail sliding over content via hamburger + scrim |
| Footer | Sticky / Static | Sticky keeps the footer always visible at the viewport bottom (default: Sticky); at the very bottom it docks back into a plain footer — style only, never persisted |
| Liquid glass | on / off | Kill-switch for all nav-layer glass |
| Language | English / فارسی | Switches dictionary + direction |
| Direction | Auto / LTR / RTL | Auto follows language (FA→RTL) |
| Auto-lock | minutes, `0` = off | Default 15; warning → lock screen |

## 5. Dark / light logic (read this once)

```js
ThemeStore.get()            // {theme, primary, layout, sidebar, hstyle, glass, lang, dir, dirAuto, idleMinutes, toasterPosition}
ThemeStore.set({theme:'dark'})
ThemeStore.set({primary:'#0ea5e9', layout:'horizontal', hstyle:'dock', sidebar:'mini'})
ThemeStore.effectiveTheme() // 'light' | 'dark' (resolves 'system' via OS)
```

- On load the OS preference is detected (`prefers-color-scheme`).
- The OS **change event is honored only if** you never picked a theme manually
  **or** the setting is `System default`. Your explicit choice always wins.
- Sonner toasters + `dir`/`lang` attributes re-sync on every change.

## 6. Layout system

- **Vertical:** sticky glass sidebar. Parent items accordion **inside** the
  sidebar; opening one closes the rest.
- **Icon (renamed from Mini):** icons + tiny text. Opening a parent shows its children in a
  **floating card outside** the sidebar, anchored to the clicked row.
- **Mini (new, icon-only):** 64px rail with icons only; hovering/focusing the rail
  expands it to full width (`pinned` class for touch/keyboard), leaving collapses it.
  Accordion works while expanded.
- **Overlay (new):** rail hidden off-canvas; hamburger slides it over content with the
  shared scrim (overlay click / X / Esc closes). Hamburger is force-visible in this mode.
- **Horizontal:** sidebar hides; top bar shows dropdown menus incl. a
  **mega-menu with images** (offline inline-SVG covers — swap `src` for yours).
  Menus are hover/focus-only: nothing pins on click, moving away closes them.
  When entries overflow the bar width, extras move into a trailing `More ⌄`
  entry automatically (`fitHmenu()` in `app.js`; re-runs on resize, layout
  switch and language change — see §6b).
- **Horizontal styles (two):** `bar` keeps the menu inside the topbar (default);
  `dock` shows a separated floating island bar (`.hnbar > .hnbar-inner > .hmenu`)
  below the topbar in the elib-web docked-island style. `app.js:ensureDockBar()`
  auto-clones the topbar menu so `dock` works on pages without physical `.hnbar`
  markup; `fitHmenu()` only measures the active bar. Toggle via drawer
  `#setHstyle` or `data-hstyle-pick="bar|dock"`.
- **Homepage lock:** `<body data-lock-layout="horizontal">` (only `homepage.html`)
  forces `layout=horizontal`, ignores `ThemeStore.set({layout})` away from it,
  disables layout controls, and that page ships theme + language dropdowns only.
  The homepage is an index describing AdminKit — not the dashboard.
- **Mobile (≤860px):** hamburger toggles the sidebar as an overlay drawer with a grey overlay; overlay click, the X button, or Esc closes it.
- Active states are quiet (neutral gray block), Vercel-style — parents are
  never "active", only the current leaf page is bold. The shared shell is
  identical on all pages; `syncActive()` in `app.js` highlights the current
  file automatically, so no per-page `active` bookkeeping.
- **Footer:** every shell page ends with `<footer class="footer">` (brand +
  tagline + 3 links + auto year); `login.html` uses a compact `.auth-foot`.
  The year follows the locale digits (see §7).

## 6b. Mega menu — how to add one

The horizontal bar supports a normal dropdown **and** a 3-column mega menu.
Copy this pattern inside `<nav class="hmenu">` (every page already has the
same shell, so add it once and copy to all pages, or add it to `index.html`
and re-sync):

```html
<nav class="hmenu" aria-label="Horizontal">
  <!-- 1. mega menu: parent button + .drop.mega with 3 cards -->
  <div>
    <button class="hlink">
      <i class="fa-solid fa-table-columns"></i>
      <span data-i18n="dashboards">Dashboards</span>
      <i class="fa-solid fa-chevron-down" style="font-size:10px"></i>
    </button>
    <div class="drop mega">
      <a href="index.html">
        <img alt="" src="data:image/svg+xml,...your-cover...">
        <span><b>Overview</b><br><small class="muted">KPI + charts</small></span>
      </a>
      <a href="playground-table.html">
        <img alt="" src="data:image/svg+xml,...your-cover...">
        <span><b>Reports</b><br><small class="muted">Tables + export</small></span>
      </a>
      <a href="playground-sonner.html">
        <img alt="" src="data:image/svg+xml,...your-cover...">
        <span><b>Alerts</b><br><small class="muted">Sonner toasts</small></span>
      </a>
    </div>
  </div>
  <!-- 2. normal dropdown: same, but .drop without .mega -->
  <div>
    <button class="hlink">
      <i class="fa-solid fa-cube"></i>
      <span data-i18n="components">Components</span>
      <i class="fa-solid fa-chevron-down" style="font-size:10px"></i>
    </button>
    <div class="drop">
      <a href="playground-buttons.html"><i class="fa-solid fa-circle-dot fa-fw"></i><span data-i18n="buttons">Buttons</span></a>
      <a href="playground-modal.html"><i class="fa-solid fa-window-restore fa-fw"></i><span data-i18n="modal">Modal</span></a>
    </div>
  </div>
  <!-- 3. plain link (no .drop at all): navigates directly -->
  <div><button class="hlink" onclick="App.go('login.html')"><i class="fa-solid fa-key"></i><span data-i18n="auth">Auth</span></button></div>
</nav>
```

Rules:

- `.drop.mega` = 3-column card grid (covers via inline-SVG so it works
  offline; swap the `src` for your own images). Plain `.drop` = vertical link
  list. No `.drop` = direct navigation button.
- Labels with `data-i18n="..."` need matching keys in `i18n/en.json` +
  `i18n/fa.json`.
- Mobile (≤560px) collapses `.mega` to 1 column automatically.
- Overflow is free: if your entries exceed the bar, `fitHmenu()` moves the
  trailing ones into `More ⌄` — no extra markup needed (the `#hMore` node is
  injected by JS).

## 7. i18n + RTL

Dictionaries live **outside** code: `i18n/en.json`, `i18n/fa.json`
(`{"key":"text"}`). Usage in HTML:

```html
<span data-i18n="dashboard">Dashboard</span>
<input data-i18n-ph="searchPh" placeholder="Search…">
```

```js
I18N.apply('fa');                 // swap language at runtime
const d = await I18N.dict('en');  // read raw dictionary
```

**Add a language:** copy `en.json` → `ar.json`, translate values, add
a `<button data-lang="ar">` entry to the top-bar language dropdown **and** an
`<option value="ar">` to `#setLang` in the drawer, and extend the `dirAuto`
rule in `theme.js` if it is RTL. Everything (sidebar, drawer side, switch
direction, datepicker, toasts) follows `document.dir` automatically.

196 keys per language cover the full chrome: nav, top-bar dropdowns
(theme/lang/notifications/profile), mega-menu labels, drawer groups, footer,
playground headings, login form + validation messages,
table/dropdown/datepicker/modal labels. JS modules take translated strings as options (never hardcoded):

```js
const d = await I18N.dict(ThemeStore.get().lang);
new DataGrid(el, {…, strings:{ search:d.tblSearch, columns:d.tblColumns,
  showing:d.tblShowing, from:d.tblFrom, page:d.tblPage,
  perPage:d.tblPerPage, noRows:d.tblNoRows }});
new NiceSelect(el, {…, searchPh:d.ddSearchPh, noResults:d.ddNoResults });
new DatePicker(el, {…, }); // labels via picker.setStrings({today:d.dpToday,…})
Modal.confirm({…, okLabel:d.mOk, cancelLabel:d.mCancel });
document.addEventListener('app:lang', () => rebuildWithNewStrings());
```

`App.setLang()` applies the dictionary **and** fires `app:lang` so live
modules rebuild in the new language.

**Persian digits:** digits are never rewritten — they stay plain Latin (`0-9`)
in the DOM everywhere (values, exports, sorting and search untouched). Their
*look* follows the locale through fonts alone: in `fa` mode the vendored
B Koodak face (digit-only `unicode-range`, Persian-style drawings shared
across Latin/Arabic-Indic/Persian codepoints) renders every digit Persian;
in `en` mode the same characters render in Inter. Persian text stays
Vazirmatn via its own range, so each script always gets its correct font.

## 8. Sonner toasts (exact vanilla port of `emilkowalski/sonner`)

CSS is a **verbatim copy** of upstream `styles.css` (`assets/css/sonner.css`);
behavior (stacking math, swipe physics, promise flow) is ported 1:1 to
`assets/js/sonner.js`. Originals kept in `_source/sonner/`.

```html
<link rel="stylesheet" href="assets/css/sonner.css">
<script src="assets/js/sonner.js"></script>
```

```js
toast('Plain message');
toast.success('Saved', { description: 'Hello world', richColors: true });
toast.error('Failed', { description: 'See logs', closeButton: true });
toast.info('Heads up'); toast.warning('Careful');
toast.loading('Uploading…');                       // persists until updated/dismissed

const id = toast.loading('Uploading…');
toast.success('Uploaded', { id });                 // update in place by id

toast('Undoable', {
  action: { label: 'Undo', onClick: () => toast('Undone') },
  cancel: { label: 'Later', onClick(){} },
});
toast('Pinned', { dismissible: false, duration: Infinity,
  action: { label: 'Got it', onClick(){} } });

toast.promise(fetch('/api').then(r => r.json()), {
  loading: 'Loading…',
  success: (d) => ({ message: 'Done', description: d.name }), // or a string
  error: (e) => ({ message: 'Failed', description: String(e.message), richColors: true }),
  finally: () => console.log('settled'),
}).unwrap().then(d => …).catch(e => …);            // note: unwrap() is a FUNCTION

toast.custom(toast.html('<b>Any</b> HTML'));       // custom content
toast.dismiss();                                   // all
toast.dismiss(id);                                 // one
toast.getHistory().length;                         // last 100, dismissed incl.
toast.getToasts().length;                          // currently active
```

**Per-toast options:** `id, description, duration` (ms, default `4000`,
`Infinity` = sticky), `closeButton, dismissible (default true), invert,
richColors, icon` (HTML string / `toast.html()` / DOM node),
`style` (inline CSS object), `className/classNames, position`
(`top-left|top-center|top-right|bottom-left|bottom-center|bottom-right` —
a second dock appears automatically), `onDismiss, onAutoClose, testId,
unstyled, actionButtonStyle, cancelButtonStyle`.

**Toaster options** (`Sonner.createToaster({...})`, one auto-mounts):

```js
Sonner.createToaster({ position:'bottom-right', theme:'system', richColors:false,
  expand:false, duration:4000, visibleToasts:3, gap:14, offset:'24px',
  mobileOffset:'16px', dir:'auto', closeButton:false, invert:false,
  swipeDirections:['top','right'], hotkey:['altKey','KeyT'] });
Sonner.setPosition('top-center');   // also persists to settings
Sonner.setTheme('dark');
```

Behavior notes: hover expands the stack, hover/interaction/hidden-tab pauses
timers, swipe (mouse + touch, velocity-aware) dismisses, `Alt+T` expands,
`Esc` collapses, history capped at 100 like upstream. The playground adds a
rich-colors gallery (every type + action/promise/invert variants), a recipes
card (per-toast dock, custom icon/style, sticky note, `unwrap()` logging),
a live event log, and a Toaster rebuild panel (expand/rich/close/visible/gap).

## 9. Modal (Radix Dialog + shadcn styling port)

```html
<script src="assets/js/modal.js"></script>
```

```js
const h = Modal.open({
  title: 'Delete?', desc: 'This cannot be undone.', body: '<p>HTML</p>', // or bodyNode
  footer: '<button class="btn btn-ghost" data-modal-close>Cancel</button>',
  size: 'md',              // sm | md | lg | xl | full
  showClose: true, scrollable: true, stickyFooter: true,
  modal: true,             // false = page keeps scrolling, no scroll-lock
  dismissEsc: true, dismissOutside: true,
  onOpenChange: (open) => {}, onClose: (why) => {},  // why: 'esc'|'outside'|'close-btn'|…
});
h.close('done'); h.dlg; Modal.closeAll();

const ok = await Modal.confirm({ title:'Delete item?', desc:'…' }); // true/false
// translated confirm buttons:
const ok2 = await Modal.confirm({ title:d.x, okLabel:d.mOk, cancelLabel:d.mCancel });
```

**No-JS triggers** (like Radix Trigger/Content composition):

```html
<button data-modal-target="#tplHello" data-modal-size="md">Open</button>
<template id="tplHello" data-title="Hello" data-desc="Zero JS">…body…</template>
```

Focus is trapped, `Esc`/overlay dismiss, background scroll locks, ARIA
labelledby/describedby, enter animation is keyframed (always plays).

## 10. Table (`DataGrid` — DataTables-like, lightweight)

```html
<script src="assets/js/table.js"></script>
```

```js
const grid = new DataGrid(document.getElementById('grid'), {
  columns: [{key:'name',title:'Name'},{key:'email',title:'Email'}],
  rows: [{name:'Sara',email:'s@x.io'}],
  pageSize: 8, search: true, paging: true,
  pagerWindow: 5,     // numbered window size: < 1 … 4 5 6 … 12 >
  exports: true,    // CSV + Excel (.xls) + Copy buttons
  colToggle: true,  // "Columns (n/m)" popover with switches
  info: true,       // "Showing 1–8 from 12"
});
grid.destroy(); // unbinds document listeners
```

- Pager is `< prev | 1 2 3 4 | next >`: chevrons + windowed numbers + `…` ellipsis
  (7+ pages). Current page is a filled pill (`aria-current="page"`), chevrons
  disable at the ends. RTL mirrors automatically.
- Toolbar builds **once** (typing never loses focus); only rows repaint.
- Column popover never rebuilds on toggle — no flicker, stays open.
- Exports respect current search/sort/visible columns.
- **VB.NET migration:** it renders a plain `<table>` from a JSON array —
  serialize your `DataTable` to the same shape and reuse everything.

## 11. Dropdown (`NiceSelect` — react-select-like)

```html
<script src="assets/js/dropdown.js"></script>
```

```js
new NiceSelect(document.getElementById('country'), // upgrades a real <select>
  { search: true, placeholder: 'Select…', onChange: v => console.log(v) });
new NiceSelect(document.getElementById('mount'),
  { options: [{value:'a',label:'Alpha'}], value: 'a', onChange… });
sel.setOptions([…]); // refresh choices later
sel.destroy();        // unbind + unwrap (restores a wrapped <select>)
```

Search-on-type, ↑↓ + Enter + Esc keyboard, ✓ on selected, closes on
outside click. Proper listbox semantics (`combobox` button with
`aria-expanded`, `role=option` + `aria-selected` rows, highlighted row kept
in view). Translated via `searchPh`/`noResults` options (§7). Country/dial-code
lists are plain option arrays — edit freely.

## 12. Date picker (Jalali math = exact `jalaali-js` vendor)

```html
<script src="assets/js/jalaali-vendor.js"></script>
<script src="assets/js/datepicker.js"></script>
```

```js
new DatePicker(document.getElementById('birth'), {
  locale: 'fa',                 // 'fa' | 'en'
  format: 'jYYYY/jMM/jDD',      // j-tokens = Jalali, plain = Gregorian
  months: 2,                    // 1 = single month (default) | 2 = two side-by-side
  min: new Date(2020,0,1), max: null,
  presets: true,                // Today / Now buttons
  onChange: d => console.log(d) // Date | null
});
picker.setMonths(2);            // switch at runtime (re-draws)
picker.setLocale('en');
picker.setStrings({ today:d.dpToday, clear:d.dpClear, now:d.dpNow });
```

Popup has month/year jump selects, Today/Clear, min/max disabling, RTL-aware
placement. `months:2` renders two months side-by-side (`.dp-dual`, stacks on
mobile); arrows step one month. Conversion calls the vendored `jalaali.toJalaali/toGregorian/
jalaaliMonthLength` (Intl fallback only if the vendor file is missing).

## 13. Buttons (Vercel-quiet)

`btn btn-primary|success|info|warning|danger|ghost|outline|soft|glass`
+ `btn-sm|btn-lg`, `btn-round|btn-sq`. Primary inverts with the theme
(dark-on-light, light-on-dark) like Geist; the rest are flat and subtle.
Icon-only: reuse `icon-btn` + any `fa-*` icon. Full set demoed in
`playground-buttons.html`.

## 13b. Tabs (`Tabs` — underline / pills / vertical)

```html
<script src="assets/js/tabs.js"></script>
<div class="tabs" data-tabs="g1">
  <button class="tab-btn" data-tab="a" aria-selected="true">One</button>
  <button class="tab-btn" data-tab="b">Two</button>
</div>
<div class="tab-panel" data-panel="g1:a">…</div>
<div class="tab-panel" data-panel="g1:b" hidden>…</div>
```

```js
Tabs.select('g1','b'); // programmatic
```

ArrowLeft/Right (RTL aware) + Home/End move, click selects. Variants:
default underline, `.tabs-pills`, `.tabs-vertical` wrapper. Live lab:
`playground-tabs.html`.

## 13c. Tooltip (CSS-only `data-tip`)

```html
<button class="btn btn-ghost" data-tip="Save changes">Save</button>
<button data-tip="Left" data-pos="left">Left</button> <!-- top|bottom|left|right -->
```

Zero JS (focus shows it too). Live lab: `playground-tooltip.html`.

## 13d. Carousel (`Carousel` — 5 types, mouse drag)

```html
<script src="assets/js/carousel.js"></script>
<div class="car" data-car="slide"><!-- slide|fade|auto|thumbs|marquee -->
  <div class="car-track"><div class="car-slide">…</div><div class="car-slide">…</div></div>
</div>
```

Slide (arrows + dots + drag), fade (crossfade), auto (`data-interval`, progress
bar, hover pauses), thumbs (thumbnail strip), marquee (infinite loop, hover
pauses). 40px drag threshold, RTL aware, `prefers-reduced-motion` safe.
Live lab: `playground-carousel.html`.

## 13e. Grid (12-col, `col-*` → `col-xl-*`)

```html
<div class="row">
  <div class="col-12 col-md-6 col-xl-4">…</div>
  <div class="col-12 col-md-6 col-xl-4">…</div>
</div>
```

Breakpoints `sm≥576 md≥768 lg≥992 xl≥1200`; base `col-*` is mobile-first,
un-prefixed columns stack full-width below 576. Keep `.grid.cols-2/.cols-21/.kpi`
for simple cases; use `.row/.col-*` for sm→xl control. Live lab + docs:
`playground-grid.html`.

## 13f. Input group (addons + buttons)

```html
<div class="igroup">
  <span class="ig-add"><i class="fa-solid fa-magnifying-glass"></i></span>
  <input placeholder="Search…">
  <button class="btn btn-primary">Go</button>
</div>
```

`.ig-add` = text/icon addon, plain `.btn` = button addon, sizes
`.igroup-sm/.igroup-lg`, RTL mirrors. Live lab: `playground-inputgroup.html`.

## 13g. Shop (`Shop`) + Tickets (`Tickets`) + Errors

```js
Shop.add('p1'); Shop.setQty('p1',3); Shop.remove('p1'); Shop.clear();
Shop.lines(); Shop.subtotal(); Shop.count(); // badge: [data-cart-count]
document.addEventListener('shop:change', ()=>Shop.updateBadges());
Tickets.create({title,desc,prio}); Tickets.reply(id,text); Tickets.setStatus(id,'closed');
```

Cart persists (`adminkit.cart.v1`), tickets persist (`adminkit.tickets.v1`),
both offline. Errors `401/403/404/500.html` are standalone Vercel-style cards
(big code, icon, homepage + dashboard buttons, i18n title/desc).

## 14. Auth page (`login.html`)

- Tabs: Login (email + password) / Register (name + email + phone + password).
- Phone = dial-code `<select>` (8 countries — extend in HTML) + number input;
  stored value is `code + number`.
- Rules: valid email · password ≥ 8 chars with letter + number · name ≥ 3 ·
  phone 7–14 digits. Errors render under fields; success toasts + redirects.
- Split-screen showcase panel on desktop, stacked form on mobile.

## 15. Idle detection + lock screen

```js
Idle.tick();            // restart the countdown manually (cancels any pending warning first)
Idle.cancel();          // cancel pending timeout + warning countdown + hide warning card
Idle.setWarnSecs(30);   // warning window seconds (default 60)
```

- Any pointer/key/wheel/touch bumps the last-activity timestamp.
- After `idleMinutes` (settings, `0` = off): warning card with live progress
  bar + countdown. **Stay** dismisses and restarts; **Leave** locks now.
- Warning length = `min(60s, half the interval)` so short timeouts (e.g. 1
  minute) still work. Changing the interval calls `Idle.tick()`, which cancels
  the previous pending timeout **and** any running warning countdown.
- The countdown digits follow the locale (`fa` → Persian digits).
- Lock screen has **no PIN** — one big button returns to the workflow and
  restarts the interval. Elements required per page: `#idleWrap #idleBar
  #idleTxt #idleStay #idleLeave #lockWrap #lockBtn` (all playgrounds +
  dashboard include them).

## 16. Offline assets (all local, zero network)

| Asset | Location | Notes |
|---|---|---|
| Inter 400–800 (latin) | `assets/fonts/inter-*.woff2` | EN UI font |
| Vazirmatn 400–900 (arabic subset = Persian) | `assets/fonts/vazirmatn-*.woff2` | auto-used when `lang=fa` |
| B Koodak Bold, subset to digits only (~2 KB) | `assets/fonts/bkoodak-700.woff2` | FA digits render Persian via `unicode-range` (`U+0030–0039,U+0660–0669,U+06F0–06F9`) |
| Font Awesome 6.5.2 css | `assets/vendor/fontawesome/all.min.css` | unmodified |
| FA webfonts (solid/regular/brands/v4compat) | `assets/vendor/webfonts/` | relative `../webfonts/` intact |
| Jalali math (jalaali-js UMD) | `assets/js/jalaali-vendor.js` | byte-identical vendor |

Swap fonts by dropping same-named `.woff2` files in place. **Zero emojis
anywhere** — every icon is `<i class="fa-solid fa-…">` (Sonner keeps its own
upstream SVGs untouched as part of the exact port).

## 17. Liquid glass (the honest version)

Researched from Apple HIG + WWDC25 + established web implementations:

- **Real lensing**: SVG `feTurbulence → feDisplacementMap` (`#ak-liquid`,
  injected once by `app.js`) fed into the topbar as
  `backdrop-filter: … url('#ak-liquid')` behind
  `@supports (backdrop-filter: url('#ak-liquid'))` → Chromium refracts for
  real; Safari/Firefox fall back to frost. One refractive surface only
  (displacement has real GPU cost). Bar content stays crisp (only backdrop warps).
- **Specular system**: 4-sided inset rim (top brightest), edge gleam on
  sidebar/drawer, thicker-glass treatment on transient menus.
- **Navigation layer only** (Apple's rule): topbar, sidebar, drawer, modal,
  popovers. Cards, auth, buttons are solid — never glass-on-glass.
- **Scroll edge effect**: scrolled content deepens bar blur + shadow.
- **Kill-switch + a11y**: drawer toggle sets `data-glass=off` (all solid);
  `prefers-reduced-transparency` also collapses to solid.

## 18. Turbo Drive navigation (Hotwired, vendored offline)

Like `elib-web`, every click between pages goes through **Turbo Drive**
(`assets/vendor/turbo/turbo.es2017-umd.min.js`, v8.0.12, MIT © 37signals —
same file elib-web loads from CDN, but vendored here so it works offline).
Only `<body>` swaps; theme, settings and toast history survive the visit, with
a primary-colored progress bar on top.

```html
<script src="assets/vendor/turbo/turbo.es2017-umd.min.js" defer></script>
```

```js
App.go('playground-table.html'); // Turbo.visit() when present, full load otherwise
```

Rules for future code (this is where naive ports break):

- **One identical `<head>` everywhere:** all 15 library scripts live in
  `<head>` in the same order on every page (`theme → i18n → sonner → modal →
  table → dropdown → jalaali → datepicker → tabs → tooltip → carousel → shop →
  tickets → idle → app`). Turbo merges
  identical heads (no re-execution, no async race); only per-page **inline**
  body scripts re-run per visit, with every global already defined. Never add
  a page-specific library to just one page — append it to the shared order.
- **Inline scripts must be re-runnable:** use `var`/function declarations,
  never top-level `const`/`let` (re-execution would throw "already declared").
- **Init on both events:** page widgets boot in `turbo:load` as well as
  `DOMContentLoaded` (Turbo fires `turbo:load` on every visit, including the
  first). All shell modules already do.
- **Never stack document listeners:** `app.js` keeps every document/window
  binding in a list — `App.teardown()` removes them on `turbo:before-render`,
  then `initShell()` rebinds the fresh DOM. Copy that pattern, not bare
  `addEventListener`.
- **One-shot globals are guarded:** `matchMedia`, activity trackers, modal
  triggers use `window.__ak*` flags so re-executed scripts don't double-bind.
- **Ephemerals die on navigation:** the default Sonner toaster is destroyed on
  `turbo:before-render` (recreated on load, active toasts replay); open modals
  `closeAll()` on `turbo:before-visit`; grids/selects expose `destroy()`.
- **Forms are safe:** handlers call `preventDefault()` first, which Turbo
  respects — login validation runs unchanged, no page submit.
- **Anchors work:** `#overview` scrolls in-page; cross-page `#analytics`
  visits then scrolls.
- **`file://` degrades gracefully:** Drive needs `fetch`, so double-clicked
  files fall back to full-page loads automatically. Serve over HTTP (§2) for
  instant visits.

## 19. Project structure

```
adminkit/
├── homepage.html               locked-horizontal index (theme + lang only)
├── index.html                  dashboard
├── products.html · cart.html   shop demo (Shop store)
├── gallery.html                gallery + Modal lightbox
├── tickets.html                support desk (Tickets store)
├── 401/403/404/500.html        Vercel-style error cards
├── login.html                  auth
├── playground-*.html           11 module labs (sonner/modal/table/dropdown/datepicker/buttons/tabs/tooltip/carousel/grid/inputgroup)
├── assets/css/theme.css        design system (light + graphite dark) + sidebar modes + dock + grid + pager + shop/gallery/tickets/errors/home
├── assets/css/sonner.css       VERBATIM upstream sonner styles
├── assets/css/components.css   modal/table/dropdown/datepicker/buttons/auth + tabs/tooltip/carousel/input-group
├── assets/js/theme.js          settings store (ThemeStore)
├── assets/js/i18n.js           dictionary loader (I18N)
├── assets/js/sonner.js         Sonner port (toast + Sonner)
├── assets/js/modal.js          dialog port (Modal)
├── assets/js/table.js          grid (DataGrid, numbered < 1 2 3 4 > pager)
├── assets/js/dropdown.js       select (NiceSelect)
├── assets/js/jalaali-vendor.js exact jalaali-js build
├── assets/js/datepicker.js     picker UI (DatePicker, months:1|2)
├── assets/js/tabs.js           tabs (Tabs)
├── assets/js/tooltip.js        tooltip docs (CSS-only)
├── assets/js/carousel.js       carousel (Carousel, 5 types + drag)
├── assets/js/shop.js           cart store (Shop)
├── assets/js/tickets.js        ticket store (Tickets)
├── assets/js/idle.js           idle + lock (Idle)
├── assets/js/app.js            shell wiring + Turbo lifecycle (init/teardown)
├── assets/fonts/               Inter + Vazirmatn woff2
├── assets/vendor/turbo/        Hotwired Turbo 8 UMD (offline Drive)
├── assets/vendor/              Font Awesome css + webfonts
├── i18n/en.json · fa.json      dictionaries (273 keys each — add languages here)
└── _source/                    upstream originals for audit
```

## 20. localStorage reference

| Key | Shape |
|---|---|
| `adminkit.settings.v2` | `{theme:'system', primary:'#f59e0b', layout:'vertical', sidebar:'full', hstyle:'bar', footerSticky:true, glass:true, lang:'en', dir:'ltr', dirAuto:true, idleMinutes:15, toasterPosition:'bottom-right'}` |
| `adminkit.sidebarMigrated.v1` | `'1'` once old `sidebar:mini` was migrated to `icon` |
| `adminkit.cart.v1` | `{productId: qty}` shop cart |
| `adminkit.tickets.v1` | `[{id,title,desc,status,prio,date,replies}]` support desk |
| `adminkit.seen` | `'1'` once the settings drawer auto-opened |

## 21. Keyboard shortcuts & accessibility

| Keys | Action |
|---|---|
| `Alt+T` | Expand toast stack |
| `Esc` | Collapse toasts · close modal · close dropdown/popover · close drawer |
| `↑ ↓ Enter` | Navigate searchable dropdown + command-palette search |

- Skip-to-content link injected on every page (auto-translated).
- Dropdown exposes `combobox`/`listbox`/`option` roles; table sort headers are
  real `<button>`s with `aria-sort`; dialogs carry `aria-modal` + labelledby.
- `prefers-reduced-motion` disables animation system-wide;
  `prefers-reduced-transparency` collapses glass to solid.

## 22. FAQ / troubleshooting

- **Persian doesn't apply on double-click:** `fetch()` needs HTTP. Serve the
  folder (§2, option B). Everything else works on `file://`.
- **Old theme came back:** v1 settings key is ignored; v2 applies fresh
  defaults (amber accent). Clear site data to reset fully.
- **Icons show as boxes:** serve over HTTP with `assets/vendor/` intact; check
  `all.min.css` → `../webfonts/` relative path.
- **`toast.loading` never disappears:** by design (upstream too) — update it
  by `id` or `dismiss(id)`.
- **Toasts invisible in mini layout:** they dock to viewport corners, not the
  sidebar — check `Sonner.setPosition`.
- **Why no Tailwind:** Play CDN needs internet; a vendored build needs npm.
  Hand-rolled component CSS (~20 KB) keeps plain-HTML offline loading.

## 23. Sources & licenses

- Sonner — `emilkowalski/sonner` (MIT): styles verbatim, behavior ported.
- Turbo — `@hotwired/turbo` v8 (MIT © 37signals): UMD vendored, Drive enabled.
- Dialog — `radix-ui/primitives` (MIT) + shadcn/ui dialog styling (MIT).
- Jalali math — `jalaali/jalaali-js` (MIT), byte-identical vendor.
- Font Awesome 6.5.2 (icons CC-BY-4.0, code MIT) via cdnjs, vendored.
- Inter (OFL, Fontsource), Vazirmatn (OFL, Fontsource), vendored.
- Modern language lessons: `IntellsGamer/elib-web`, `IntellsGamer/manus-xray`
  (principles studied, no code copied). See `SOURCES.md`.

---

# PART 2 — فارسی

## ۱. این چیست؟

ادمین‌کیت یک قالب مدیریتی کامل و آفلاین است: داشبورد، ورود/ثبت‌نام، و برای
**هر ماژول یک صفحه جدا (playground)** — هم برای تست زنده، هم برای کپی کردن
کد در توسعه‌های بعدی.

| قول | روش |
|---|---|
| بدون اینترنت کار می‌کند | همه CSS/JS/فونت/آیکون داخل پروژه |
| روشن/تیره خودکار با سیستم | `matchMedia` + شنونده تغییر، با شرط (بخش ۵) |
| انگلیسی + فارسی با RTL کامل | دیکشنری جدا `i18n/*.json` (بخش ۷) |
| تنظیمات ذخیره می‌شود | همه در `localStorage` (بخش ۱۹) |
| استفاده مجدد آسان | برای هر ماژول فقط یک آبجکت سراسری |

## ۲. شروع سریع

**راه اول — باز کردن مستقیم:** روی `index.html` دابل‌کلیک کنید.
نکته: روی `file://` دیکشنری زبان با `fetch` خوانده نمی‌شود؛ برای فارسی کامل
از راه دوم استفاده کنید.

**راه دوم — سرور محلی (پیشنهادی):**

```bash
cd adminkit
python3 -m http.server 8000 --bind 0.0.0.0
# باز کنید: http://localhost:8000/index.html
```

**راه سوم — هر هاست استاتیک:** همین پوشه را آپلود کنید (GitHub Pages،
Nginx، IIS، پوشه `wwwroot` در VB.NET و…). هیچ کد سمت سرور لازم نیست.

## ۳. صفحه‌ها

| فایل | محتوا | کاربرد |
|---|---|---|
| `index.html` | داشبورد: هیرو، کارت‌های KPI با نمودار و درصد، فعالیت، قفل | صفحه اصلی |
| `login.html` | ورود/ثبت‌نام دو ستونه: اینپوت آیکون‌دار، نمایش رمز، پیش‌شماره کشور، اعتبارسنجی آفلاین | احراز هویت |
| `playground-sonner.html` | آزمایشگاه اعلان: همه نوع‌ها، گالری رنگی، دستورها، لاگ رویداد، بازسازی زنده | یادگیری `toast` |
| `playground-modal.html` | آزمایشگاه مودال: اندازه‌ها، فوتر چسبان، تأیید، تریگر قالبی | یادگیری `Modal` |
| `playground-table.html` | آزمایشگاه جدول: جستجو/مرتب/صفحه/خروجی/ستون‌ها + کلیدهای ماژول | یادگیری `DataGrid` |
| `playground-dropdown.html` | دراپ‌داون جستجوشو | یادگیری `NiceSelect` |
| `playground-datepicker.html` | تقویم شمسی + میلادی | یادگیری `DatePicker` |
| `playground-buttons.html` | ست کامل دکمه + دکمه آیکونی | کپی کلاس دکمه |

## ۴. تنظیمات پوسته

**نوار بالا:** همبرگر (موبایل) · منوهای افقی · جستجو · دکمه چیدمان
(عمودی/افقی) · نقطه رنگ · خورشید/ماه · EN/فا · چرخ‌دنده.

**کشوی تنظیمات** (سمت **مخالف** سایدبار؛ در **اولین بازدید خودش باز می‌شود**):
پوسته (سیستم/روشن/تیره) · رنگ اصلی (پیش‌فرض کهربایی `#f59e0b`) · چیدمان منو ·
حالت سایدبار (کامل/مینی با پاپ‌آپ شناور) · فوتر (چسبان/عادی) · شیشه مایع · زبان · جهت (خودکار:
فارسی→راست‌به‌چپ) · قفل خودکار (دقیقه، `۰` = خاموش).

## ۵. منطق روشن/تیره

```js
ThemeStore.get()            // همه تنظیمات
ThemeStore.set({theme:'dark'})
ThemeStore.set({primary:'#0ea5e9', layout:'horizontal'})
ThemeStore.effectiveTheme() // 'light' یا 'dark'
```

- با `prefers-color-scheme` تم سیستم خوانده می‌شود.
- تغییر تم سیستم فقط وقتی اعمال می‌شود که **شما دستی تم انتخاب نکرده باشید**
  یا گزینه روی **پیش‌فرض سیستم** باشد. انتخاب دستی شما همیشه برنده است.

## ۶. سیستم چیدمان

- **عمودی:** سایدبار شیشه‌ای. باز کردن یک آیتم، بقیه را می‌بندد (آکاردئون).
- **مینی:** فقط آیکون + لیبل کوچک؛ زیرمنو **بیرون** سایدبار به‌صورت کارت شناور.
- **افقی:** سایدبار مخفی؛ منوی بالا با **مگامنوی تصویردار** (عکس‌ها SVG آفلاین‌اند؛ `src` را عوض کنید).
- **موبایل:** همبرگر سایدبار را به‌صورت کشویی باز می‌کند.

## ۷. چندزبانگی و RTL

فایل‌ها بیرون از کدند: `i18n/en.json` و `i18n/fa.json`. در HTML:

```html
<span data-i18n="dashboard">Dashboard</span>
```

```js
I18N.apply('fa');
```

**افزودن زبان:** از `en.json` کپی بگیرید، ترجمه کنید، به `<select>` اضافه کنید.
اگر راست‌به‌چپ است، قانون `dirAuto` در `theme.js` را گسترش دهید. بقیه (سایدبار،
کشو، سوییچ، تقویم، اعلان‌ها) خودکار با `document.dir` همراه می‌شوند.

## ۸. اعلان‌های Sonner (پورت دقیق نسخه React)

```js
toast.success('ذخیره شد', { description:'سلام دنیا', richColors:true });
toast.error('خطا', { description:'لاگ را ببین', closeButton:true });
const id = toast.loading('در حال آپلود…');
toast.success('تمام شد', { id });                 // آپدیت با همان id
toast('اقدام', { action:{label:'بازگردانی', onClick:()=>{}}, cancel:{label:'بعداً', onClick(){}} });
toast.promise(fetch('/api').then(r=>r.json()), {
  loading:'…', success:(d)=>'تمام شد', error:'خطا',
}).unwrap().then(…).catch(…);                      // دقت: unwrap() تابع است
toast.dismiss(); toast.dismiss(id);
Sonner.setPosition('top-center');                  // ۶ گوشه پشتیبانی می‌شود
```

گزینه‌های هر اعلان: `duration` (پیش‌فرض ۴۰۰۰، `Infinity` = ماندگار)،
`closeButton, dismissible, invert, richColors, icon, style, position,
onDismiss, onAutoClose`. هاور استک را باز می‌کند و تایمر را نگه می‌دارد؛
سوایپ (ماوس + لمسی) می‌بندد؛ `Alt+T` باز، `Esc` جمع می‌کند؛ تاریخچه تا ۱۰۰ عدد.

## ۹. مودال

```js
Modal.open({ title:'مطمئنی؟', desc:'…', body:'<p>…</p>', footer:'…',
  size:'md', showClose:true, scrollable:true, stickyFooter:true,
  modal:true, dismissEsc:true, dismissOutside:true,
  onClose:(why)=>{} });
const ok = await Modal.confirm({ title:'حذف؟', desc:'…' }); // true/false
```

تریگر بدون JS با `data-modal-target="#tpl"` + تگ `<template>`. فوکوس حبس
می‌شود، `Esc`/کلیک بیرون می‌بندد، اسکرول صفحه قفل می‌شود.

## ۱۰. جدول

```js
const grid = new DataGrid(document.getElementById('grid'), {
  columns:[{key:'name',title:'نام'}], rows:[{name:'سارا'}],
  pageSize:8, search:true, paging:true, exports:true, colToggle:true, info:true,
});
grid.destroy();
```

نوار ابزار یک بار ساخته می‌شود (فوکوس جستجو هرگز نمی‌پرد)؛ فقط بدنه جدول
از نو رسم می‌شود. پاپ‌آور ستون‌ها هنگام تیک زدن باز می‌ماند. خروجی‌ها
(CSV/Excel/Copy) جستجو و مرتب‌سازی فعلی را رعایت می‌کنند.
**مهاجرت به VB.NET:** خروجی یک `<table>` ساده از آرایه JSON است — همان شکل را
از `DataTable` سریالایز کنید و همه‌چیز را نگه دارید.

## ۱۱. دراپ‌داون

```js
new NiceSelect(document.getElementById('country'), { search:true, onChange:v=>… });
sel.setOptions([{value:'a',label:'آلفا'}]);
```

جستجو هنگام تایپ، کیبورد (↑↓ Enter Esc)، تیک گزینه انتخاب‌شده، بستن با کلیک بیرون.

## ۱۲. تقویم

```js
new DatePicker(input, { locale:'fa', format:'jYYYY/jMM/jDD',
  min:new Date(2020,0,1), max:null, presets:true, onChange:d=>… });
```

پرش ماه/سال، امروز/پاک، غیرفعال‌سازی با min/max، جای‌گیری سازگار با RTL.
توکن‌های `jYYYY/jMM/jDD` شمسی‌اند؛ بقیه میلادی.

## ۱۳. دکمه‌ها

`btn btn-primary|success|info|warning|danger|ghost|outline|soft|glass` به‌علاوه
`btn-sm|btn-lg` و `btn-round|btn-sq`. دکمه اصلی با تم معکوس می‌شود (تیره در
روشن، روشن در تیره)؛ بقیه تخت و آرام‌اند.

## ۱۴. ورود/ثبت‌نام

تب ورود (ایمیل + رمز) و ثبت‌نام (نام + ایمیل + تلفن + رمز). تلفن = انتخاب
پیش‌شماره (۸ کشور — در HTML اضافه کنید) + شماره؛ مقدار نهایی «کد + شماره» است.
قوانین: ایمیل معتبر · رمز ≥ ۸ کاراکتر شامل حرف + عدد · نام ≥ ۳ · تلفن ۷ تا ۱۴
رقم. خطا زیر فیلد، موفقیت با اعلان + هدایت.

## ۱۵. تشخیص بیکاری + قفل

```js
Idle.tick(); Idle.setWarnSecs(30);
```

هر تعاملی تایمر را صفر می‌کند. بعد از `idleMinutes` (صفر = خاموش): کارت هشدار
با نوار پیشرفت و شمارش معکوس — **ماندن** برمی‌گرداند و تایمر را از نو می‌سازد،
**ترک** فوری قفل می‌کند. طول هشدار = کمینه ۶۰ ثانیه و نصف بازه. صفحه قفل
**پین ندارد** — یک دکمه بزرگ «بازگشت به کار» بازه را از نو شروع می‌کند.

## ۱۶. فایل‌های آفلاین

فونت Inter و وزیرمتن (`assets/fonts/`)، فونت‌Awesome نسخه ۶٫۵٫۲
(`assets/vendor/`)، موتور شمسی (`jalaali-vendor.js`) — همه محلی، بدون حتی یک
درخواست شبکه. برای تعویض فونت، فایل هم‌نام را جایگزین کنید. هیچ ایموجی در
پروژه نیست؛ همه آیکون‌ها `<i class="fa-solid …">` هستند.

## ۱۷. شیشه مایع (نسخه صادقانه)

طبق HIG اپل و پیاده‌سازی‌های معتبر وب: شکست نور واقعی با
`feTurbulence → feDisplacementMap` فقط در نوار بالا و فقط در کرومیوم (بقیه
مرورگرها شیشه مات می‌بینند)؛ لبه‌های نورانی چهارطرفه؛ شیشه فقط در لایه
ناوبری (نوار، سایدبار، کشو، مودال، پاپ‌آورها) — کارت‌ها و دکمه‌ها مات‌اند؛
افکت لبه اسکرول؛ کلید خاموش + احترام به `prefers-reduced-transparency`.

## ۱۸ تا ۲۴

ساختار پروژه، توربو، کلیدهای `localStorage`، میانبرها و دسترس‌پذیری، عیب‌یابی
و منابع — عیناً مطابق بخش‌های 18 تا 24 انگلیسی بالا (کلید تنظیمات
`adminkit.settings.v2`، میانبر `Alt+T` و `Esc`، توربوی آفلاین، منابع MIT در
`SOURCES.md`). دیکشنری‌ها اکنون ۱۵۵ کلید در هر زبان‌اند و رشته‌های جدول،
دراپ‌داون، تقویم و مودال هم از همان JSON می‌آیند.

---

*AdminKit — built offline-first. EN + FA. No CDN. No emojis.*
