/* Tabs — tiny accessible tab system. Offline, no deps.
   Markup:
     <div class="tabs" data-tabs="group1">
       <button class="tab-btn" data-tab="a" aria-selected="true">…</button>
       <button class="tab-btn" data-tab="b">…</button>
     </div>
     <div class="tab-panel" data-panel="group1:a">…</div>
     <div class="tab-panel" data-panel="group1:b" hidden>…</div>
   JS: Tabs.init(root?) auto-runs on DOMContentLoaded + turbo:load.
       Tabs.select(group, name) programmatically.
   Keyboard: ArrowLeft/Right (RTL aware) + Home/End move between tab buttons. */
(function(g){
"use strict";
function groupPanels(group){ return [...document.querySelectorAll('[data-panel^="'+group+':"]')]; }
function groupBtns(group){ return [...document.querySelectorAll('[data-tabs="'+group+'"] .tab-btn')]; }
function select(group,name){
  const btns=groupBtns(group);
  btns.forEach(b=>b.setAttribute("aria-selected",String(b.dataset.tab===name)));
  groupPanels(group).forEach(p=>{ p.hidden=(p.dataset.panel!==group+":"+name); });
}
function bindBar(bar){
  if(bar.__akTabs)return; bar.__akTabs=true;
  const group=bar.getAttribute("data-tabs");
  bar.setAttribute("role","tablist");
  bar.querySelectorAll(".tab-btn").forEach(b=>{
    b.setAttribute("role","tab");
    if(!b.hasAttribute("aria-selected"))b.setAttribute("aria-selected","false");
    b.addEventListener("click",()=>select(group,b.dataset.tab));
    b.addEventListener("keydown",e=>{
      const btns=[...bar.querySelectorAll(".tab-btn")];
      const i=btns.indexOf(b);
      const rtl=document.documentElement.dir==="rtl";
      let n=null;
      if(e.key==="ArrowRight")n=rtl?i-1:i+1;
      else if(e.key==="ArrowLeft")n=rtl?i+1:i-1;
      else if(e.key==="Home")n=0;
      else if(e.key==="End")n=btns.length-1;
      else return;
      e.preventDefault();
      n=(n+btns.length)%btns.length;
      btns[n].focus(); select(group,btns[n].dataset.tab);
    });
  });
}
function init(root){
  (root||document).querySelectorAll("[data-tabs]").forEach(bindBar);
}
function boot(){ try{init(document);}catch(e){} }
document.addEventListener("DOMContentLoaded",boot);
document.addEventListener("turbo:load",boot);
g.Tabs={init,select};
})(window);
