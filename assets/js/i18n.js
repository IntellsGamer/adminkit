/* i18n with external JSON dictionaries (outside HTML/JS). EN + FA, RTL aware. */
(function(){
  "use strict";
  const cache={};
  async function dict(lang){
    if(cache[lang])return cache[lang];
    const res=await fetch("i18n/"+lang+".json",{cache:"no-store"});
    const j=await res.json(); cache[lang]=j; return j;
  }
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
  }
  window.I18N={apply,dict};
  document.addEventListener("DOMContentLoaded",()=>{
    const s=window.ThemeStore?ThemeStore.get():{lang:"en"};
    apply(s.lang||"en");
  });
})();
