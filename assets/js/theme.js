/* AdminKit theme/settings manager — offline, localStorage persisted.
   - auto detect system prefs (matchMedia), listen for change and apply only
     if user has NOT overridden OR theme setting is 'system'.
   - persists: theme, primary, layout, sidebar, hstyle, glass, lang/dir, idle minutes + off
   Sidebar modes: full | icon (icons+tiny labels, waterfall popup — renamed from mini)
                  | mini (icon-only rail, hover expands to full) | overlay (slides over content)
   Horizontal styles: bar (hmenu inside topbar, default) | dock (separated floating
     island bar below topbar, elib-web docked style).
*/
(function(){
  "use strict";
  const KEY="adminkit.settings.v2";
  const MIGKEY="adminkit.sidebarMigrated.v1";
  const defaults={
    theme:"system",        // light | dark | system
    primary:"#f59e0b",
    layout:"vertical",     // vertical | horizontal
    sidebar:"full",        // full | icon | mini | overlay
    hstyle:"bar",          // bar (in-topbar) | dock (separated island)
    footerSticky:true,      // always-visible bottom bar | static after content
    glass:true,
    lang:"en",             // en | fa
    dir:"ltr",             // ltr | rtl (auto from lang unless overridden)
    dirAuto:true,
    idleMinutes:15,        // configurable; 0 = off
    toasterPosition:"bottom-right"
  };
  function load(){
    let raw={};
    try{ raw=JSON.parse(localStorage.getItem(KEY)||"{}"); }catch(e){ raw={}; }
    // One-time migration: old "mini" (icons+labels waterfall) is now called "icon".
    // New "mini" means icon-only hover-expand. Guard with a flag so new "mini"
    // choices are never re-migrated.
    try{
      if(!localStorage.getItem(MIGKEY) && raw.sidebar==="mini"){
        raw.sidebar="icon";
        localStorage.setItem(MIGKEY,"1");
      } else if(!localStorage.getItem(MIGKEY)){
        localStorage.setItem(MIGKEY,"1");
      }
    }catch(e){}
    const s=Object.assign({},defaults,raw);
    // sanitize unknown values from hand-edited storage
    if(["full","icon","mini","overlay"].indexOf(s.sidebar)<0){
      s.sidebar=(s.sidebar==="mini")?"icon":"full";
    }
    if(["bar","dock"].indexOf(s.hstyle)<0)s.hstyle="bar";
    if(["vertical","horizontal"].indexOf(s.layout)<0)s.layout="vertical";
    return s;
  }
  function save(s){ try{ localStorage.setItem(KEY,JSON.stringify(s)); }catch(e){} }
  let settings=load();
  let userChangedTheme = settings.theme!=="system"; // "only if it was not changed yet or set to system default"

  function sysTheme(){ return (window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light"; }
  function effectiveTheme(){ return settings.theme==="system"?sysTheme():settings.theme; }
  function apply(){
    // Homepage lock: <body data-lock-layout="horizontal"> forces horizontal and
    // hides layout switching (homepage is an index, not the dashboard).
    try{
      if(document.body && document.body.getAttribute("data-lock-layout")==="horizontal"){
        if(settings.layout!=="horizontal"){ settings.layout="horizontal"; save(settings); }
      }
    }catch(e){}
    const eff=effectiveTheme();
    document.documentElement.dataset.theme=eff;
    document.documentElement.setAttribute("data-theme",eff);
    document.body.dataset.layout=settings.layout;
    document.body.dataset.sidebar=settings.sidebar;
    document.body.dataset.hstyle=settings.hstyle||"bar";
    document.body.dataset.glass=settings.glass?"on":"off";
    document.body.dataset.footer=settings.footerSticky?"sticky":"static";
    document.documentElement.lang=settings.lang;
    const dir=settings.dirAuto?(settings.lang==="fa"?"rtl":"ltr"):settings.dir;
    document.documentElement.dir=dir;
    document.documentElement.style.setProperty("--primary",settings.primary);
    // derive darker shade + soft tint + glow approx so every accent follows one color
    document.documentElement.style.setProperty("--primary-600",shade(settings.primary,-24));
    const rgb=hexRgb(settings.primary);
    if(rgb){
      document.documentElement.style.setProperty("--primary-soft","rgba("+rgb+",.13)");
      document.documentElement.style.setProperty("--primary-glow","rgba("+rgb+",.45)");
    }
    // sync sonner theme + dir
    document.querySelectorAll("[data-sonner-toaster]").forEach(el=>{
      el.setAttribute("data-sonner-theme",eff);
      el.setAttribute("dir",dir);
    });
    syncControls();
  }
  function hexRgb(hex){
    try{
      let h=String(hex).replace("#",""); if(h.length===3)h=h.split("").map(c=>c+c).join("");
      const n=parseInt(h,16); return ((n>>16)+","+((n>>8)&255)+","+(n&255));
    }catch(e){return null;}
  }
  function shade(hex,amt){
    try{
      let h=String(hex).replace("#",""); if(h.length===3)h=h.split("").map(c=>c+c).join("");
      let n=parseInt(h,16),r=(n>>16)+amt,g=((n>>8)&255)+amt,b=(n&255)+amt;
      r=Math.max(0,Math.min(255,r));g=Math.max(0,Math.min(255,g));b=Math.max(0,Math.min(255,b));
      return "#"+((r<<16)|(g<<8)|b).toString(16).padStart(6,"0");
    }catch(e){return hex;}
  }
  // Follow system changes only when allowed (bound once — survives Turbo visits)
  if(window.matchMedia&&!window.__akThemeMq){
    const mq=matchMedia("(prefers-color-scheme: dark)");
    const onSys=e=>{
      if(!userChangedTheme||settings.theme==="system"){
        apply();
        if(window.Sonner&&Sonner.setTheme)Sonner.setTheme(effectiveTheme());
      }
    };
    if(mq.addEventListener)mq.addEventListener("change",onSys); else if(mq.addListener)mq.addListener(onSys);
    window.__akThemeMq=true;
  }
  function set(patch, opts){
    opts=opts||{};
    // homepage lock: ignore layout changes away from horizontal
    try{
      if(document.body && document.body.getAttribute("data-lock-layout")==="horizontal" && patch.layout && patch.layout!=="horizontal"){
        patch=Object.assign({},patch); delete patch.layout;
      }
    }catch(e){}
    Object.assign(settings,patch);
    if(patch.theme!==undefined)userChangedTheme=(patch.theme!=="system");
    if(patch.lang!==undefined&&settings.dirAuto){settings.dir=settings.lang==="fa"?"rtl":"ltr";}
    save(settings);apply();
    if(!opts.silent&&window.App&&App.toastChanged)App.toastChanged(patch);
  }
  function syncNice(sel){ try{ if(sel&&sel._nice&&sel._nice.root&&sel._nice.root.isConnected)sel._nice.syncFromSrc(); }catch(e){} }
  function syncControls(){
    document.querySelectorAll("[data-set-theme]").forEach(el=>{el.checked=(el.value===settings.theme); if(el.tagName==="SELECT")el.value=settings.theme;});
    const sel=document.getElementById("setTheme"); if(sel){ sel.value=settings.theme; syncNice(sel); }
    const lay=document.getElementById("setLayout"); if(lay){ lay.value=settings.layout; syncNice(lay); }
    const sb=document.getElementById("setSidebar"); if(sb){ sb.value=settings.sidebar; syncNice(sb); }
    const hs=document.getElementById("setHstyle"); if(hs){ hs.value=settings.hstyle||"bar"; syncNice(hs); }
    const ft=document.getElementById("setFooter"); if(ft){ ft.value=settings.footerSticky?"sticky":"static"; syncNice(ft); }
    const gl=document.getElementById("setGlass"); if(gl)gl.checked=!!settings.glass;
    const lg=document.getElementById("setLang"); if(lg){ lg.value=settings.lang; syncNice(lg); }
    const dr=document.getElementById("setDir"); if(dr){ dr.value=settings.dirAuto?"auto":settings.dir; syncNice(dr); }
    const im=document.getElementById("setIdle"); if(im)im.value=String(settings.idleMinutes);
    const pr=document.getElementById("setPrimary"); if(pr)pr.value=settings.primary;
    const tp=document.getElementById("topPrimary"); if(tp)tp.value=settings.primary;
    const tbp=document.getElementById("tbPrimary"); if(tbp)tbp.value=settings.primary;
    const tbg=document.getElementById("tbGlass"); if(tbg)tbg.checked=!!settings.glass;
    const lt=document.getElementById("layoutToggle"); if(lt)lt.classList.toggle("on",settings.layout==="horizontal");
    // topbar dropdown selected states (theme / layout / sidebar / hstyle / lang)
    document.querySelectorAll("[data-theme-pick]").forEach(b=>b.classList.toggle("on",b.dataset.themePick===settings.theme));
    document.querySelectorAll("[data-layout-pick]").forEach(b=>b.classList.toggle("on",b.dataset.layoutPick===settings.layout));
    document.querySelectorAll("[data-sidebar-pick]").forEach(b=>b.classList.toggle("on",b.dataset.sidebarPick===settings.sidebar));
    document.querySelectorAll("[data-hstyle-pick]").forEach(b=>b.classList.toggle("on",(b.dataset.hstylePick||"bar")===(settings.hstyle||"bar")));
    document.querySelectorAll("[data-footer-pick]").forEach(b=>b.classList.toggle("on",(b.dataset.footerPick==="sticky")===!!settings.footerSticky));
    document.querySelectorAll("[data-lang]").forEach(b=>b.classList.toggle("on",b.dataset.lang===settings.lang));
    const ll=document.getElementById("tbLangLabel"); if(ll)ll.textContent=(settings.lang==="fa")?"فا":"EN";
    const ti=document.getElementById("tbThemeIcon");
    if(ti)ti.className="fa-solid "+(settings.theme==="system"?"fa-circle-half-stroke":(ThemeStore.effectiveTheme()==="dark"?"fa-sun":"fa-moon"));
    document.querySelectorAll(".swatch").forEach(s=>s.classList.toggle("active",s.dataset.color===settings.primary));
    // homepage lock: disable layout controls visually
    try{
      const locked=document.body&&document.body.getAttribute("data-lock-layout")==="horizontal";
      document.querySelectorAll("[data-layout-pick],#setLayout").forEach(el=>{
        if(locked){ el.setAttribute("disabled",""); el.setAttribute("aria-disabled","true"); el.title="Locked to horizontal on homepage"; }
        else{ el.removeAttribute("disabled"); el.removeAttribute("aria-disabled"); el.removeAttribute("title"); }
      });
    }catch(e){}
    // skip link (a11y): one injection covers every page
    const m=document.querySelector("main.content");
    if(m&&!document.getElementById("skipLink")){
      m.id=m.id||"main"; if(!m.hasAttribute("tabindex"))m.setAttribute("tabindex","-1");
      const a=document.createElement("a"); a.href="#main"; a.id="skipLink"; a.className="skip";
      a.setAttribute("data-i18n","skip");
      a.textContent=settings.lang==="fa"?"پرش به محتوا":"Skip to content";
      document.body.prepend(a);
    }
  }
  window.ThemeStore={get:()=>Object.assign({},settings),set,apply,effectiveTheme,KEY};
  document.addEventListener("DOMContentLoaded",apply);
  document.addEventListener("turbo:load",apply); // Hotwired Turbo visit (see README §18)
})();
