/* i18n with external JSON dictionaries (outside HTML/JS). EN + FA, RTL aware.
   Digits are NEVER rewritten: they stay plain Latin (U+0030-0039) everywhere
   and render in Vazirmatn (whose range covers them) at the correct weight. */
(function(){
  "use strict";
  const cache={};
  async function dict(lang){
    if(cache[lang])return cache[lang];
    const res=await fetch("i18n/"+lang+".json",{cache:"no-store"});
    const j=await res.json(); cache[lang]=j; return j;
  }
  // Retired digit-swapper: digits are font-styled now (see header), so this
  // is a no-op. Kept (and exported) so older callers never throw.
  function localizeNumbers(lang){}
  async function apply(lang){
    try{
      const d=await dict(lang);
      document.querySelectorAll("[data-i18n]").forEach(el=>{
        const k=el.getAttribute("data-i18n");
        if(d[k]!==undefined){
          if(el.tagName==="INPUT"&&el.placeholder!==undefined&&el.dataset.i18nPh!==undefined)el.placeholder=d[k];
          else el.textContent=d[k];
        }
      });
      document.querySelectorAll("[data-i18n-ph]").forEach(el=>{const k=el.getAttribute("data-i18n-ph"); if(d[k]!==undefined)el.placeholder=d[k];});
    }catch(e){/* offline file:// fallback: keep existing text */}
    localizeNumbers(lang);
    try{ if(window.App&&App.refreshNumbers)App.refreshNumbers(); }catch(e){}
  }
  window.I18N={apply,dict,localizeNumbers};
  function boot(){ const s=window.ThemeStore?ThemeStore.get():{lang:"en"}; apply(s.lang||"en"); }
  document.addEventListener("DOMContentLoaded",boot);
  document.addEventListener("turbo:load",boot);
  document.addEventListener("app:lang",e=>{ try{localizeNumbers((e.detail&&e.detail.lang)||"en");}catch(_){} });
})();
