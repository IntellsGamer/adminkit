/* App shell wiring: sidebar accordion (full) / waterfall popup (mini), horizontal
   menus, settings drawer (opposite side of sidebar), hamburger, language switch. */
(function(){
"use strict";
function toastChanged(patch){
  if(patch.theme!==undefined&&window.Sonner)Sonner.setTheme(ThemeStore.effectiveTheme());
  if(patch.toasterPosition!==undefined&&window.Sonner)Sonner.setPosition(patch.toasterPosition);
  if(patch.lang!==undefined&&window.I18N)I18N.apply(patch.lang);
}
window.App={toastChanged};
// Shared liquid-glass refraction filter (one <svg> for all pages).
// Fed into backdrop-filter as url(#ak-liquid) behind @supports, so only
// Chromium applies real lensing; Safari/Firefox keep frosted glass.
(function injectLiquidFilter(){
  if(document.getElementById("ak-liquid"))return;
  const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
  svg.setAttribute("width","0");svg.setAttribute("height","0");
  svg.setAttribute("aria-hidden","true");
  svg.style.cssText="position:absolute;inset-inline-start:0;top:0;pointer-events:none";
  svg.innerHTML='<defs><filter id="ak-liquid" x="-20%" y="-20%" width="140%" height="140%">'
    +'<feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="2" seed="7" result="n"/>'
    +'<feGaussianBlur in="n" stdDeviation="1.2" result="s"/>'
    +'<feDisplacementMap in="SourceGraphic" in2="s" scale="18" xChannelSelector="R" yChannelSelector="G"/>'
    +'</filter></defs>';
  document.body.prepend(svg);
})();
document.addEventListener("DOMContentLoaded",()=>{
  ThemeStore.apply();
  const s=ThemeStore.get(); if(window.I18N)I18N.apply(s.lang);
  // sidebar accordion: expanding another collapses the rest (full mode)
  document.querySelectorAll(".sidebar .nav-item").forEach(item=>{
    const link=item.querySelector(":scope > .nav-link");
    const sub=item.querySelector(":scope > .nav-sub");
    if(!link||!sub)return;
    link.addEventListener("click",e=>{
      e.preventDefault();
      const was=item.classList.contains("open");
      // collapse rest (both modes)
      item.parentElement.querySelectorAll(":scope > .nav-item.open").forEach(o=>{if(o!==item)o.classList.remove("open");});
      item.classList.toggle("open",!was);
      // mini waterfall: position popup next to the clicked item
      if(document.body.dataset.sidebar==="mini"&&!was){
        const r=link.getBoundingClientRect();
        const rtl=document.documentElement.dir==="rtl";
        sub.style.top=Math.min(innerHeight-320,r.top-8)+"px";
        sub.style.bottom="auto";
        if(rtl)sub.style.insetInlineStart="auto";
      }
    });
  });
  // close mini popup on outside click
  document.addEventListener("click",e=>{
    if(document.body.dataset.sidebar!=="mini")return;
    if(!e.target.closest(".sidebar .nav-item"))document.querySelectorAll(".sidebar .nav-item.open").forEach(o=>o.classList.remove("open"));
  });
  // hamburger
  document.querySelectorAll("[data-act='nav']").forEach(b=>b.addEventListener("click",()=>document.body.classList.toggle("nav-open")));
  // settings drawer (opposite of sidebar side)
  const drawer=document.getElementById("settingsDrawer"), scrim=document.getElementById("scrim");
  function openSettings(){ThemeStore.apply();drawer&&drawer.classList.add("open");scrim&&scrim.classList.add("show");}
  function closeSettings(){drawer&&drawer.classList.remove("open");scrim&&scrim.classList.remove("show");}
  document.querySelectorAll("[data-act='settings']").forEach(b=>b.addEventListener("click",openSettings));
  document.querySelectorAll("[data-act='settings-close']").forEach(b=>b.addEventListener("click",closeSettings));
  if(scrim)scrim.addEventListener("click",()=>{closeSettings();document.body.classList.remove("nav-open");});
  // first load -> open up settings (per spec: pull menu opens on first load)
  try{if(!localStorage.getItem("adminkit.seen")){localStorage.setItem("adminkit.seen","1");setTimeout(openSettings,600);}}catch(e){}
  // controls
  const $=id=>document.getElementById(id);
  if($("setTheme"))$("setTheme").onchange=e=>ThemeStore.set({theme:e.target.value});
  if($("setLayout"))$("setLayout").onchange=e=>ThemeStore.set({layout:e.target.value});
  if($("setSidebar"))$("setSidebar").onchange=e=>ThemeStore.set({sidebar:e.target.value});
  if($("setGlass"))$("setGlass").onchange=e=>ThemeStore.set({glass:e.target.checked});
  if($("setLang"))$("setLang").onchange=e=>{ThemeStore.set({lang:e.target.value});I18N.apply(e.target.value);};
  if($("setDir"))$("setDir").onchange=e=>{const v=e.target.value;ThemeStore.set(v==="auto"?{dirAuto:true}:{dirAuto:false,dir:v});};
  if($("setIdle"))$("setIdle").onchange=e=>{ThemeStore.set({idleMinutes:+e.target.value});Idle.tick();};
  if($("setPrimary"))$("setPrimary").oninput=e=>ThemeStore.set({primary:e.target.value});
  document.querySelectorAll(".swatch").forEach(b=>b.onclick=()=>ThemeStore.set({primary:b.dataset.color}));
  document.querySelectorAll("[data-theme-pick]").forEach(b=>b.onclick=()=>ThemeStore.set({theme:b.dataset.themePick}));
  if($("themeToggle"))$("themeToggle").onclick=()=>{const cur=ThemeStore.effectiveTheme();ThemeStore.set({theme:cur==="dark"?"light":"dark"});};
  if($("layoutToggle"))$("layoutToggle").onclick=()=>{const cur=ThemeStore.get().layout;ThemeStore.set({layout:cur==="vertical"?"horizontal":"vertical"});};
  if($("topPrimary"))$("topPrimary").oninput=e=>ThemeStore.set({primary:e.target.value});
  document.querySelectorAll("[data-lang]").forEach(b=>b.onclick=()=>{ThemeStore.set({lang:b.dataset.lang});I18N.apply(b.dataset.lang);});
  // scroll edge effect: content dissolving beneath lifts the glass bar
  const onScroll=()=>{const y=window.scrollY||document.documentElement.scrollTop||0;document.querySelectorAll(".topbar").forEach(t=>t.classList.toggle("scrolled",y>8));};
  document.addEventListener("scroll",onScroll,{passive:true});window.addEventListener("scroll",onScroll,{passive:true});onScroll();
  // demo progress bars + reveal on load
  document.querySelectorAll("[data-bar]").forEach(el=>{setTimeout(()=>el.style.width=el.dataset.bar+"%",300);});
  setTimeout(()=>document.querySelectorAll(".reveal").forEach(el=>el.classList.add("in")),60);
  // Escape closes drawer
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeSettings();});
});
})();
