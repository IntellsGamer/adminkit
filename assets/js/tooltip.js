/* Tooltip — CSS-only via [data-tip] + [data-pos=top|bottom|left|right].
   This file only documents the API and re-exposes nothing visual; it ensures
   dynamically-added [data-tip] nodes work (they do — pure CSS) and provides
   Tooltip.attach() as a no-op helper for symmetry with other modules.
   Usage: <button data-tip="Save" data-pos="top">…</button> */
(function(g){
"use strict";
function attach(){ /* CSS-only: nothing to bind */ return true; }
document.addEventListener("DOMContentLoaded",attach);
document.addEventListener("turbo:load",attach);
g.Tooltip={attach};
})(window);
