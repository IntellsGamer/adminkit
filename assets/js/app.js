/* App shell wiring: sidebar accordion (full/mini) / waterfall popup (icon),
   overlay drawer, horizontal menus (bar + dock island), settings drawer
   (opposite side of sidebar), hamburger, language switch,
   site search (sidebar box + horizontal magnifier popup), scroll edge effect.
   Turbo lifecycle: init() binds the fresh page DOM; teardown() removes every
   document/window listener so Turbo visits never double-bind. Element-level
   handlers (onclick=) die with the old DOM automatically. */
(function(){
"use strict";
function setLang(l){ThemeStore.set({lang:l});Promise.resolve(window.I18N?I18N.apply(l):null).then(()=>document.dispatchEvent(new CustomEvent("app:lang",{detail:{lang:l}})));}
function refreshNumbers(){ try{ fitHmenu(); }catch(e){} }
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
// Ensure a separated dock bar exists: pages ship <div class="hnbar"> physically,
// but older/custom pages without one get it auto-cloned from the topbar menu
// so hstyle=dock works everywhere with zero per-page edits.
function ensureDockBar(){
  try{
    if(document.querySelector(".hnbar"))return;
    const src=document.querySelector(".topbar .hmenu");
    if(!src)return;
    const wrap=document.createElement("div");
    wrap.className="hnbar"; wrap.setAttribute("aria-label","Horizontal dock");
    const inner=document.createElement("div");
    inner.className="hnbar-inner";
    const clone=src.cloneNode(true);
    // de-duplicate IDs inside the clone (fitHmenu injects its own More per bar)
    clone.querySelectorAll("[id]").forEach(n=>n.removeAttribute("id"));
    clone.removeAttribute("id");
    inner.appendChild(clone);
    wrap.appendChild(inner);
    const topbar=document.querySelector(".topbar");
    if(topbar&&topbar.parentNode)topbar.parentNode.insertBefore(wrap,topbar.nextSibling);
  }catch(e){}
}
// Horizontal "More": when .hmenu items overflow (too many items or narrow
// screen), extra top-level entries move into a trailing v-chevron "More" drop.
// Idempotent: restores everything first, then clips until it fits.
// Supports TWO bars: .topbar .hmenu (hstyle=bar) and .hnbar .hmenu (hstyle=dock).
function fitHmenu(){
  ensureDockBar();
  document.querySelectorAll(".hmenu").forEach((bar,bi)=>{
    const inDock=!!bar.closest(".hnbar");
    const inTop=!!bar.closest(".topbar");
    // stale edge-detection offsets die here (refit on resize/layout/lang)
    try{bar.querySelectorAll(":scope .drop").forEach(d=>{d.style.marginInlineStart="";});}catch(e){}
    let more=bar.querySelector(":scope > .hmore, :scope > #hMore");
    let drop=more?more.querySelector(":scope > .drop"):null;
    if(!more){
      more=document.createElement("div");
      more.className="hmore"; more.id="hMore"+(bi||"");
      more.innerHTML='<button class="hlink" aria-expanded="false" aria-haspopup="true"><i class="fa-solid fa-ellipsis"></i><span data-i18n="more">More</span><i class="fa-solid fa-chevron-down vicon"></i></button><div class="drop hmore-drop"></div>';
      drop=more.querySelector(".drop");
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
    if(!drop)drop=more.querySelector(":scope > .drop");
    // restore: move everything back out of More
    while(drop.firstChild){ bar.insertBefore(drop.firstChild,more); }
    more.classList.remove("open"); more.style.display="none";
    if(document.body.dataset.layout!=="horizontal")return;
    const hs=(document.body.dataset.hstyle||"bar");
    // only fit the ACTIVE bar: topbar menu for hstyle=bar, dock menu for hstyle=dock
    if(inTop&&hs==="dock")return;
    if(inDock&&hs!=="dock")return;
    if(bar.clientWidth<=0)return;
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
      const kids=[...bar.children].filter(el=>!el.classList.contains("hmore")&&el.id!=="hMore"&&!String(el.id||"").startsWith("hMore"));
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
  document.querySelectorAll(".sidebar .nav-sub a.nav-link, .pagenav a, .hnbar a, .hmenu a").forEach(a=>{
    const href=(a.getAttribute("href")||"").split("#")[0].split("?")[0];
    if(href&&href===file)a.classList.add("active"); else if(a.classList&&a.classList.contains("pagenav"))a.classList.remove("active");
  });
  document.querySelectorAll(".pagenav a").forEach(a=>{
    const href=(a.getAttribute("href")||"").split("#")[0].split("?")[0];
    if(href===file)a.classList.add("active"); else a.classList.remove("active");
  });
  // dashboard parent opens when on index; playgrounds parent opens on playground-*
  const onPlay=file.indexOf("playground-")===0;
  const onShop=(file==="products.html"||file==="cart.html"||file==="gallery.html");
  const onTickets=(file.indexOf("ticket")===0);
  document.querySelectorAll(".sidebar .nav-item").forEach(item=>{
    const txt=(item.textContent||"");
    if(/Playground|زمین/.test(txt))item.classList.toggle("open",onPlay||item.querySelector(".nav-sub a.active")!==null);
    if(/Dashboard|داشبورد/.test(txt)&&file==="index.html")item.classList.add("open");
    if(/Shop|فروشگاه/.test(txt))item.classList.toggle("open",onShop||item.querySelector(".nav-sub a.active")!==null);
    if(/Ticket|تیکت|پشتیبانی/.test(txt))item.classList.toggle("open",onTickets||item.querySelector(".nav-sub a.active")!==null);
  });
}
function initShell(){
  teardown();
  ThemeStore.apply();
  ensureSearchBtn();ensureDockBar();syncSearchBtnPlace();
  const s=ThemeStore.get(); if(window.I18N)I18N.apply(s.lang);
  function bindOnce(el,key,fn){ if(!el)return; el.__ak=el.__ak||{}; if(el.__ak[key])return; el.__ak[key]=true; fn(el); }
  // sidebar accordion: expanding another collapses the rest (full/mini/overlay).
  // icon mode uses a waterfall popup positioned next to the clicked row.
  function placeMini(item){
    if(document.body.dataset.sidebar!=="icon")return;
    const link=item.querySelector(":scope > .nav-link"), sub=item.querySelector(":scope > .nav-sub");
    if(!link||!sub)return;
    const r=link.getBoundingClientRect();
    sub.style.top=Math.max(8,Math.min(innerHeight-320,r.top-8))+"px";
    sub.style.bottom="auto";
  }
  function repositionMini(){ if(window.innerWidth>860)document.querySelectorAll(".sidebar .nav-item.open").forEach(placeMini); }
  let rsT=null;
  function onScrollEarly(){const y=window.scrollY||document.documentElement.scrollTop||0;document.querySelectorAll(".topbar").forEach(t=>t.classList.toggle("scrolled",y>8));}
  onDoc(window,"scroll",()=>{ if(rsT)return; rsT=requestAnimationFrame(()=>{rsT=null;repositionMini();onScrollEarly();}); },{passive:true,capture:true});
  onDoc(window,"resize",repositionMini);
  document.querySelectorAll(".sidebar .nav-item").forEach(item=>{
    const link=item.querySelector(":scope > .nav-link");
    const sub=item.querySelector(":scope > .nav-sub");
    if(!link||!sub)return;
    bindOnce(link,"nav",()=>link.addEventListener("click",e=>{
      e.preventDefault();
      const was=item.classList.contains("open");
      item.parentElement.querySelectorAll(":scope > .nav-item.open").forEach(o=>{if(o!==item)o.classList.remove("open");});
      item.classList.toggle("open",!was);
      // icon waterfall: position popup next to the clicked item (viewport-anchored)
      if(!was)placeMini(item);
    }));
  });
  // mini icon-only: hover expands the rail (CSS :hover does it); pin open while
  // a submenu is open via keyboard focus, unpin when focus leaves.
  try{
    const sb=document.getElementById("sidebar");
    if(sb&&!sb.__akMini){
      sb.__akMini=true;
      sb.addEventListener("mouseenter",()=>{ if(document.body.dataset.sidebar==="mini")sb.classList.add("pinned"); });
      sb.addEventListener("mouseleave",()=>{ sb.classList.remove("pinned"); });
      sb.addEventListener("focusin",()=>{ if(document.body.dataset.sidebar==="mini")sb.classList.add("pinned"); });
      sb.addEventListener("focusout",()=>{ setTimeout(()=>{ if(!sb.contains(document.activeElement))sb.classList.remove("pinned"); },50); });
    }
  }catch(e){}
  // horizontal top menu is hover/focus-only: nothing pins on click.
  onDoc(document,"click",e=>{if(!e.target.closest(".hmenu"))document.querySelectorAll(".hmenu > div.open").forEach(o=>o.classList.remove("open"));});
  onDoc(document,"click",e=>{
    try{
      if(e.detail>0&&e.target&&e.target.closest){
        const b=e.target.closest(".hmenu button.hlink");
        if(b&&document.activeElement===b)b.blur();
      }
    }catch(_){}
  });
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
  // close icon popup on outside click
  onDoc(document,"click",e=>{
    if(document.body.dataset.sidebar!=="icon")return;
    if(!e.target.closest(".sidebar .nav-item"))document.querySelectorAll(".sidebar .nav-item.open").forEach(o=>o.classList.remove("open"));
  });
  // viewport edge auto-detection for horizontal drops (mega + normal + More):
  // measures the opened panel and nudges it back on-screen with a logical
  // margin (direction-aware, animation-safe). Idempotent: resets first, so
  // re-entry converges instead of accumulating.
  function placeDrop(wrap){
    try{
      const drop=wrap.querySelector(":scope > .drop"); if(!drop)return;
      drop.style.marginInlineStart="";
      const M=8, vw=document.documentElement.clientWidth||innerWidth;
      const r=drop.getBoundingClientRect();
      if(r.width<=0||r.height<=0)return; // hidden bar — nothing to place
      const rtl=document.documentElement.dir==="rtl";
      if(r.left<M){const L=Math.ceil(M-r.left);drop.style.marginInlineStart=(rtl?-L:L)+"px";}
      else if(r.right>vw-M){const R=Math.ceil(r.right-(vw-M));drop.style.marginInlineStart=(rtl?R:-R)+"px";}
    }catch(e){}
  }
  function placeFromEvent(e){
    try{
      const w=e.target&&e.target.closest?e.target.closest(".hmenu > div"):null;
      if(w&&w.parentElement&&w.parentElement.classList.contains("hmenu"))placeDrop(w);
    }catch(_){}
  }
  onDoc(document,"mouseover",placeFromEvent);
  onDoc(document,"focusin",placeFromEvent);
  // hamburger: mobile + overlay sidebar. The shared scrim covers the content
  // whenever the sidebar OR the settings drawer is open.
  document.querySelectorAll("[data-act='nav']").forEach(b=>bindOnce(b,"nav",()=>b.addEventListener("click",()=>{document.body.classList.toggle("nav-open");syncScrim();})));
  document.querySelectorAll("[data-act='nav-close']").forEach(b=>bindOnce(b,"navx",()=>b.addEventListener("click",()=>{document.body.classList.remove("nav-open");syncScrim();})));
  const drawer=document.getElementById("settingsDrawer"), scrim=document.getElementById("scrim");
  function syncScrim(){const sc=document.getElementById("scrim"),dr=document.getElementById("settingsDrawer");if(!sc)return;sc.classList.toggle("show",document.body.classList.contains("nav-open")||(dr&&dr.classList.contains("open")));}
  function openSettings(){ThemeStore.apply();document.querySelectorAll(".tmenu.open").forEach(o=>o.classList.remove("open"));if(drawer)drawer.classList.add("open");syncScrim();}
  function closeSettings(){if(drawer)drawer.classList.remove("open");syncScrim();}
  document.querySelectorAll("[data-act='settings']").forEach(b=>bindOnce(b,"set",()=>b.addEventListener("click",openSettings)));
  document.querySelectorAll("[data-act='settings-close']").forEach(b=>bindOnce(b,"setx",()=>b.addEventListener("click",closeSettings)));
  if(scrim)bindOnce(scrim,"scrim",()=>scrim.addEventListener("click",()=>{closeSettings();document.body.classList.remove("nav-open");syncScrim();}));
  try{if(!localStorage.getItem("adminkit.seen")){localStorage.setItem("adminkit.seen","1");setTimeout(openSettings,600);}}catch(e){}
  const $=id=>document.getElementById(id);
  if($("setTheme"))$("setTheme").onchange=e=>ThemeStore.set({theme:e.target.value});
  if($("setLayout"))$("setLayout").onchange=e=>ThemeStore.set({layout:e.target.value});
  if($("setSidebar"))$("setSidebar").onchange=e=>ThemeStore.set({sidebar:e.target.value});
  if($("setHstyle"))$("setHstyle").onchange=e=>ThemeStore.set({hstyle:e.target.value});
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
  document.querySelectorAll("[data-hstyle-pick]").forEach(b=>b.onclick=()=>ThemeStore.set({hstyle:b.dataset.hstylePick}));
  document.querySelectorAll("[data-footer-pick]").forEach(b=>b.onclick=()=>ThemeStore.set({footerSticky:b.dataset.footerPick==="sticky"}));
  if($("themeToggle"))$("themeToggle").onclick=()=>{const cur=ThemeStore.effectiveTheme();ThemeStore.set({theme:cur==="dark"?"light":"dark"});};
  if($("layoutToggle"))$("layoutToggle").onclick=()=>{const cur=ThemeStore.get().layout;ThemeStore.set({layout:cur==="vertical"?"horizontal":"vertical"});};
  if($("topPrimary"))$("topPrimary").oninput=e=>ThemeStore.set({primary:e.target.value});
  if($("tbPrimary"))$("tbPrimary").oninput=e=>ThemeStore.set({primary:e.target.value});
  if($("tbGlass"))$("tbGlass").onchange=e=>ThemeStore.set({glass:e.target.checked});
  document.querySelectorAll("[data-lang]").forEach(b=>b.onclick=()=>setLang(b.dataset.lang));
  try{ upgradeSelects(); }catch(e){}
  onDoc(document,"app:lang",()=>{ try{ resyncSelects(); }catch(e){} });
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
  try{ fitHmenu(); }catch(e){}
  onDoc(window,"resize",()=>{ try{fitHmenu();}catch(e){} });
  onDoc(document,"app:lang",()=>{ try{setTimeout(fitHmenu,50);}catch(e){} });
  try{
    if(window.__akHmenuObs)window.__akHmenuObs.disconnect();
    window.__akHmenuObs=new MutationObserver(()=>{ try{fitHmenu();}catch(e){} try{syncDockMerge();}catch(e){} try{syncSearchBtnPlace();}catch(e){} });
    window.__akHmenuObs.observe(document.body,{attributes:true,attributeFilter:["data-layout","data-hstyle"]});
  }catch(e){}
  try{ syncActive(); }catch(e){}
  try{
    document.querySelectorAll("[data-year]").forEach(el=>{
      el.textContent=String(new Date().getFullYear());
    });
  }catch(e){}
  function onScroll(){const y=window.scrollY||document.documentElement.scrollTop||0;document.querySelectorAll(".topbar").forEach(t=>t.classList.toggle("scrolled",y>8));syncDockMerge(y);}
  onDoc(document,"scroll",onScroll,{passive:true});onDoc(window,"scroll",onScroll,{passive:true});onScroll();
  // dock auto-merge at page top: view-only body class (hstyle setting untouched).
  // Merged = island stretches full-bleed into the topbar; scrolling down
  // restores the floating dock.
  function syncDockMerge(y){
    try{
      if(y===undefined)y=window.scrollY||document.documentElement.scrollTop||0;
      const docked=document.body.dataset.hstyle==="dock"&&document.body.dataset.layout==="horizontal";
      document.body.classList.toggle("dock-merged",docked&&y<=8);
    }catch(e){}
  }
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
  // cart badges stay fresh across pages
  try{ if(window.Shop&&Shop.updateBadges)Shop.updateBadges(); }catch(e){}
  onDoc(document,"shop:change",()=>{ try{ if(window.Shop)Shop.updateBadges(); }catch(e){} });
  // carousels / tabs boot (their own files also boot; this covers Turbo re-visits)
  try{ if(window.Carousel)Carousel.init(document); }catch(e){}
  try{ if(window.Tabs)Tabs.init(document); }catch(e){}
  // ---- site search, three scopes: sidebar box = REAL same-origin index,
  // topbar pill = DUMMY demo entries in a Modal, magnifier popup = sidebar
  // nav items. Vertical untouched; magnifier placement syncs below.
  const FINDER_PAGES=[
    {url:"homepage.html",icon:"fa-house",tkey:"homepage"},
    {url:"index.html",icon:"fa-table-columns",tkey:"dashboard"},
    {url:"products.html",icon:"fa-bag-shopping",tkey:"products"},
    {url:"cart.html",icon:"fa-cart-shopping",tkey:"cart"},
    {url:"gallery.html",icon:"fa-images",tkey:"gallery"},
    {url:"tickets.html",icon:"fa-ticket",tkey:"tickets"},
    {url:"playground-sonner.html",icon:"fa-bell",tkey:"sonner"},
    {url:"playground-modal.html",icon:"fa-window-restore",tkey:"modal"},
    {url:"playground-table.html",icon:"fa-table",tkey:"table"},
    {url:"playground-dropdown.html",icon:"fa-chevron-down",tkey:"dropdown"},
    {url:"playground-datepicker.html",icon:"fa-calendar-days",tkey:"datepicker"},
    {url:"playground-buttons.html",icon:"fa-circle-dot",tkey:"buttons"},
    {url:"playground-tabs.html",icon:"fa-folder",tkey:"tabs"},
    {url:"playground-tooltip.html",icon:"fa-comment",tkey:"tooltip"},
    {url:"playground-carousel.html",icon:"fa-images",tkey:"carousel"},
    {url:"playground-grid.html",icon:"fa-table-cells",tkey:"gridSys"},
    {url:"playground-inputgroup.html",icon:"fa-i-cursor",tkey:"inputGroup"},
    {url:"login.html",icon:"fa-key",tkey:"login"}
  ];
  let finderIndex=null, finderBusy=null;
  function stripTags(s){return String(s||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();}
  async function finderEnsure(){
    if(finderIndex)return finderIndex;
    if(finderBusy)return finderBusy;
    finderBusy=(async()=>{
      const out=[]; let enD={},faD={};
      try{enD=await I18N.dict("en");}catch(e){enD={};}
      try{faD=await I18N.dict("fa");}catch(e){faD={};}
      for(const p of FINDER_PAGES){
        try{
          const r=await fetch(p.url,{cache:"force-cache"});
          if(!r.ok)continue;
          const html=await r.text();
          const chunk=((html.split('<main class="content">')[1]||html).split("</main>")[0]||"").replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<pre[\s\S]*?<\/pre>/gi," ").replace(/<div class="pagenav">[\s\S]*?<\/div>/," ");
          const text=stripTags(chunk).slice(0,3000);
          const keys={}; const re=/data-i18n="([^"]+)"/g; let m;
          while((m=re.exec(chunk))){keys[m[1]]=1;}
          const klist=Object.keys(keys);
          out.push({url:p.url,icon:p.icon,
            titleEn:enD[p.tkey]||stripTags((html.match(/<title>(.*?)<\/title>/i)||[])[1]||p.url).replace(/ — AdminKit.*$/,""),
            titleFa:faD[p.tkey]||"",
            hay:(text+" "+klist.map(k=>enD[k]||"").join(" ")+" "+klist.map(k=>faD[k]||"").join(" ")).toLowerCase()});
        }catch(e){}
      }
      finderIndex=out; return out;
    })();
    return finderBusy;
  }
  function finderLang(){ try{return ThemeStore.get().lang==="fa"?"fa":"en";}catch(e){return "en";} }
  function openEntry(p){
    if(!p)return;
    try{document.querySelectorAll(".sbtn.open").forEach(o=>{o.classList.remove("open");const b=o.querySelector(":scope > button");if(b)b.setAttribute("aria-expanded","false");});}catch(e){}
    go(p.url);
  }
  // dummy entries for the TOPBAR pill: fixed demo list opened in a Modal.
  const DUMMY=[
    {icon:"fa-table-columns",en:"Dashboard overview",fa:"نمای کلی داشبورد",den:"KPI tiles, sparklines and capacity bars.",dfa:"کارت‌های شاخص، نمودارها و نوار ظرفیت.",keys:"kpi home main شاخص خانه"},
    {icon:"fa-chart-line",en:"Analytics charts",fa:"نمودارهای تحلیل",den:"Traffic area chart with live badge.",dfa:"نمودار ناحیه‌ای بازدید با نشان زنده.",keys:"chart traffic views نمودار بازدید"},
    {icon:"fa-bag-shopping",en:"Products catalog",fa:"کاتالوگ محصولات",den:"Nine demo products with category filter.",dfa:"نه محصول نمایشی با فیلتر دسته.",keys:"shop store price buy فروشگاه خرید قیمت"},
    {icon:"fa-cart-shopping",en:"Cart checkout",fa:"تسویه سبد",den:"Quantities, subtotal and order toasts.",dfa:"تعداد، جمع و اعلان سفارش.",keys:"basket checkout سبد پرداخت"},
    {icon:"fa-images",en:"Gallery lightbox",fa:"گالری و لایت‌باکس",den:"Gradient covers with modal preview.",dfa:"کاورهای گرادیانی با پیش‌نمایش مودال.",keys:"photos lightbox عکس گالری"},
    {icon:"fa-ticket",en:"Support tickets",fa:"تیکت‌های پشتیبانی",den:"Open, pending and closed threads.",dfa:"گفتگوهای باز، در انتظار و بسته.",keys:"support help desk ticket پشتیبانی تیکت"},
    {icon:"fa-calendar-days",en:"Jalali date picker",fa:"تقویم شمسی",den:"Single or dual-month Jalali + Gregorian.",dfa:"تک‌ماهه یا دوماهه شمسی و میلادی.",keys:"jalali calendar date شمسی تاریخ تقویم"},
    {icon:"fa-table",en:"Data table export",fa:"خروجی جدول",den:"Numbered paging with CSV and Excel.",dfa:"صفحه‌بندی شماره‌دار با خروجی CSV و اکسل.",keys:"grid csv excel export paging جدول خروجی"},
    {icon:"fa-bell",en:"Sonner toasts",fa:"اعلان‌های سانر",den:"Stacking, swipe and promise toasts.",dfa:"استک، سوایپ و اعلان پرامیسی.",keys:"toast notification alert اعلان"},
    {icon:"fa-window-restore",en:"Modal dialogs",fa:"پنجره‌های مودال",den:"Sizes, sticky footer and confirm.",dfa:"اندازه‌ها، فوتر چسبان و تأیید.",keys:"dialog popup confirm مودال پنجره"},
    {icon:"fa-circle-dot",en:"Buttons set",fa:"ست دکمه‌ها",den:"Quiet Vercel-style variants and sizes.",dfa:"حالت‌ها و اندازه‌های آرام.",keys:"primary danger success دکمه"},
    {icon:"fa-folder",en:"Tabs and layout",fa:"تب‌ها و چیدمان",den:"Underline, pills and vertical tabs.",dfa:"تب‌های خطی، قرصی و عمودی.",keys:"tabs grid panel تب گرید"}
  ];
  function openDummy(p){
    if(!p)return;
    try{ Modal.open({title:p.label,desc:(finderLang()==="fa"?"ورودی نمایشی":"Demo entry"),body:'<p class="muted">'+p.desc+"</p>"}); }catch(e){}
  }
  function bindDummy(box){
    const input=box.querySelector("input"); if(!input||box.querySelector(".search-results"))return;
    const panel=document.createElement("div"); panel.className="search-results"; panel.hidden=true; box.appendChild(panel);
    let items=[],hl=0;
    function close(){panel.hidden=true;items=[];hl=0;}
    function draw(){
      if(!items.length){panel.innerHTML='<div class="search-empty muted">No matches</div>';panel.hidden=false;return;}
      panel.innerHTML=items.map((p,i)=>'<button type="button" class="search-hit'+(i===hl?" hl":"")+'"><i class="fa-solid '+p.icon+' fa-fw"></i><span>'+p.label+'</span><small>'+p.kind+'</small></button>').join("");
      panel.hidden=false;
      panel.querySelectorAll(".search-hit").forEach((b,i)=>{b.onmousedown=(e)=>{e.preventDefault();openDummy(items[i]);close();};b.onmouseenter=()=>{hl=i;draw();};});
    }
    input.addEventListener("input",()=>{
      const q=input.value.trim().toLowerCase();
      if(!q){close();return;}
      const fa=(finderLang()==="fa");
      items=DUMMY.filter(f=>(f.en+" "+f.fa+" "+f.den+" "+f.dfa+" "+f.keys).toLowerCase().indexOf(q)>=0).slice(0,7)
        .map(f=>({icon:f.icon,label:fa?f.fa:f.en,desc:fa?f.dfa:f.den,kind:fa?"نمایشی":"demo"}));
      hl=0;draw();
    });
    input.addEventListener("keydown",(e)=>{
      if(panel.hidden)return;
      if(e.key==="ArrowDown"){e.preventDefault();hl=Math.min(items.length-1,hl+1);draw();}
      else if(e.key==="ArrowUp"){e.preventDefault();hl=Math.max(0,hl-1);draw();}
      else if(e.key==="Enter"){e.preventDefault();if(items[hl]){openDummy(items[hl]);close();}}
      else if(e.key==="Escape"){close();input.blur();}
    });
    onDoc(document,"click",(e)=>{if(!box.contains(e.target))close();});
  }
  function bindFinder(box){
    const input=box.querySelector("input"); if(!input||box.querySelector(".search-results"))return;
    const panel=document.createElement("div"); panel.className="search-results"; panel.hidden=true; box.appendChild(panel);
    let items=[],hl=0;
    function close(){panel.hidden=true;items=[];hl=0;}
    function draw(){
      if(!items.length){panel.innerHTML='<div class="search-empty muted">No matches</div>';panel.hidden=false;return;}
      panel.innerHTML=items.map((p,i)=>'<button type="button" class="search-hit'+(i===hl?" hl":"")+'" data-u="'+p.url+'"><i class="fa-solid '+p.icon+' fa-fw"></i><span>'+p.label+'</span><small>'+p.kind+'</small></button>').join("");
      panel.hidden=false;
      panel.querySelectorAll(".search-hit").forEach((b,i)=>{b.onmousedown=(e)=>{e.preventDefault();openEntry(items[i]);close();};b.onmouseenter=()=>{hl=i;draw();};});
    }
    let finderSeq=0;
    input.addEventListener("input",()=>{
      const q=input.value.trim().toLowerCase();
      if(!q){close();return;}
      const my=++finderSeq, fa=(finderLang()==="fa");
      function run(idx){
        if(my!==finderSeq)return;
        items=idx.filter(e=>e.hay.indexOf(q)>=0).slice(0,7)
          .map(e=>({url:e.url,icon:e.icon,label:(fa&&e.titleFa)?e.titleFa:e.titleEn,kind:fa?"صفحه":"page"}));
        hl=0;draw();
      }
      if(finderIndex)run(finderIndex);
      else{
        panel.innerHTML='<div class="search-empty muted">'+(fa?"در حال فهرست‌سازی…":"Indexing site…")+"</div>";panel.hidden=false;
        finderEnsure().then(run).catch(()=>{if(my===finderSeq){items=[];hl=0;draw();}});
      }
    });
    input.addEventListener("keydown",(e)=>{
      if(panel.hidden)return;
      if(e.key==="ArrowDown"){e.preventDefault();hl=Math.min(items.length-1,hl+1);draw();}
      else if(e.key==="ArrowUp"){e.preventDefault();hl=Math.max(0,hl-1);draw();}
      else if(e.key==="Enter"){e.preventDefault();if(items[hl]){openEntry(items[hl]);close();}}
      else if(e.key==="Escape"){close();input.blur();}
    });
    onDoc(document,"click",(e)=>{if(!box.contains(e.target))close();});
  }
  // nav finder for the magnifier popup: searches the live sidebar items
  // (the hidden rail in horizontal modes), so the icon replaces rail search.
  function navIcon(a){
    try{
      const toks=(Array.from(a.querySelectorAll("i")).map(i=>i.className).join(" ").match(/fa-[a-z0-9-]+/g)||[]);
      const bad={solid:1,regular:1,light:1,thin:1,duotone:1,brands:1,fw:1,xl:1,"2xl":1,sm:1,lg:1};
      for(const t of toks){if(!bad[t.slice(3)])return t;}
    }catch(e){}
    return "fa-circle";
  }
  function sidebarLinks(){
    const out=[];
    document.querySelectorAll(".sidebar .nav-item").forEach(item=>{
      let group="";
      try{const g=item.querySelector(":scope > .nav-link .nav-text");if(g)group=g.textContent.trim();}catch(e){}
      item.querySelectorAll(":scope .nav-sub a.nav-link").forEach(a=>{
        if(a.hasAttribute("data-act"))return;
        const full=a.getAttribute("href")||"";
        if(!full||full==="#")return;
        const t=(a.textContent||"").trim(); if(!t)return;
        out.push({label:t,full:full,icon:navIcon(a),group:group});
      });
    });
    return out;
  }
  function bindNavFinder(box){
    const input=box.querySelector("input"); if(!input||box.querySelector(".search-results"))return;
    const panel=document.createElement("div"); panel.className="search-results"; panel.hidden=true; box.appendChild(panel);
    let items=[],hl=0;
    function close(){panel.hidden=true;items=[];hl=0;}
    function closePop(){try{const w=box.closest(".sbtn");if(w){w.classList.remove("open");const b=w.querySelector(":scope > button");if(b)b.setAttribute("aria-expanded","false");}}catch(e){}}
    function pick(p){ if(!p)return; close(); closePop(); go(p.full); }
    function draw(){
      if(!items.length){panel.innerHTML='<div class="search-empty muted">No matches</div>';panel.hidden=false;return;}
      panel.innerHTML=items.map((p,i)=>'<button type="button" class="search-hit'+(i===hl?" hl":"")+'"><i class="fa-solid '+p.icon+' fa-fw"></i><span>'+p.label+'</span><small>'+p.group+'</small></button>').join("");
      panel.hidden=false;
      panel.querySelectorAll(".search-hit").forEach((b,i)=>{b.onmousedown=(e)=>{e.preventDefault();pick(items[i]);};b.onmouseenter=()=>{hl=i;draw();};});
    }
    input.addEventListener("input",()=>{
      const q=input.value.trim().toLowerCase();
      if(!q){close();return;}
      items=sidebarLinks().filter(l=>(l.label+" "+l.group).toLowerCase().indexOf(q)>=0).slice(0,7);
      hl=0;draw();
    });
    input.addEventListener("keydown",(e)=>{
      if(panel.hidden)return;
      if(e.key==="ArrowDown"){e.preventDefault();hl=Math.min(items.length-1,hl+1);draw();}
      else if(e.key==="ArrowUp"){e.preventDefault();hl=Math.max(0,hl-1);draw();}
      else if(e.key==="Enter"){e.preventDefault();if(items[hl])pick(items[hl]);}
      else if(e.key==="Escape"){close();closePop();input.blur();}
    });
    onDoc(document,"click",(e)=>{if(!box.contains(e.target))close();});
  }
  // magnifier button for horizontal modes only (vertical untouched): the popup
  // searches sidebar items; placement syncs below (topbar in bar mode,
  // inline-start of the island in dock mode, never both).
  function bindSearchBtn(wrap){
    if(!wrap||wrap.__akSbtn)return; wrap.__akSbtn=true;
    const btn=wrap.querySelector(":scope > button"), pop=wrap.querySelector(":scope > .sbtn-pop");
    if(!btn||!pop)return;
    btn.addEventListener("click",e=>{
      e.stopPropagation();
      const was=wrap.classList.contains("open");
      document.querySelectorAll(".sbtn.open").forEach(o=>{o.classList.remove("open");const b=o.querySelector(":scope > button");if(b)b.setAttribute("aria-expanded","false");});
      document.querySelectorAll(".tmenu.open").forEach(o=>o.classList.remove("open"));
      wrap.classList.toggle("open",!was);
      btn.setAttribute("aria-expanded",String(!was));
      if(!was)setTimeout(()=>{try{pop.querySelector("input").focus();}catch(_){}},60);
    });
  }
  function ensureSearchBtn(){
    try{
      // locked-layout pages (homepage) keep their inline searchbox instead
      if(document.body&&document.body.getAttribute("data-lock-layout")==="horizontal")return;
      if(document.querySelector(".sbtn"))return;
      const bar=document.querySelector(".topbar .hmenu"); if(!bar)return;
      const wrap=document.createElement("div"); wrap.className="sbtn";
      wrap.innerHTML='<button type="button" class="icon-btn" aria-label="Search" aria-expanded="false"><i class="fa-solid fa-magnifying-glass"></i></button><div class="sbtn-pop"><label class="searchbox"><i class="fa-solid fa-magnifying-glass"></i><input data-i18n-ph="searchPh" placeholder="Search…"></label></div>';
      bar.before(wrap);
      bindSearchBtn(wrap);
      const popBox=wrap.querySelector(".searchbox"); if(popBox)bindNavFinder(popBox);
    }catch(e){}
  }
  // docked mode: magnifier lives inline-start of the island; otherwise in the
  // topbar. Physical move (handlers + panel survive), re-run on layout flip.
  function syncSearchBtnPlace(){
    try{
      const wrap=document.querySelector(".sbtn"); if(!wrap)return;
      const docked=document.body.dataset.hstyle==="dock"&&document.body.dataset.layout==="horizontal";
      if(docked){
        const inner=document.querySelector(".hnbar-inner");
        if(inner&&wrap.parentElement!==inner)inner.prepend(wrap);
      }else{
        const bar=document.querySelector(".topbar .hmenu");
        if(bar&&wrap.parentElement!==document.querySelector(".topbar"))bar.before(wrap);
      }
    }catch(e){}
  }
  ensureSearchBtn();
  document.querySelectorAll(".sbtn").forEach(w=>{ try{bindSearchBtn(w);}catch(e){} });
  document.querySelectorAll(".searchbox").forEach(box=>{ if(box.closest(".sbtn-pop"))return; try{(box.closest(".topbar")?bindDummy:bindFinder)(box);}catch(e){} });
  onDoc(document,"click",e=>{
    if(!e.target.closest(".sbtn"))document.querySelectorAll(".sbtn.open").forEach(o=>{o.classList.remove("open");const b=o.querySelector(":scope > button");if(b)b.setAttribute("aria-expanded","false");});
  });
  // demo progress bars + reveal on load
  document.querySelectorAll("[data-bar]").forEach(el=>{setTimeout(()=>el.style.width=el.dataset.bar+"%",300);});
  setTimeout(()=>document.querySelectorAll(".reveal").forEach(el=>el.classList.add("in")),60);
  onDoc(document,"keydown",e=>{if(e.key==="Escape"){closeSettings();document.body.classList.remove("nav-open");syncScrim();document.querySelectorAll(".hmenu > div.open").forEach(o=>o.classList.remove("open"));document.querySelectorAll(".tmenu.open").forEach(o=>o.classList.remove("open"));}});
}
document.addEventListener("DOMContentLoaded",initShell);
document.addEventListener("turbo:load",initShell);
document.addEventListener("turbo:before-render",teardown);
})();
