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
  // Containers whose static text follows the locale digits, plus the legacy
  // opt-in spots. Live widgets with their own renderers (tables, pickers,
  // custom dropdowns) and code/form nodes are skipped, so values, snippets
  // and re-rendered controls always stay Latin. Originals are cached per text
  // node, so toggling languages never double-converts.
  const SKIP_TXT="pre,code,table,select,input,textarea,script,style,.dd,.dp-pop,[data-keep-latin]";
  function localizeNumbers(lang){
    try{
      const roots=[];
      document.querySelectorAll("main.content,.footer,.drawer,.topbar").forEach(el=>roots.push(el));
      document.querySelectorAll("[data-num],.kpi-num,.num-fa,#idleTxt,.pill,[data-year]").forEach(el=>{
        if(roots.some(r=>r!==el&&r.contains(el)))return;
        roots.push(el);
      });
      roots.forEach(root=>{
        if(root.closest&&root.closest(SKIP_TXT))return;
        const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(n){
          const p=n.parentElement;
          if(!p||p.closest(SKIP_TXT))return NodeFilter.FILTER_REJECT;
          return /[0-9۰-۹]/.test(n.nodeValue)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
        }});
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
