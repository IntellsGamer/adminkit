/* App shell wiring: sidebar accordion (full) / waterfall popup (mini), horizontal
   menus, settings drawer (opposite side of sidebar), hamburger, language switch,
   command-palette search, scroll edge effect.
   Turbo lifecycle: init() binds the fresh page DOM; teardown() removes every
   document/window listener so Turbo visits never double-bind. Element-level
   handlers (onclick=) die with the old DOM automatically. */
(function(){
"use strict";
function setLang(l){ThemeStore.set({lang:l});Promise.resolve(window.I18N?I18N.apply(l):null).then(()=>document.dispatchEvent(new CustomEvent("app:lang",{detail:{lang:l}})));}
function toastChanged(patch){
  if(patch.theme!==undefined&&window.Sonner)Sonner.setTheme(ThemeStore.effectiveTheme());
  if(patch.toasterPosition!==undefined&&window.Sonner)Sonner.setPosition(patch.toasterPosition);
  if(patch.lang!==undefined&&window.I18N)I18N.apply(patch.lang);
}
// Turbo-aware navigation: use Turbo Drive when present, plain load otherwise.
function go(url){ try{ if(window.Turbo&&Turbo.visit){Turbo.visit(url);return;} }catch(e){} location.href=url; }
window.App={toastChanged,setLang,go,init:initShell,teardown};
const docCleanups=[];
function onDoc(target,type,fn,opts){target.addEventListener(type,fn,opts);docCleanups.push(()=>{try{target.removeEventListener(type,fn,opts);}catch(e){}});}
function teardown(){while(docCleanups.length){try{docCleanups.pop()();}catch(e){}}}
// Shared liquid-glass refraction filter (one <svg> for all pages).
// Fed into backdrop-filter as url(#ak-liquid) behind @supports, so only
// Chromium applies real lensing; Safari/Firefox keep frosted glass.
(function injectLiquidFilter(){
  if(document.getElementById("ak-liquid"))return;
  if(!document.body){document.addEventListener("DOMContentLoaded",injectLiquidFilter,{once:true});return;}
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
function initShell(){
  teardown();
  ThemeStore.apply();
  const s=ThemeStore.get(); if(window.I18N)I18N.apply(s.lang);
  // Element bindings must be idempotent: both DOMContentLoaded AND turbo:load
  // fire on initial load, so initShell runs twice per page. Document/window
  // listeners are removed by teardown(); element listeners are guarded below.
  function bindOnce(el,key,fn){ if(!el)return; el.__ak=el.__ak||{}; if(el.__ak[key])return; el.__ak[key]=true; fn(el); }
  // sidebar accordion: expanding another collapses the rest (full mode)
  function placeMini(item){
    if(document.body.dataset.sidebar!=="mini")return;
    const link=item.querySelector(":scope > .nav-link"), sub=item.querySelector(":scope > .nav-sub");
    if(!link||!sub)return;
    const r=link.getBoundingClientRect();
    sub.style.top=Math.max(8,Math.min(innerHeight-320,r.top-8))+"px";
    sub.style.bottom="auto";
  }
  function repositionMini(){ if(window.innerWidth>860)document.querySelectorAll(".sidebar .nav-item.open").forEach(placeMini); }
  let rsT=null;
  onDoc(window,"scroll",()=>{ if(rsT)return; rsT=requestAnimationFrame(()=>{rsT=null;repositionMini();onScroll();}); },{passive:true,capture:true});
  onDoc(window,"resize",repositionMini);
  document.querySelectorAll(".sidebar .nav-item").forEach(item=>{
    const link=item.querySelector(":scope > .nav-link");
    const sub=item.querySelector(":scope > .nav-sub");
    if(!link||!sub)return;
    bindOnce(link,"nav",()=>link.addEventListener("click",e=>{
      e.preventDefault();
      const was=item.classList.contains("open");
      // collapse rest (both modes)
      item.parentElement.querySelectorAll(":scope > .nav-item.open").forEach(o=>{if(o!==item)o.classList.remove("open");});
      item.classList.toggle("open",!was);
      // mini waterfall: position popup next to the clicked item (viewport-anchored;
      // the mini rail is solid so fixed positioning resolves against the viewport)
      if(!was)placeMini(item);
    }));
  });
  // horizontal top menu: click toggles (touch), hover still works on desktop
  document.querySelectorAll(".hmenu > div").forEach(wrap=>{
    const btn=wrap.querySelector(":scope > button.hlink"), drop=wrap.querySelector(":scope > .drop");
    if(!btn||!drop)return;
    btn.setAttribute("aria-expanded","false");
    bindOnce(btn,"hdrop",()=>btn.addEventListener("click",e=>{
      e.stopPropagation();
      const was=wrap.classList.contains("open");
      document.querySelectorAll(".hmenu > div.open").forEach(o=>{o.classList.remove("open");o.querySelector(":scope > button.hlink").setAttribute("aria-expanded","false");});
      wrap.classList.toggle("open",!was);
      btn.setAttribute("aria-expanded",String(!was));
    }));
  });
  onDoc(document,"click",e=>{if(!e.target.closest(".hmenu"))document.querySelectorAll(".hmenu > div.open").forEach(o=>o.classList.remove("open"));});
  // close mini popup on outside click
  onDoc(document,"click",e=>{
    if(document.body.dataset.sidebar!=="mini")return;
    if(!e.target.closest(".sidebar .nav-item"))document.querySelectorAll(".sidebar .nav-item.open").forEach(o=>o.classList.remove("open"));
  });
  // hamburger
  document.querySelectorAll("[data-act='nav']").forEach(b=>bindOnce(b,"nav",()=>b.addEventListener("click",()=>document.body.classList.toggle("nav-open"))));
  // settings drawer (opposite of sidebar side)
  const drawer=document.getElementById("settingsDrawer"), scrim=document.getElementById("scrim");
  function openSettings(){ThemeStore.apply();if(drawer)drawer.classList.add("open");if(scrim)scrim.classList.add("show");}
  function closeSettings(){if(drawer)drawer.classList.remove("open");if(scrim)scrim.classList.remove("show");}
  document.querySelectorAll("[data-act='settings']").forEach(b=>bindOnce(b,"set",()=>b.addEventListener("click",openSettings)));
  document.querySelectorAll("[data-act='settings-close']").forEach(b=>bindOnce(b,"setx",()=>b.addEventListener("click",closeSettings)));
  if(scrim)bindOnce(scrim,"scrim",()=>scrim.addEventListener("click",()=>{closeSettings();document.body.classList.remove("nav-open");}));
  // first load -> open up settings (per spec: pull menu opens on first load)
  try{if(!localStorage.getItem("adminkit.seen")){localStorage.setItem("adminkit.seen","1");setTimeout(openSettings,600);}}catch(e){}
  // controls
  const $=id=>document.getElementById(id);
  if($("setTheme"))$("setTheme").onchange=e=>ThemeStore.set({theme:e.target.value});
  if($("setLayout"))$("setLayout").onchange=e=>ThemeStore.set({layout:e.target.value});
  if($("setSidebar"))$("setSidebar").onchange=e=>ThemeStore.set({sidebar:e.target.value});
  if($("setGlass"))$("setGlass").onchange=e=>ThemeStore.set({glass:e.target.checked});
  if($("setLang"))$("setLang").onchange=e=>setLang(e.target.value);
  if($("setDir"))$("setDir").onchange=e=>{const v=e.target.value;ThemeStore.set(v==="auto"?{dirAuto:true}:{dirAuto:false,dir:v});};
  if($("setIdle"))$("setIdle").onchange=e=>{ThemeStore.set({idleMinutes:+e.target.value});if(window.Idle)Idle.tick();};
  if($("setPrimary"))$("setPrimary").oninput=e=>ThemeStore.set({primary:e.target.value});
  document.querySelectorAll(".swatch").forEach(b=>b.onclick=()=>ThemeStore.set({primary:b.dataset.color}));
  document.querySelectorAll("[data-theme-pick]").forEach(b=>b.onclick=()=>ThemeStore.set({theme:b.dataset.themePick}));
  if($("themeToggle"))$("themeToggle").onclick=()=>{const cur=ThemeStore.effectiveTheme();ThemeStore.set({theme:cur==="dark"?"light":"dark"});};
  if($("layoutToggle"))$("layoutToggle").onclick=()=>{const cur=ThemeStore.get().layout;ThemeStore.set({layout:cur==="vertical"?"horizontal":"vertical"});};
  if($("topPrimary"))$("topPrimary").oninput=e=>ThemeStore.set({primary:e.target.value});
  document.querySelectorAll("[data-lang]").forEach(b=>b.onclick=()=>setLang(b.dataset.lang));
  // scroll edge effect: content dissolving beneath lifts the glass bar
  function onScroll(){const y=window.scrollY||document.documentElement.scrollTop||0;document.querySelectorAll(".topbar").forEach(t=>t.classList.toggle("scrolled",y>8));}
  onDoc(document,"scroll",onScroll,{passive:true});onDoc(window,"scroll",onScroll,{passive:true});onScroll();
  // ---- command-palette search: jump to any page ----
  const PAGES=[
    {url:"index.html",icon:"fa-table-columns",en:"Dashboard",fa:"داشبورد",keys:"home main kpi overview analytics reports خانه اصلی نمودار گزارش"},
    {url:"index.html#analytics",icon:"fa-chart-line",en:"Analytics",fa:"تحلیل‌ها",keys:"chart traffic views نمودار بازدید"},
    {url:"playground-sonner.html",icon:"fa-bell",en:"Sonner toasts",fa:"اعلان سانر",keys:"toast notification alert rich colors position promise اعلان"},
    {url:"playground-modal.html",icon:"fa-window-restore",en:"Modal dialog",fa:"مودال",keys:"dialog popup confirm پنجره گفتگو تایید"},
    {url:"playground-table.html",icon:"fa-table",en:"Data table",fa:"جدول داده",keys:"grid csv excel export search sort paging جدول خروجی جستجو"},
    {url:"playground-dropdown.html",icon:"fa-chevron-down",en:"Dropdown select",fa:"دراپ‌داون",keys:"select combobox search options انتخاب"},
    {url:"playground-datepicker.html",icon:"fa-calendar-days",en:"Date picker",fa:"تقویم",keys:"jalali persian calendar gregorian شمسی میلادی تاریخ"},
    {url:"playground-buttons.html",icon:"fa-circle-dot",en:"Buttons",fa:"دکمه‌ها",keys:"primary danger success دکمه"},
    {url:"login.html",icon:"fa-key",en:"Login / Register",fa:"ورود / ثبت‌نام",keys:"auth sign in sign up email phone password ورود ثبت نام ایمیل رمز تلفن"}
  ];
  document.querySelectorAll(".searchbox").forEach(box=>{
    const input=box.querySelector("input"); if(!input||box.querySelector(".search-results"))return;
    const panel=document.createElement("div"); panel.className="search-results"; panel.hidden=true; box.appendChild(panel);
    let items=[],hl=0;
    function close(){panel.hidden=true;items=[];hl=0;}
    function draw(){
      if(!items.length){panel.innerHTML='<div class="search-empty muted">No matches</div>';panel.hidden=false;return;}
      panel.innerHTML=items.map((p,i)=>'<button type="button" class="search-hit'+(i===hl?" hl":"")+'" data-u="'+p.url+'"><i class="fa-solid '+p.icon+' fa-fw"></i><span>'+p.label+'</span><small>'+p.kind+'</small></button>').join("");
      panel.hidden=false;
      panel.querySelectorAll(".search-hit").forEach((b,i)=>{b.onmousedown=(e)=>{e.preventDefault();go(b.dataset.u);};b.onmouseenter=()=>{hl=i;draw();};});
    }
    input.addEventListener("input",()=>{
      const q=input.value.trim().toLowerCase();
      if(!q){close();return;}
      const fa=(ThemeStore.get().lang==="fa");
      items=PAGES.filter(p=>(p.en+" "+p.fa+" "+p.keys).toLowerCase().includes(q)).slice(0,7)
        .map(p=>({url:p.url,icon:p.icon,label:fa?p.fa:p.en,kind:fa?"صفحه":"page"}));
      hl=0;draw();
    });
    input.addEventListener("keydown",(e)=>{
      if(panel.hidden)return;
      if(e.key==="ArrowDown"){e.preventDefault();hl=Math.min(items.length-1,hl+1);draw();}
      else if(e.key==="ArrowUp"){e.preventDefault();hl=Math.max(0,hl-1);draw();}
      else if(e.key==="Enter"){e.preventDefault();if(items[hl])go(items[hl].url);}
      else if(e.key==="Escape"){close();input.blur();}
    });
    onDoc(document,"click",(e)=>{if(!box.contains(e.target))close();});
  });
  // demo progress bars + reveal on load
  document.querySelectorAll("[data-bar]").forEach(el=>{setTimeout(()=>el.style.width=el.dataset.bar+"%",300);});
  setTimeout(()=>document.querySelectorAll(".reveal").forEach(el=>el.classList.add("in")),60);
  // Escape closes drawer
  onDoc(document,"keydown",e=>{if(e.key==="Escape"){closeSettings();document.querySelectorAll(".hmenu > div.open").forEach(o=>o.classList.remove("open"));}});
}
document.addEventListener("DOMContentLoaded",initShell);
document.addEventListener("turbo:load",initShell);
document.addEventListener("turbo:before-render",teardown);
})();
