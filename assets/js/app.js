/* App shell wiring: sidebar accordion (full) / waterfall popup (mini), horizontal
   menus, settings drawer (opposite side of sidebar), hamburger, language switch,
   command-palette search, scroll edge effect.
   Turbo lifecycle: init() binds the fresh page DOM; teardown() removes every
   document/window listener so Turbo visits never double-bind. Element-level
   handlers (onclick=) die with the old DOM automatically. */
(function(){
"use strict";
function setLang(l){ThemeStore.set({lang:l});Promise.resolve(window.I18N?I18N.apply(l):null).then(()=>document.dispatchEvent(new CustomEvent("app:lang",{detail:{lang:l}})));}
function refreshNumbers(){ try{ if(window.I18N&&I18N.localizeNumbers)I18N.localizeNumbers(ThemeStore.get().lang); }catch(e){} try{ fitHmenu(); }catch(e){} }
function toastChanged(patch){
  if(patch.theme!==undefined&&window.Sonner)Sonner.setTheme(ThemeStore.effectiveTheme());
  if(patch.toasterPosition!==undefined&&window.Sonner)Sonner.setPosition(patch.toasterPosition);
  if(patch.lang!==undefined&&window.I18N)I18N.apply(patch.lang);
}
// Turbo-aware navigation: use Turbo Drive when present, plain load otherwise.
function go(url){ try{ if(window.Turbo&&Turbo.visit){Turbo.visit(url);return;} }catch(e){} location.href=url; }
window.App={toastChanged,setLang,go,init:initShell,teardown,refreshNumbers};
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
// Horizontal "More": when .hmenu items overflow (too many items or narrow
// screen), extra top-level entries move into a trailing v-chevron "More" drop.
// Idempotent: restores everything first, then clips until it fits.
function fitHmenu(){
  document.querySelectorAll(".hmenu").forEach(bar=>{
    let more=bar.querySelector(":scope > #hMore");
    let drop=bar.querySelector(":scope > #hMore > #hMoreDrop");
    if(!more){
      more=document.createElement("div"); more.id="hMore";
      more.innerHTML='<button class="hlink" aria-expanded="false" aria-haspopup="true"><i class="fa-solid fa-ellipsis"></i><span data-i18n="more">More</span><i class="fa-solid fa-chevron-down vicon"></i></button><div class="drop" id="hMoreDrop"></div>';
      drop=more.querySelector("#hMoreDrop");
      bar.appendChild(more);
      const btn=more.querySelector(":scope > button.hlink");
      btn.addEventListener("click",e=>{
        e.stopPropagation();
        const was=more.classList.contains("open");
        document.querySelectorAll(".hmenu > div.open").forEach(o=>o.classList.remove("open"));
        document.querySelectorAll(".tmenu.open").forEach(o=>o.classList.remove("open"));
        more.classList.toggle("open",!was);
        btn.setAttribute("aria-expanded",String(!was));
      });
      if(window.I18N){ try{ I18N.dict(ThemeStore.get().lang).then(d=>{ const s=more.querySelector('[data-i18n="more"]'); if(s&&d.more)s.textContent=d.more; }); }catch(e){} }
    }
    // restore: move everything back out of More
    while(drop.firstChild){ bar.insertBefore(drop.firstChild,more); }
    more.classList.remove("open"); more.style.display="none";
    if(document.body.dataset.layout!=="horizontal")return;
    if(bar.clientWidth<=0)return;
    // clip trailing items (never the More entry itself) until it fits.
    // NOTE: .hmenu is overflow:visible so dropdowns can escape (overflow:hidden
    // clipped .drop invisible — buttons looked dead with no console errors).
    // scrollWidth only exceeds clientWidth when overflow clips, so measure by
    // summing visible child widths instead.
    function barOverflows(){
      const cs=getComputedStyle(bar);
      const gap=parseFloat(cs.columnGap||cs.gap||"4")||0;
      const kids=[...bar.children].filter(el=>el.style.display!=="none"&&getComputedStyle(el).display!=="none");
      if(kids.length<=1)return false;
      let total=0;
      for(const el of kids){ try{ total+=el.getBoundingClientRect().width+gap; }catch(e){ total+=el.offsetWidth+gap; } }
      total-=gap;
      return total>bar.clientWidth+4;
    }
    let guard=0;
    while(guard++<24 && barOverflows()){
      const kids=[...bar.children].filter(el=>el.id!=="hMore");
      if(kids.length<=1)break;
      const victim=kids[kids.length-1];
      drop.insertBefore(victim,drop.firstChild);
      more.style.display="";
    }
    if(drop.children.length)more.style.display="";
    else more.style.display="none";
  });
}
// Native <select> → NiceSelect upgrade: one custom dropdown system everywhere.
// Short lists (settings, dial-code, pager opts) get search:false; opt into
// search per-select with data-search="true". Idempotent via select._nice.
// Module-owned dynamic selects are skipped here: .dp-pop (datepicker rebuilds
// them on every draw) and [data-g] (grid internals upgrade themselves).
function upgradeSelects(){
  if(!window.NiceSelect)return;
  document.querySelectorAll("select").forEach(sel=>{
    try{
      if(sel.hasAttribute("data-keep-native"))return;
      if(sel.closest(".dp-pop"))return;
      if(sel.hasAttribute("data-g"))return;
      const prev=sel._nice;
      if(prev&&prev.root&&prev.root.isConnected)return;
      if(prev){ try{ delete sel._nice; }catch(e){ sel._nice=null; } }
      new NiceSelect(sel,{search:sel.dataset.search==="true"});
      const root=sel.nextElementSibling;
      if(root&&root.classList&&root.classList.contains("dd")
        &&sel.closest(".set-row,.phone-row,.tbl-pager,.dp-jump"))root.classList.add("dd-compact");
    }catch(e){}
  });
}
// Re-read native options/value into the custom UI (silent). Runs after I18N
// re-translates <option> labels so the custom dropdown never goes stale.
function resyncSelects(){
  document.querySelectorAll("select").forEach(sel=>{
    try{ const inst=sel._nice; if(inst&&inst.root&&inst.root.isConnected)inst.syncFromSrc(); }catch(e){}
  });
}
// Same shell everywhere: highlight the nav leaf matching this URL.
function syncActive(){
  let file="index.html";
  try{ file=(location.pathname.split("/").pop()||"index.html").split("?")[0].split("#")[0]||"index.html"; }catch(e){}
  document.querySelectorAll(".sidebar .nav-sub a.nav-link, .pagenav a").forEach(a=>{
    const href=(a.getAttribute("href")||"").split("#")[0].split("?")[0];
    if(href===file)a.classList.add("active"); else a.classList.remove("active");
  });
  // dashboard parent opens when on index; playgrounds parent opens on playground-*
  const onPlay=file.indexOf("playground-")===0;
  document.querySelectorAll(".sidebar .nav-item").forEach(item=>{
    const txt=(item.textContent||"");
    if(/Playground|زمین/.test(txt))item.classList.toggle("open",onPlay||item.querySelector(".nav-sub a.active")!==null);
    if(/Dashboard|داشبورد/.test(txt)&&file==="index.html")item.classList.add("open");
  });
}
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
  // horizontal top menu is hover/focus-only: nothing pins on click. Clicking
  // a parent behaves exactly like hovering it — move the pointer away (or tab
  // away) and it closes. Touch taps still preview via :hover; only #hMore
  // (the overflow entry) keeps a click toggle, for small screens without hover.
  onDoc(document,"click",e=>{if(!e.target.closest(".hmenu"))document.querySelectorAll(".hmenu > div.open").forEach(o=>o.classList.remove("open"));});
  // pointer clicks focus the button, and that focus alone would keep the menu
  // open via :focus-within after the pointer leaves. Drop pointer focus so a
  // click behaves exactly like a hover; keyboard activation (Enter/Space,
  // which fires click with detail 0) keeps focus so keyboard users can still
  // tab into the open menu.
  onDoc(document,"click",e=>{
    try{
      if(e.detail>0&&e.target&&e.target.closest){
        const b=e.target.closest(".hmenu button.hlink");
        if(b&&document.activeElement===b)b.blur();
      }
    }catch(_){}
  });
  // hover/focus exclusivity: entering another top-level entry closes the
  // #hMore overflow toggle if it was pinned open, so two dropdowns never show
  // at once. Delegated on the bar (mouseover/focusin bubble), so entries moved
  // into #hMore by fitHmenu are covered too. Main entries need no .open at
  // all — CSS :hover/:focus-within shows them and leaving hides them.
  document.querySelectorAll(".hmenu").forEach(bar=>{
    bindOnce(bar,"hexcl",()=>{
      const closeOthers=e=>{
        const wrap=e.target&&e.target.closest?e.target.closest(".hmenu > div"):null;
        if(!wrap||wrap.parentElement!==bar)return;
        bar.querySelectorAll(":scope > div.open").forEach(o=>{
          if(o===wrap)return;
          o.classList.remove("open");
          const b=o.querySelector(":scope > button.hlink");
          if(b)b.setAttribute("aria-expanded","false");
        });
      };
      bar.addEventListener("mouseover",closeOthers);
      bar.addEventListener("focusin",closeOthers);
    });
  });
  // close mini popup on outside click
  onDoc(document,"click",e=>{
    if(document.body.dataset.sidebar!=="mini")return;
    if(!e.target.closest(".sidebar .nav-item"))document.querySelectorAll(".sidebar .nav-item.open").forEach(o=>o.classList.remove("open"));
  });
  // hamburger
  document.querySelectorAll("[data-act='nav']").forEach(b=>bindOnce(b,"nav",()=>b.addEventListener("click",()=>document.body.classList.toggle("nav-open"))));
  // settings drawer (opposite of sidebar side)
  const drawer=document.getElementById("settingsDrawer"), scrim=document.getElementById("scrim");
  function openSettings(){ThemeStore.apply();document.querySelectorAll(".tmenu.open").forEach(o=>o.classList.remove("open"));if(drawer)drawer.classList.add("open");if(scrim)scrim.classList.add("show");}
  function closeSettings(){if(drawer)drawer.classList.remove("open");if(scrim)scrim.classList.remove("show");}
  document.querySelectorAll("[data-act='settings']").forEach(b=>bindOnce(b,"set",()=>b.addEventListener("click",openSettings)));
  document.querySelectorAll("[data-act='settings-close']").forEach(b=>bindOnce(b,"setx",()=>b.addEventListener("click",closeSettings)));
  if(scrim)bindOnce(scrim,"scrim",()=>scrim.addEventListener("click",()=>{closeSettings();document.body.classList.remove("nav-open");}));
  // first load -> open up settings (per spec: pull menu opens on first load)
  try{if(!localStorage.getItem("adminkit.seen")){localStorage.setItem("adminkit.seen","1");setTimeout(openSettings,600);}}catch(e){}
  // controls (drawer keeps canonical IDs; topbar dropdown mirrors them)
  const $=id=>document.getElementById(id);
  if($("setTheme"))$("setTheme").onchange=e=>ThemeStore.set({theme:e.target.value});
  if($("setLayout"))$("setLayout").onchange=e=>ThemeStore.set({layout:e.target.value});
  if($("setSidebar"))$("setSidebar").onchange=e=>ThemeStore.set({sidebar:e.target.value});
  if($("setGlass"))$("setGlass").onchange=e=>ThemeStore.set({glass:e.target.checked});
  if($("setLang"))$("setLang").onchange=e=>setLang(e.target.value);
  if($("setDir"))$("setDir").onchange=e=>{const v=e.target.value;ThemeStore.set(v==="auto"?{dirAuto:true}:{dirAuto:false,dir:v});};
  if($("setFooter"))$("setFooter").onchange=e=>ThemeStore.set({footerSticky:e.target.value==="sticky"});
  if($("setIdle"))$("setIdle").onchange=e=>{ThemeStore.set({idleMinutes:+e.target.value});if(window.Idle)Idle.tick();};
  if($("setPrimary"))$("setPrimary").oninput=e=>ThemeStore.set({primary:e.target.value});
  document.querySelectorAll(".swatch").forEach(b=>b.onclick=()=>ThemeStore.set({primary:b.dataset.color}));
  document.querySelectorAll("[data-theme-pick]").forEach(b=>b.onclick=()=>ThemeStore.set({theme:b.dataset.themePick}));
  document.querySelectorAll("[data-layout-pick]").forEach(b=>b.onclick=()=>ThemeStore.set({layout:b.dataset.layoutPick}));
  document.querySelectorAll("[data-sidebar-pick]").forEach(b=>b.onclick=()=>ThemeStore.set({sidebar:b.dataset.sidebarPick}));
  document.querySelectorAll("[data-footer-pick]").forEach(b=>b.onclick=()=>ThemeStore.set({footerSticky:b.dataset.footerPick==="sticky"}));
  // legacy topbar buttons (kept working if a page still has them)
  if($("themeToggle"))$("themeToggle").onclick=()=>{const cur=ThemeStore.effectiveTheme();ThemeStore.set({theme:cur==="dark"?"light":"dark"});};
  if($("layoutToggle"))$("layoutToggle").onclick=()=>{const cur=ThemeStore.get().layout;ThemeStore.set({layout:cur==="vertical"?"horizontal":"vertical"});};
  if($("topPrimary"))$("topPrimary").oninput=e=>ThemeStore.set({primary:e.target.value});
  if($("tbPrimary"))$("tbPrimary").oninput=e=>ThemeStore.set({primary:e.target.value});
  if($("tbGlass"))$("tbGlass").onchange=e=>ThemeStore.set({glass:e.target.checked});
  document.querySelectorAll("[data-lang]").forEach(b=>b.onclick=()=>setLang(b.dataset.lang));
  // ---- custom dropdowns: upgrade every static native <select> to NiceSelect.
  // No search by default (short lists don't need it); data-search="true" opts
  // in. pick() dispatches a real change event, so the .onchange wiring above
  // keeps working untouched. Labels re-sync after language swaps.
  try{ upgradeSelects(); }catch(e){}
  onDoc(document,"app:lang",()=>{ try{ resyncSelects(); }catch(e){} });
  // ---- topbar dropdowns (theme / lang / notif / profile): one open at a time
  document.querySelectorAll("[data-tmenu]").forEach(btn=>{
    bindOnce(btn,"tmenu",()=>btn.addEventListener("click",e=>{
      e.stopPropagation();
      const wrap=btn.closest(".tmenu"); const was=wrap&&wrap.classList.contains("open");
      document.querySelectorAll(".tmenu.open").forEach(o=>o.classList.remove("open"));
      document.querySelectorAll(".hmenu > div.open").forEach(o=>o.classList.remove("open"));
      if(wrap&&!was)wrap.classList.add("open");
    }));
  });
  onDoc(document,"click",e=>{
    if(!e.target.closest(".tmenu"))document.querySelectorAll(".tmenu.open").forEach(o=>o.classList.remove("open"));
  });
  const markBtn=$("notifMark"); if(markBtn)bindOnce(markBtn,"notif",()=>markBtn.addEventListener("click",()=>{const b=$("notifBadge");if(b)b.style.display="none";}));
  // ---- horizontal overflow: clip into a "More ⌄" entry when too wide ----
  try{ fitHmenu(); }catch(e){}
  onDoc(window,"resize",()=>{ try{fitHmenu();}catch(e){} });
  onDoc(document,"app:lang",()=>{ try{setTimeout(fitHmenu,50);}catch(e){} });
  // refit after layout switches (vertical<->horizontal changes .hmenu visibility)
  try{
    if(window.__akHmenuObs)window.__akHmenuObs.disconnect();
    window.__akHmenuObs=new MutationObserver(()=>{ try{fitHmenu();}catch(e){} });
    window.__akHmenuObs.observe(document.body,{attributes:true,attributeFilter:["data-layout"]});
  }catch(e){}
  // ---- active link sync: same shell on every page, current page highlights itself
  try{ syncActive(); }catch(e){}
  // ---- footer year (localized digits when fa)
  try{
    document.querySelectorAll("[data-year]").forEach(el=>{
      const y=String(new Date().getFullYear());
      el.textContent=(ThemeStore.get().lang==="fa"&&window.I18N)?I18N.toFa(y):y;
    });
  }catch(e){}
  // scroll edge effect: content dissolving beneath lifts the glass bar
  function onScroll(){const y=window.scrollY||document.documentElement.scrollTop||0;document.querySelectorAll(".topbar").forEach(t=>t.classList.toggle("scrolled",y>8));}
  onDoc(document,"scroll",onScroll,{passive:true});onDoc(window,"scroll",onScroll,{passive:true});onScroll();
  // footer landing: in sticky mode the bar sheds its glass shell and sits
  // like a normal footer once you reach the very bottom of the page (and
  // floats again when you scroll up). Pure style — body class only, the
  // footerSticky setting itself is never changed or persisted. Wide
  // hysteresis (dock within 2px, undock past 40px): the morph changes the
  // footer height by ~28px mid-transition, and the band swallows that delta
  // so borderline positions can't flap.
  function syncAtBottom(){
    try{
      const gap=(document.documentElement.scrollHeight||0)-((window.innerHeight||0)+(window.scrollY||document.documentElement.scrollTop||0));
      const landed=document.body.classList.contains("at-bottom");
      document.body.classList.toggle("at-bottom",landed?gap<=40:gap<=2);
    }catch(e){}
  }
  onDoc(window,"scroll",syncAtBottom,{passive:true});
  onDoc(window,"resize",syncAtBottom);
  syncAtBottom();
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
  // Escape closes drawer + any open menu
  onDoc(document,"keydown",e=>{if(e.key==="Escape"){closeSettings();document.querySelectorAll(".hmenu > div.open").forEach(o=>o.classList.remove("open"));document.querySelectorAll(".tmenu.open").forEach(o=>o.classList.remove("open"));}});
}
document.addEventListener("DOMContentLoaded",initShell);
document.addEventListener("turbo:load",initShell);
document.addEventListener("turbo:before-render",teardown);
})();
