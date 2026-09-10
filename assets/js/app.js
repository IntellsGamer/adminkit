/* App shell wiring: sidebar accordion (full/mini) / waterfall popup (icon),
   overlay drawer, horizontal menus (bar + dock island), settings drawer
   (opposite side of sidebar), hamburger, language switch,
   command-palette search, scroll edge effect.
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
  ensureDockBar();
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
    window.__akHmenuObs=new MutationObserver(()=>{ try{fitHmenu();}catch(e){} });
    window.__akHmenuObs.observe(document.body,{attributes:true,attributeFilter:["data-layout","data-hstyle"]});
  }catch(e){}
  try{ syncActive(); }catch(e){}
  try{
    document.querySelectorAll("[data-year]").forEach(el=>{
      el.textContent=String(new Date().getFullYear());
    });
  }catch(e){}
  function onScroll(){const y=window.scrollY||document.documentElement.scrollTop||0;document.querySelectorAll(".topbar").forEach(t=>t.classList.toggle("scrolled",y>8));}
  onDoc(document,"scroll",onScroll,{passive:true});onDoc(window,"scroll",onScroll,{passive:true});onScroll();
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
  // ---- command-palette search: jump to any page ----
  const PAGES=[
    {url:"homepage.html",icon:"fa-house",en:"Homepage",fa:"خانه",keys:"landing index start welcome شروع خانه معرفی"},
    {url:"index.html",icon:"fa-table-columns",en:"Dashboard",fa:"داشبورد",keys:"home main kpi overview analytics reports خانه اصلی نمودار گزارش"},
    {url:"index.html#analytics",icon:"fa-chart-line",en:"Analytics",fa:"تحلیل‌ها",keys:"chart traffic views نمودار بازدید"},
    {url:"products.html",icon:"fa-bag-shopping",en:"Products",fa:"محصولات",keys:"shop store price buy فروشگاه خرید قیمت"},
    {url:"cart.html",icon:"fa-cart-shopping",en:"Cart",fa:"سبد خرید",keys:"basket checkout cart سبد خرید پرداخت"},
    {url:"gallery.html",icon:"fa-images",en:"Gallery",fa:"گالری",keys:"photos images lightbox عکس گالری"},
    {url:"tickets.html",icon:"fa-ticket",en:"Tickets",fa:"تیکت‌ها",keys:"support help desk ticket پشتیبانی تیکت"},
    {url:"playground-sonner.html",icon:"fa-bell",en:"Sonner toasts",fa:"اعلان سانر",keys:"toast notification alert rich colors position promise اعلان"},
    {url:"playground-modal.html",icon:"fa-window-restore",en:"Modal dialog",fa:"مودال",keys:"dialog popup confirm پنجره گفتگو تایید"},
    {url:"playground-table.html",icon:"fa-table",en:"Data table",fa:"جدول داده",keys:"grid csv excel export search sort paging pagination numbers جدول خروجی جستجو صفحه"},
    {url:"playground-dropdown.html",icon:"fa-chevron-down",en:"Dropdown select",fa:"دراپ‌داون",keys:"select combobox search options انتخاب"},
    {url:"playground-datepicker.html",icon:"fa-calendar-days",en:"Date picker",fa:"تقویم",keys:"jalali persian calendar gregorian dual months شمسی میلادی تاریخ دو ماهه"},
    {url:"playground-buttons.html",icon:"fa-circle-dot",en:"Buttons",fa:"دکمه‌ها",keys:"primary danger success دکمه"},
    {url:"playground-tabs.html",icon:"fa-folder",en:"Tabs",fa:"تب‌ها",keys:"tabs tab panel pills vertical تب"},
    {url:"playground-tooltip.html",icon:"fa-comment",en:"Tooltips",fa:"تولتیپ",keys:"tooltip hint tip title راهنما"},
    {url:"playground-carousel.html",icon:"fa-images",en:"Carousel",fa:"کاروسل",keys:"slider slide fade autoplay marquee thumbs drag اسلایدر"},
    {url:"playground-grid.html",icon:"fa-table-cells",en:"Grid system",fa:"سیستم گرید",keys:"grid col row responsive md sm lg xl ستون ردیف"},
    {url:"playground-inputgroup.html",icon:"fa-i-cursor",en:"Input groups",fa:"گروه ورودی",keys:"input group addon prefix suffix ورودی"},
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
  onDoc(document,"keydown",e=>{if(e.key==="Escape"){closeSettings();document.body.classList.remove("nav-open");syncScrim();document.querySelectorAll(".hmenu > div.open").forEach(o=>o.classList.remove("open"));document.querySelectorAll(".tmenu.open").forEach(o=>o.classList.remove("open"));}});
}
document.addEventListener("DOMContentLoaded",initShell);
document.addEventListener("turbo:load",initShell);
document.addEventListener("turbo:before-render",teardown);
})();
