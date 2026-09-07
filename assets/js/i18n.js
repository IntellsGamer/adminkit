/* i18n with external JSON dictionaries (outside HTML/JS). EN + FA, RTL aware.
   Persian digits: when lang=fa, Latin digits in opted-in spots render as Persian
   digits (۰۱۲۳۴۵۶۷۸۹); switching back to en restores Latin. Opt-in via
   [data-num] attribute OR .kpi-num/.num-fa classes, plus #idleTxt. Originals are
   cached in dataset so toggling never double-converts. */
(function(){
  "use strict";
  const cache={};
  const FA_D="۰۱۲۳۴۵۶۷۸۹";
  function toFa(s){ return String(s).replace(/[0-9]/g,d=>FA_D[+d]); }
  function toEn(s){ return String(s).replace(/[۰-۹]/g,d=>String(FA_D.indexOf(d))); }
  async function dict(lang){
    if(cache[lang])return cache[lang];
    const res=await fetch("i18n/"+lang+".json",{cache:"no-store"});
    const j=await res.json(); cache[lang]=j; return j;
  }
  function localizeNumbers(lang){
    try{
      const els=document.querySelectorAll("[data-num],.kpi-num,.num-fa,#idleTxt,.pill");
      els.forEach(el=>{
        // skip elements that contain interactive children where digit swap is risky
        if(el.querySelector("input,select,textarea"))return;
        // walk child text nodes so icons (<i>) survive
        const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
        const nodes=[]; while(walker.nextNode())nodes.push(walker.currentNode);
        nodes.forEach(n=>{
          if(n.__akOrig===undefined)n.__akOrig=n.nodeValue;
          n.nodeValue=(lang==="fa")?toFa(n.__akOrig):toEn(n.__akOrig);
        });
      });
    }catch(e){}
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
    localizeNumbers(lang);
    try{ if(window.App&&App.refreshNumbers)App.refreshNumbers(); }catch(e){}
  }
  window.I18N={apply,dict,toFa,toEn,localizeNumbers};
  function boot(){ const s=window.ThemeStore?ThemeStore.get():{lang:"en"}; apply(s.lang||"en"); }
  document.addEventListener("DOMContentLoaded",boot);
  document.addEventListener("turbo:load",boot);
  document.addEventListener("app:lang",e=>{ try{localizeNumbers((e.detail&&e.detail.lang)||"en");}catch(_){} });
})();
