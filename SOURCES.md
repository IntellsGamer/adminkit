# Exact-port sources (read first, then ported — not rewritten from memory)

Every ported module below was fetched from its upstream repo and vendored for
audit. Behavior, math, data-attributes and styling were replicated 1:1 so the
original styles/logic work unchanged in plain offline HTML/JS.

## 1. Sonner (toast) — `emilkowalski/sonner` (MIT)
Upstream files (vendored in `_source/sonner/`):
- `src/styles.css` (729 lines) → copied **VERBATIM** to `assets/css/sonner.css`
- `src/state.ts` (Observer, `toast` API, `promise`, history cap 100,
  `requestAnimationFrame` pending dismissals, HTTP-response + Error handling)
  → ported to `assets/js/sonner.js` (`class Observer`, same methods)
- `src/index.tsx` (Toast + Toaster: 6 positions, stacking math
  `--toasts-before/--offset/--initial-height`, swipe physics with dampening +
  velocity check, pause-on-hover/interact/hidden, `Alt+T` / `Esc`, richColors,
  invert, expand, `visibleToasts=3`, `gap=14`, offsets, `dir=auto`, heights
  tracking) → ported to `createToaster()` in `assets/js/sonner.js` using the
  **identical `data-sonner-*` attributes and CSS vars**
- `src/assets.tsx` (success/info/warning/error + close SVGs, 12-bar Loader)
  → exact SVG strings in `sonner.js` (`ICONS`, `loaderHTML`)
- `src/types.ts` (positions, ToastT/ToasterProps) → same option names
- Animation fixes found by driving headless Chrome over CDP and sampling
  `getComputedStyle`/`getAnimations()` frame-by-frame (all four paths
  measured: enter curve 0.02→1.0 over 400ms with transitions `running`;
  stack offsets in exact 14px/0.05 steps; front-toast exit sliding down +
  fading; remaining stack gliding up 0.95→1.0 on promote):
  `--front-toast-height` refreshed on **every** render (was set once →
  stacked toasts collapsed); double-`requestAnimationFrame` mount PLUS a
  forced synchronous layout while `data-mounted=false` (a fresh node has no
  before-change style, so without the reflow the flip computes straight to
  final state); render() no longer re-appends in-place nodes — unconditional
  `appendChild` disconnects+reinserts, which cancels running transitions
  (now `insertBefore` at index for new nodes only, like React's keyed
  reconciliation); dismiss path marks `delete:true` and lets the watcher
  play the exit before filtering (filtering in the subscriber yanked the
  node with no exit animation).
Playground: `playground-sonner.html` (all types, rich-colors gallery, recipes,
event log, loading→update, burst stack demo, 6 docks, live expand/richColors/
close/visibleToasts/gap rebuild, copy-paste snippet).

## 2. Modal — `radix-ui/primitives` Dialog + `shadcn/ui` dialog styling (MIT)
- `packages/react/dialog/src/dialog.tsx` (614 lines, vendored at
  `_source/modal/radix-dialog.tsx`): Root/Provider open state (controlled +
  uncontrolled), Trigger/Content/Overlay/Title/Description/Close, modal vs
  non-modal, FocusScope trap, DismissableLayer (ESC + outside), scroll-lock
  (`react-remove-scroll`), `aria-hidden` (`hideOthers`), `onOpenChange`
  → ported to `assets/js/modal.js` (`Modal.open/confirm`, overlay+wrap+dialog,
  focus trap, ESC/outside, scroll-lock, aria-labelledby/describedby, sizes,
  sticky footer, scrollable body, `showClose`, declarative `data-modal-target`)
- Enter animation uses insert-time keyframes (`mk-in`, like elib-web's
  `modal-in`) so it always plays; exit uses a `.closing` transition.
Playground: `playground-modal.html`.

## 3. Jalali math — `jalaali/jalaali-js` (MIT)
- `dist/jalaali.js` (via jsDelivr, exact UMD build) → vendored **byte-identical**
  to `assets/js/jalaali-vendor.js`; UI wrapper in `assets/js/datepicker.js`
  calls `toJalaali/toGregorian/jalaaliMonthLength` from the vendor (Intl
  fallback only if vendor missing). Popup: month/year jump selects, min/max,
  formats, presets, today/clear.
Playground: `playground-datepicker.html`.

## 4. Icons — Font Awesome 6.5.2 (CC-BY-4.0 icons / MIT code, via cdnjs)
- `all.min.css` → `assets/vendor/fontawesome/` (unmodified),
  `fa-solid-900 / fa-regular-400 / fa-brands-400 / fa-v4compatibility .woff2`
  → `assets/vendor/webfonts/` (relative `../webfonts/` paths intact).
- **Zero emojis anywhere** — every icon is `<i class="fa-solid …">`.
  (Sonner keeps its own upstream SVG assets untouched — exact port.)

## 5. Fonts — vendored woff2 (all valid `wOF2`)
- Inter 400–800 (latin, `@fontsource/inter`) + Vazirmatn 400/500/700/900
  (arabic subset covers Persian, `@fontsource/vazirmatn`) → `assets/fonts/`,
  wired via `@font-face` with `local()` fallback. No Google Fonts calls.

## 6. Modern language — `IntellsGamer/elib-web` (principles, not a copy)
Studied `templates/base.html`, `templates/dashboard.html`, `static/app.css`:
glass-with-inner-highlight, one confident accent, eyebrow labels, glowing
pills, lift-on-hover, quiet flat buttons, hairline borders, FA icons, big radius,
reveals, keyframe modal/toast entrances. Applied as an original light+dark
admin theme in `assets/css/theme.css` (default accent amber `#f59e0b`,
configurable — indigo etc. one click away). No serif display font copied:
admin headings are tight Inter.

## 7. Navigation — Hotwired Turbo 8 (MIT © 37signals, like elib-web)

- `turbo.es2017-umd.min.js` (v8.0.12, the exact file elib-web loads from CDN)
  vendored to `assets/vendor/turbo/`, included with `defer` on all 8 pages.
- Lifecycle contract so Drive visits never double-bind or leak: shell wiring
  lives in `App.initShell()` with every document/window listener tracked and
  removed by `App.teardown()` (`turbo:before-render` → teardown,
  `turbo:load` → init); one-shot globals use `window.__ak*` guards; the
  default Sonner toaster is destroyed pre-render and recreated on load
  (active toasts replay); open modals `closeAll()` pre-visit; grids/selects
  expose `destroy()`; programmatic navigation goes through `App.go()`
  (Turbo.visit with full-load fallback); forms keep working because handlers
  `preventDefault()` first, which Drive respects.

## Why hand CSS instead of Tailwind
The brief demands pages that "load with normal html pages" **offline**.
Tailwind Play CDN requires internet; a vendored Tailwind build needs an npm
build step and ships ~100 KB+ of generated utilities. Hand-rolled component
CSS (`theme.css` + `components.css`, ~20 KB) gives the same utility feel
(`.eyebrow/.pill/.tile/.lift/.btn-*`) with zero build and zero network.

## Other modules
- Table (`assets/js/table.js`), dropdown (`assets/js/dropdown.js`), buttons,
  auth, theme/RTL/idle managers are original lightweight implementations with
  per-module playgrounds ("everything ported has a playground of its own").
- Settings key is `adminkit.settings.v2` (v1 values won't clash with the new
  amber-default theme).
