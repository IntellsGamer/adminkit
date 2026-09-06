/* ============================================================================
   Sonner — vanilla JS port (exact replica of React original)
   ORIGINAL SOURCE (MIT, Emil Kowalski):
     - https://github.com/emilkowalski/sonner/blob/master/src/styles.css  (729 lines, copied VERBATIM to assets/css/sonner.css)
     - https://github.com/emilkowalski/sonner/blob/master/src/state.ts    (Observer, toast API, promise, history)
     - https://github.com/emilkowalski/sonner/blob/master/src/index.tsx   (Toast, Toaster, swipe, timers, stacking)
     - https://github.com/emilkowalski/sonner/blob/master/src/types.ts    (ToastT/ToasterProps/positions)
     - https://github.com/emilkowalski/sonner/blob/master/src/assets.tsx  (SVG icons + Loader, copied exactly below)
   Vendored originals kept in _source/sonner/ for audit.
   This file is a line-for-line behavioral port: same data-attributes, same
   CSS vars, same stacking math, same swipe physics, same promise flow —
   so the ORIGINAL styles.css works unchanged. No React. No CDN. Offline.
   Public API mirrors React: toast(msg,opts), toast.success/error/info/
   warning/loading/message/promise/custom/dismiss/getHistory/getToasts,
   Sonner.createToaster({...}) === <Toaster {...}/> props.
   ============================================================================ */
(function(global){
"use strict";
/* ---------- constants: index.tsx lines 22-43 ---------- */
const VISIBLE_TOASTS_AMOUNT=3, VIEWPORT_OFFSET="24px", MOBILE_VIEWPORT_OFFSET="16px",
  TOAST_LIFETIME=4000, TOAST_WIDTH=356, GAP=14, SWIPE_THRESHOLD=45, TIME_BEFORE_UNMOUNT=200;
const MAX_HISTORY_SIZE=100;
let toastsCounter=1;

/* ---------- assets.tsx: getAsset + icons (exact SVGs) ---------- */
const ICONS={
success:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" height="20" width="20" aria-hidden="true"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>',
warning:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" height="20" width="20" aria-hidden="true"><path fill-rule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clip-rule="evenodd"/></svg>',
info:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" height="20" width="20" aria-hidden="true"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd"/></svg>',
error:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" height="20" width="20" aria-hidden="true"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/></svg>',
close:'<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'};
function getAsset(type){ return ICONS[type]||null; }
function loaderHTML(visible,extraClass){
  let bars=""; for(let i=0;i<12;i++)bars+='<div class="sonner-loading-bar"></div>';
  return '<div class="'+["sonner-loading-wrapper",extraClass].filter(Boolean).join(" ")+'" data-visible="'+visible+'"><div class="sonner-spinner">'+bars+'</div></div>';
}
function isAction(a){ return a&&typeof a==="object"&&a.label!==undefined; }
function isHttpResponse(d){ return d&&typeof d==="object"&&"ok"in d&&typeof d.ok==="boolean"&&"status"in d&&typeof d.status==="number"; }
function getToastId(data){ return (typeof data?.id==="number"||(typeof data?.id==="string"&&data.id.length>0))?data.id:toastsCounter++; }

/* ---------- state.ts: Observer (exact logic) ---------- */
class Observer{
  constructor(){ this.subscribers=[]; this.toasts=[]; this.dismissedToasts=new Set(); this.pendingDismissals=new Map(); }
  subscribe(sub){
    this.subscribers.push(sub);
    this.getActiveToasts().forEach(t=>sub(t));
    return ()=>{ const i=this.subscribers.indexOf(sub); if(i>=0)this.subscribers.splice(i,1); };
  }
  publish(data){ this.subscribers.forEach(s=>s(data)); }
  addToast(data){ this.publish(data); this.toasts=[...this.toasts,data]; this.trimHistory(); }
  trimHistory(){
    let toRemove=this.toasts.length-MAX_HISTORY_SIZE; if(toRemove<=0)return;
    this.toasts=this.toasts.filter(t=>{ if(toRemove>0&&this.dismissedToasts.has(t.id)){this.dismissedToasts.delete(t.id);toRemove--;return false;} return true; });
  }
  create(data){
    const {message,...rest}=data||{};
    const id=getToastId(data||{});
    const pending=this.pendingDismissals.get(id);
    if(pending!==undefined){ cancelAnimationFrame(pending); this.pendingDismissals.delete(id); this.dismissedToasts.delete(id); }
    const wasDismissed=this.dismissedToasts.has(id);
    const dismissible=data.dismissible===undefined?true:data.dismissible;
    if(wasDismissed){ this.dismissedToasts.delete(id); this.toasts=this.toasts.filter(t=>t.id!==id); }
    const alreadyExists=wasDismissed?undefined:this.toasts.find(t=>t.id===id);
    if(alreadyExists){
      this.toasts=this.toasts.map(t=>{ if(t.id===id){ this.publish({...t,...data,id,title:message}); return {...t,...data,id,dismissible,title:message}; } return t; });
    }else{ this.addToast({title:message,...rest,dismissible,id}); }
    return id;
  }
  dismiss(id){
    if(id===undefined||id===null){ this.getActiveToasts().forEach(t=>{ this.dismissedToasts.add(t.id); this.subscribers.forEach(s=>s({id:t.id,dismiss:true})); }); return id; }
    this.dismissedToasts.add(id);
    const ap=this.pendingDismissals.get(id); if(ap!==undefined)cancelAnimationFrame(ap);
    this.pendingDismissals.set(id,requestAnimationFrame(()=>{ this.pendingDismissals.delete(id); this.subscribers.forEach(s=>s({id,dismiss:true})); }));
    return id;
  }
  message(message,data){ return this.create({...data,message,type:undefined}); }
  error(message,data){ return this.create({...data,message,type:"error"}); }
  success(message,data){ return this.create({...data,type:"success",message}); }
  info(message,data){ return this.create({...data,type:"info",message}); }
  warning(message,data){ return this.create({...data,type:"warning",message}); }
  loading(message,data){ return this.create({...data,type:"loading",message}); }
  promise(promise,data){
    if(!data)return;
    let id=undefined;
    if(data.loading!==undefined){ id=this.create({...data,promise,type:"loading",message:data.loading,description:typeof data.description!=="function"?data.description:undefined}); }
    const p=Promise.resolve(promise instanceof Function?promise():promise);
    let shouldDismiss=id!==undefined, result;
    const self=this;
    const originalPromise=p.then(async(response)=>{
      result=["resolve",response];
      const isEl=response&&response.__sonnerElement;
      if(isEl){ shouldDismiss=false; self.create({id,type:"default",message:response}); }
      else if(isHttpResponse(response)&&!response.ok){
        shouldDismiss=false;
        const pd=typeof data.error==="function"?await data.error("HTTP error! status: "+response.status):data.error;
        const desc=typeof data.description==="function"?await data.description("HTTP error! status: "+response.status):data.description;
        const ext=typeof pd==="object"&&pd!==null&&!pd.__sonnerElement;
        self.create({id,type:"error",description:desc,...(ext?pd:{message:pd})});
      }else if(response instanceof Error){
        shouldDismiss=false;
        const pd=typeof data.error==="function"?await data.error(response):data.error;
        const desc=typeof data.description==="function"?await data.description(response):data.description;
        const ext=typeof pd==="object"&&pd!==null&&!pd.__sonnerElement;
        self.create({id,type:"error",description:desc,...(ext?pd:{message:pd})});
      }else if(data.success!==undefined){
        shouldDismiss=false;
        const pd=typeof data.success==="function"?await data.success(response):data.success;
        const desc=typeof data.description==="function"?await data.description(response):data.description;
        const ext=typeof pd==="object"&&pd!==null&&!pd.__sonnerElement;
        self.create({id,type:"success",description:desc,...(ext?pd:{message:pd})});
      }
    }).catch(async(error)=>{
      result=["reject",error];
      if(data.error!==undefined){
        shouldDismiss=false;
        const pd=typeof data.error==="function"?await data.error(error):data.error;
        const desc=typeof data.description==="function"?await data.description(error):data.description;
        const ext=typeof pd==="object"&&pd!==null&&!pd.__sonnerElement;
        self.create({id,type:"error",description:desc,...(ext?pd:{message:pd})});
      }
    }).finally(()=>{ if(shouldDismiss){ self.dismiss(id); id=undefined; } if(data.finally)data.finally(); });
    const unwrap=()=>new Promise((res,rej)=>originalPromise.then(()=>result[0]==="reject"?rej(result[1]):res(result[1])).catch(rej));
    if(typeof id!=="string"&&typeof id!=="number")return{unwrap};
    const num=Number(id); const out=(typeof id==="number")?id:id;
    try{ return Object.assign(out,{unwrap}); }catch(e){ return{unwrap,id}; }
  }
  custom(jsx,data){
    const id=getToastId(data);
    const node=(typeof jsx==="function")?jsx(id):jsx;
    this.create({...data,jsx:node,id,type:undefined});
    return id;
  }
  getActiveToasts(){ return this.toasts.filter(t=>!this.dismissedToasts.has(t.id)); }
}
const ToastState=new Observer();
function basicToast(message,data){ return ToastState.message(message,data); }
const toast=Object.assign(basicToast,{
  success:ToastState.success.bind(ToastState), info:ToastState.info.bind(ToastState),
  warning:ToastState.warning.bind(ToastState), error:ToastState.error.bind(ToastState),
  custom:ToastState.custom.bind(ToastState), message:ToastState.message.bind(ToastState),
  promise:ToastState.promise.bind(ToastState), dismiss:ToastState.dismiss.bind(ToastState),
  loading:ToastState.loading.bind(ToastState),
  getHistory:()=>ToastState.toasts, getToasts:()=>ToastState.getActiveToasts()
});

/* ---------- helpers mirroring index.tsx ---------- */
function cn(...c){ return c.filter(Boolean).join(" "); }
function getDefaultSwipeDirections(position){ const p=String(position||"bottom-right").split("-"); const d=[]; if(p[0])d.push(p[0]); if(p[1])d.push(p[1]); return d; }
function getDocumentDirection(){ if(typeof document==="undefined")return"ltr"; const a=document.documentElement.getAttribute("dir"); if(a==="auto"||!a){ try{return getComputedStyle(document.documentElement).direction||"ltr";}catch(e){return"ltr";} } return a; }
function assignOffset(def,mob){
  const styles={};
  [[def,false],[mob,true]].forEach(([off,isMobile])=>{
    const prefix=isMobile?"--mobile-offset":"--offset", dv=isMobile?MOBILE_VIEWPORT_OFFSET:VIEWPORT_OFFSET;
    function all(v){ ["top","right","bottom","left"].forEach(k=>styles[prefix+"-"+k]=typeof v==="number"?v+"px":v); }
    if(typeof off==="number"||typeof off==="string")all(off);
    else if(off&&typeof off==="object")["top","right","bottom","left"].forEach(k=>{ styles[prefix+"-"+k]=(off[k]===undefined)?dv:(typeof off[k]==="number"?off[k]+"px":off[k]); });
    else all(dv);
  });
  return styles;
}
function useIsDocumentHidden(el,cb){
  const h=()=>cb(document.hidden);
  document.addEventListener("visibilitychange",h);
  return ()=>document.removeEventListener("visibilitychange",h);
}
function asHTML(v){
  if(v==null)return"";
  if(typeof v==="string")return escapeHTML(v);
  if(typeof v==="number")return String(v);
  if(v&&v.__sonnerHTML)return v.__sonnerHTML;         // toast.html("<b>x</b>")
  if(v instanceof Node){ const d=document.createElement("div"); d.appendChild(v.cloneNode(true)); return d.innerHTML; }
  if(typeof v==="function"){ try{return asHTML(v());}catch(e){return"";} }
  return escapeHTML(String(v));
}
function escapeHTML(s){ return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
toast.html=function(html){ return {__sonnerHTML:String(html)}; };

/* ---------- Toaster (vanilla port of <Toaster/>) ---------- */
const toasters=[];
function createToaster(userProps){
  const props=Object.assign({position:"bottom-right",hotkey:["altKey","KeyT"],expand:false,closeButton:false,
    theme:"system",richColors:false,duration:TOAST_LIFETIME,visibleToasts:VISIBLE_TOASTS_AMOUNT,gap:GAP,
    dir:"auto",offset:undefined,mobileOffset:undefined,invert:false,swipeDirections:undefined,toastOptions:{},
    containerAriaLabel:"Notifications",customAriaLabel:undefined,icons:{}},userProps||{});
  const state={toasts:[],heights:[],expanded:false,interacting:false,
    actualTheme:props.theme!=="system"?props.theme:(matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"),
    isHidden:document.hidden, focusedRestore:null, isFocusWithin:false};
  const section=document.createElement("section");
  section.setAttribute("tabindex","-1"); section.setAttribute("aria-live","polite");
  section.setAttribute("aria-relevant","additions text"); section.setAttribute("aria-atomic","false");
  const hotkeyLabel=(props.hotkey||[]).join("+").replace(/Key/g,"").replace(/Digit/g,"");
  section.setAttribute("aria-label",(props.customAriaLabel||props.containerAriaLabel+" "+hotkeyLabel).trim());
  const listByPos={}; // pos -> ol
  function offsetVars(){ return assignOffset(props.offset,props.mobileOffset); }
  function dirOf(){ return props.dir==="auto"?getDocumentDirection():props.dir; }
  function possiblePositions(){
    const base=[props.position];
    state.toasts.forEach(t=>{ if(t.position&&!base.includes(t.position))base.push(t.position); });
    return base;
  }
  function ensureOL(pos){
    if(listByPos[pos]&&listByPos[pos].isConnected)return listByPos[pos];
    const [y,x]=pos.split("-");
    const ol=document.createElement("ol");
    ol.setAttribute("tabindex","-1");
    ol.setAttribute("data-sonner-toaster","");
    ol.setAttribute("data-sonner-theme",state.actualTheme);
    ol.setAttribute("data-y-position",y); ol.setAttribute("data-x-position",x);
    ol.setAttribute("dir",dirOf());
    ol.style.setProperty("--front-toast-height",(state.heights[0]?.height||0)+"px");
    ol.style.setProperty("--width",TOAST_WIDTH+"px");
    ol.style.setProperty("--gap",(props.toastOptions.gap??props.gap??GAP)+"px");
    Object.entries(offsetVars()).forEach(([k,v])=>ol.style.setProperty(k,v));
    if(props.className)ol.className=props.className;
    if(props.style)Object.assign(ol.style,props.style);
    ol.addEventListener("mouseenter",()=>{state.expanded=true;render();});
    ol.addEventListener("mousemove",()=>{if(!state.expanded){state.expanded=true;render();}});
    ol.addEventListener("mouseleave",()=>{if(!state.interacting){state.expanded=false;render();}});
    ol.addEventListener("dragend",()=>{state.expanded=false;render();});
    ol.addEventListener("pointerdown",e=>{ const n=e.target instanceof HTMLElement; if(n&&e.target.dataset.dismissible==="false")return; state.interacting=true; render(); });
    ol.addEventListener("pointerup",()=>{state.interacting=false;render();});
    ol.addEventListener("focus",e=>{ if(e.target instanceof HTMLElement&&e.target.dataset.dismissible==="false")return; if(!state.isFocusWithin){state.isFocusWithin=true;state.focusedRestore=e.relatedTarget;} },{capture:false});
    ol.addEventListener("blur",e=>{ if(state.isFocusWithin&&!ol.contains(e.relatedTarget)){state.isFocusWithin=false; if(state.focusedRestore&&state.focusedRestore.focus)try{state.focusedRestore.focus({preventScroll:true});}catch(_){}} });
    section.appendChild(ol); listByPos[pos]=ol; return ol;
  }
  function removeToast(t){
    const found=state.toasts.find(x=>x.id===t.id);
    if(found&&!found.delete)ToastState.dismiss(t.id);
    state.toasts=state.toasts.filter(x=>x.id!==t.id);
    render();
  }
  function toastRuntime(t){ return listByPos.__rt&&listByPos.__rt[t.id]; }
  function render(){
    // theme attr sync
    const poss=possiblePositions();
    Object.keys(listByPos).forEach(k=>{ if(k==="__rt")return; if(!poss.includes(k)&&listByPos[k].isConnected)listByPos[k].remove(); });
    if(state.toasts.length<=1&&state.expanded){state.expanded=false;}
    poss.forEach(pos=>{
      const inPos=state.toasts.filter(t=>(!t.position&&poss.indexOf(pos)===0)||t.position===pos);
      if(!inPos.length){ if(listByPos[pos]&&listByPos[pos].isConnected)listByPos[pos].innerHTML=""; return; }
      const ol=ensureOL(pos);
      ol.setAttribute("data-sonner-theme",state.actualTheme);
      ol.setAttribute("dir",dirOf());
      // per-render vars (index.tsx sets these on every render): front height drives
      // the collapsed-stack animation; without this stacked toasts stay 0px tall.
      const posHeights=state.heights.filter(h=>(h.position||props.position)===pos);
      const gapNow=(props.toastOptions.gap??props.gap??GAP);
      ol.style.setProperty("--front-toast-height",((posHeights[0]&&posHeights[0].height)||0)+"px");
      ol.style.setProperty("--width",TOAST_WIDTH+"px");
      ol.style.setProperty("--gap",gapNow+"px");
      // reconcile by id. New nodes are INSERTED at their index; existing nodes
      // are NEVER moved: remove+reinsert disconnects a node, which cancels its
      // running CSS transitions and discards its before-change style (this was
      // killing the enter animation). Mirrors React's keyed reconciliation,
      // which also leaves in-place nodes untouched.
      const seen=new Set();
      inPos.forEach((t,index)=>{
        seen.add(String(t.id));
        let li=ol.querySelector('li[data-toast-id="'+CSS.escape(String(t.id))+'"]');
        if(!li){ li=buildToast(t,index,inPos,pos); ol.insertBefore(li,ol.children[index]||null); }
        updateToast(li,t,index,inPos,pos);
      });
      [...ol.children].forEach(ch=>{ if(ch.tagName==="LI"&&!seen.has(ch.getAttribute("data-toast-id")))ch.remove(); });
    });
  }
  function buildToast(t,index,group,pos){
    const li=document.createElement("li");
    li.setAttribute("tabindex","0");
    li.setAttribute("data-sonner-toast","");
    li.setAttribute("data-toast-id",String(t.id));
    // pre-paint state so the enter transition (opacity/transform in styles.css)
    // has a starting frame — mirrors React painting mounted=false first.
    li.setAttribute("data-mounted","false");
    li.style.setProperty("--offset","0px");
    attachToastEvents(li,t);
    return li;
  }
  function heightsFor(pos){ return state.heights.filter(h=>h.position==pos||(!h.position&&pos===props.position)); }
  function updateToast(li,t,index,group,pos){
    const gap=(props.toastOptions.gap??props.gap??GAP);
    const [y,x]=pos.split("-");
    const rt=listByPos.__rt||(listByPos.__rt={});
    if(!rt[t.id])rt[t.id]={mounted:false,removed:false,swiping:false,swipeOut:false,swipeOutDir:null,isSwiped:false,offsetBeforeRemove:0,initialHeight:0,remaining:t.duration||props.toastOptions.duration||props.duration||TOAST_LIFETIME,closeStart:0,lastStart:0,pointerStart:null,swipeDir:null,timer:null};
    const R=rt[t.id];
    const visibleToasts=props.toastOptions.visibleToasts??props.visibleToasts??VISIBLE_TOASTS_AMOUNT;
    const isFront=index===0, isVisible=index+1<=visibleToasts;
    const toastType=t.type, key=toastType||"default";
    const dismissible=t.dismissible!==false;
    const closeButton=t.closeButton??props.toastOptions.closeButton??props.closeButton;
    const duration=t.duration||props.toastOptions.duration||props.duration||TOAST_LIFETIME;
    // heights math (index.tsx: toastsHeightBefore + heightIndex)
    let hIdx=state.heights.findIndex(h=>String(h.toastId)===String(t.id)); if(hIdx<0)hIdx=index;
    const hs=heightsFor(t.position||pos);
    let before=0; state.heights.slice().forEach((h,ri)=>{ if(ri>=hIdx)return; before+=h.height; });
    const offset=hIdx*gap+before;
    R.offset=offset;
    const expanded=Boolean(state.expanded||((props.toastOptions.expand??props.expand)&&R.mounted));
    li.setAttribute("data-rich-colors",t.richColors??props.richColors??false);
    li.setAttribute("data-styled",!(t.jsx||t.unstyled||props.toastOptions.unstyled)?"true":"false");
    li.setAttribute("data-mounted",R.mounted?"true":"false");
    li.setAttribute("data-promise",t.promise?"true":"false");
    li.setAttribute("data-swiped",R.isSwiped?"true":"false");
    li.setAttribute("data-removed",R.removed?"true":"false");
    li.setAttribute("data-visible",isVisible?"true":"false");
    li.setAttribute("data-y-position",y); li.setAttribute("data-x-position",x);
    li.setAttribute("data-index",index); li.setAttribute("data-front",isFront?"true":"false");
    li.setAttribute("data-swiping",R.swiping?"true":"false");
    li.setAttribute("data-dismissible",dismissible?"true":"false");
    if(toastType)li.setAttribute("data-type",toastType); else li.removeAttribute("data-type");
    li.setAttribute("data-invert",(t.invert||props.invert)?"true":"false");
    li.setAttribute("data-swipe-out",R.swipeOut?"true":"false");
    if(R.swipeOutDir)li.setAttribute("data-swipe-direction",R.swipeOutDir); else li.removeAttribute("data-swipe-direction");
    li.setAttribute("data-expanded",expanded?"true":"false");
    if(t.testId)li.setAttribute("data-testid",t.testId);
    li.style.setProperty("--index",index); li.style.setProperty("--toasts-before",index);
    li.style.setProperty("--z-index",group.length-index);
    li.style.setProperty("--offset",(R.removed?R.offsetBeforeRemove:(R.offset||0))+"px");
    li.style.setProperty("--initial-height",(props.toastOptions.expand??props.expand)?"auto":(R.initialHeight||0)+"px");
    Object.assign(li.style,props.style||{},props.toastOptions.style||{},t.style||{});
    // classNames (index.tsx cn merge)
    li.className=cn(props.className,props.toastOptions.className,t.className,props.toastOptions.classNames?.toast,t.classNames?.toast,props.toastOptions.classNames?.[key],t.classNames?.[key]);
    // inner HTML (rebuilt when content changes)
    const sig=JSON.stringify([t.title&&asHTML(t.title),t.description&&asHTML(t.description),toastType,Boolean(t.jsx),Boolean(t.action&&isAction(t.action)&&t.action.label),Boolean(t.cancel&&isAction(t.cancel)&&t.cancel.label),Boolean(closeButton),t.invert]);
    if(li.__sig!==sig){
      li.__sig=sig;
      const invert=(t.invert||props.invert);
      let html="";
      if(closeButton&&!t.jsx&&toastType!=="loading"){
        html+='<button aria-label="'+escapeHTML(props.toastOptions.closeButtonAriaLabel||"Close toast")+'" data-disabled="'+(toastType==="loading")+'" data-close-button class="'+cn(props.toastOptions.classNames?.closeButton,t.classNames?.closeButton)+'">'+(props.icons?.close||t.icons?.close||ICONS.close)+"</button>";
      }
      const showIcon=(toastType||t.icon||t.promise)&&t.icon!==null&&((props.icons?.[toastType]!==null)||t.icon);
      if(showIcon){
        const customIcon=t.icon?asHTML(t.icon):(props.icons?.[toastType]?asHTML(props.icons[toastType]):"");
        let iconInner="";
        if(toastType==="loading")iconInner=(t.icon?asHTML(t.icon):"")+loaderHTML(true,cn(props.toastOptions.classNames?.loader,t.classNames?.loader));
        else if(t.promise)iconInner=loaderHTML(true,cn(props.toastOptions.classNames?.loader,t.classNames?.loader));
        if(toastType!=="loading")iconInner+=customIcon||(getAsset(toastType)||"");
        html+='<div data-icon="" class="'+cn(props.toastOptions.classNames?.icon,t.classNames?.icon)+'">'+iconInner+"</div>";
      }
      const body=t.jsx?(t.jsx.__sonnerHTML||asHTML(t.jsx)):asHTML(t.title);
      html+='<div data-content="" class="'+cn(props.toastOptions.classNames?.content,t.classNames?.content)+'"><div data-title="" class="'+cn(props.toastOptions.classNames?.title,t.classNames?.title)+'">'+body+"</div>";
      if(t.description)html+='<div data-description="" class="'+cn(props.toastOptions.descriptionClassName||"",props.toastOptions.classNames?.description,t.descriptionClassName||"",t.classNames?.description)+'">'+asHTML(t.description)+"</div>";
      html+="</div>";
      if(t.cancel&&isAction(t.cancel))html+='<button data-button data-cancel class="'+cn(props.toastOptions.classNames?.cancelButton,t.classNames?.cancelButton)+'">'+escapeHTML(t.cancel.label)+"</button>";
      if(t.action&&isAction(t.action))html+='<button data-button class="'+cn(props.toastOptions.classNames?.actionButton,t.classNames?.actionButton)+'">'+escapeHTML(t.action.label)+"</button>";
      li.innerHTML=html;
      const cb=li.querySelector("[data-close-button]");
      if(cb)cb.addEventListener("click",ev=>{ ev.stopPropagation(); if(toastType==="loading"||!dismissible)return; deleteToast(t,R); if(t.onDismiss)t.onDismiss(t); });
      const ab=li.querySelector("[data-button]:not([data-cancel])");
      if(ab&&t.action&&isAction(t.action)){ if(t.actionButtonStyle||props.toastOptions.actionButtonStyle)Object.assign(ab.style,t.actionButtonStyle||props.toastOptions.actionButtonStyle); ab.addEventListener("click",ev=>{ t.action.onClick&&t.action.onClick(ev); if(ev.defaultPrevented)return; deleteToast(t,R); }); }
      const cx=li.querySelector("[data-cancel]");
      if(cx&&t.cancel&&isAction(t.cancel)){ if(t.cancelButtonStyle||props.toastOptions.cancelButtonStyle)Object.assign(cx.style,t.cancelButtonStyle||props.toastOptions.cancelButtonStyle); cx.addEventListener("click",ev=>{ if(!dismissible)return; t.cancel.onClick&&t.cancel.onClick(ev); deleteToast(t,R); }); }
    }
    // mount animation + measure (index.tsx effects). Two things are required:
    // 1. Establish the pre-animation baseline: a freshly-inserted element has
    //    no "before-change style", so if its first style calculation already
    //    sees data-mounted=true, the enter transition never runs. Forcing a
    //    synchronous layout while data-mounted=false commits that baseline.
    //    (React gets this for free: setMounted(true) runs in a post-paint
    //    effect, i.e. after the browser computed + rendered mounted=false.)
    // 2. Flip to true on a later frame (double rAF) so the change is picked
    //    up as a transition rather than part of the initial style.
    if(!R.mounted){
      if(!R.mountQueued){ R.mountQueued=true;
        void li.offsetHeight;
        requestAnimationFrame(()=>requestAnimationFrame(()=>{ R.mounted=true; measure(li,t,R); render(); }));
      }
    }
    else if(!R.measured){ measure(li,t,R); }
    // timer (pause on expanded/interacting/hidden; skip loading/promise-loading/Infinity)
    setupTimer(li,t,R,duration,expanded);
  }
  function measure(li,t,R){
    try{
      const h=li.getBoundingClientRect().height||0;
      R.initialHeight=h; R.measured=true;
      const ex=state.heights.find(x=>String(x.toastId)===String(t.id));
      if(!ex)state.heights=[{toastId:t.id,height:h,position:t.position},...state.heights];
      else ex.height=h;
    }catch(e){}
  }
  function deleteToast(t,R){
    R=R||(listByPos.__rt&&listByPos.__rt[t.id])||{};
    R.removed=true; R.offsetBeforeRemove=R.offset||0;
    state.heights=state.heights.filter(h=>String(h.toastId)!==String(t.id));
    render();
    setTimeout(()=>removeToast(t),TIME_BEFORE_UNMOUNT);
  }
  function setupTimer(li,t,R,duration,expanded){
    if(R.timer){clearTimeout(R.timer);R.timer=null;}
    if((t.promise&&t.type==="loading")||t.duration===Infinity||t.type==="loading")return;
    if(duration===Infinity)return;
    if(expanded||state.interacting||state.isHidden){
      if(R.lastStart<R.closeStart){ R.remaining=R.remaining-(Date.now()-R.closeStart); }
      R.lastStart=Date.now(); return;
    }
    R.closeStart=Date.now();
    R.timer=setTimeout(()=>{ if(t.onAutoClose)t.onAutoClose(t); deleteToast(t,R); },Math.max(0,R.remaining));
    // hover pause handled via expanded/interacting re-render; also direct listeners:
  }
  function attachToastEvents(li,t){
    li.addEventListener("dragend",()=>{ const R=listByPos.__rt[t.id]; if(R){R.swiping=false;R.swipeDir=null;R.pointerStart=null;} render(); });
    li.addEventListener("pointerdown",e=>{
      const R=listByPos.__rt[t.id]; if(!R)return;
      if(e.button===2)return;
      const dismissible=t.dismissible!==false, disabled=t.type==="loading";
      if(disabled||!dismissible)return;
      R.dragStart=new Date(); R.offsetBeforeRemove=R.offset||0;
      try{e.target.setPointerCapture&&e.target.setPointerCapture(e.pointerId);}catch(_){}
      if(e.target.tagName==="BUTTON")return;
      R.swiping=true; R.pointerStart={x:e.clientX,y:e.clientY}; render();
    });
    li.addEventListener("pointerup",()=>{
      const R=listByPos.__rt[t.id]; if(!R)return;
      if(R.swipeOut||t.dismissible===false)return;
      R.pointerStart=null;
      const sx=Number((li.style.getPropertyValue("--swipe-amount-x")||"0").replace("px",""))||0;
      const sy=Number((li.style.getPropertyValue("--swipe-amount-y")||"0").replace("px",""))||0;
      const dt=Math.max(1,Date.now()-(R.dragStart?R.dragStart.getTime():Date.now()));
      const amt=R.swipeDir==="x"?sx:sy, vel=Math.abs(amt)/dt;
      const dirs=props.swipeDirections||getDefaultSwipeDirections(t.position||props.position);
      const allowed=R.swipeDir==="x"?dirs.includes(sx>0?"right":"left"):dirs.includes(sy>0?"bottom":"top");
      if(allowed&&(Math.abs(amt)>=SWIPE_THRESHOLD||vel>0.11)){
        R.offsetBeforeRemove=R.offset||0;
        if(t.onDismiss)t.onDismiss(t);
        R.swipeOutDir=R.swipeDir==="x"?(sx>0?"right":"left"):(sy>0?"down":"up");
        deleteToast(t,R); R.swipeOut=true; render(); return;
      }else{ li.style.setProperty("--swipe-amount-x","0px"); li.style.setProperty("--swipe-amount-y","0px"); }
      R.isSwiped=false; R.swiping=false; R.swipeDir=null; render();
    });
    li.addEventListener("pointermove",e=>{
      const R=listByPos.__rt[t.id]; if(!R||!R.pointerStart||t.dismissible===false)return;
      try{ if(window.getSelection&&window.getSelection().toString().length>0)return; }catch(_){}
      const yD=e.clientY-R.pointerStart.y, xD=e.clientX-R.pointerStart.x;
      if(!R.swipeDir&&(Math.abs(xD)>1||Math.abs(yD)>1))R.swipeDir=Math.abs(xD)>Math.abs(yD)?"x":"y";
      const damp=d=>1/(1.5+Math.abs(d)/20);
      const dirs=props.swipeDirections||getDefaultSwipeDirections(t.position||props.position);
      let sx=0,sy=0;
      if(R.swipeDir==="y"&&(dirs.includes("top")||dirs.includes("bottom"))){
        if((dirs.includes("top")&&yD<0)||(dirs.includes("bottom")&&yD>0))sy=yD; else{const dd=yD*damp(yD); sy=Math.abs(dd)<Math.abs(yD)?dd:yD;}
      }else if(R.swipeDir==="x"&&(dirs.includes("left")||dirs.includes("right"))){
        if((dirs.includes("left")&&xD<0)||(dirs.includes("right")&&xD>0))sx=xD; else{const dd=xD*damp(xD); sx=Math.abs(dd)<Math.abs(xD)?dd:xD;}
      }
      if(Math.abs(sx)>0||Math.abs(sy)>0)R.isSwiped=true;
      li.style.setProperty("--swipe-amount-x",sx+"px"); li.style.setProperty("--swipe-amount-y",sy+"px");
      if(R.swiping!==true){R.swiping=true;}
      li.setAttribute("data-swiping","true"); li.setAttribute("data-swiped",R.isSwiped?"true":"false");
    });
  }
  /* subscribe (index.tsx Toaster effect) */
  const unsub=ToastState.subscribe(ev=>{
    if(ev&&ev.dismiss){
      // Mark for exit only. The watcher below flips data-removed (starting
      // the exit transition) and filters the node after TIME_BEFORE_UNMOUNT
      // (mirrors React: deleteToast → timeout → removeToast). Filtering here
      // would yank the node instantly with no exit animation.
      state.toasts=state.toasts.map(x=>String(x.id)===String(ev.id)?{...x,delete:true}:x);
      render();
      return;
    }
    setTimeout(()=>{
      state.toasts=(()=>{
        const i=state.toasts.findIndex(x=>String(x.id)===String(ev.id));
        if(i!==-1){ const c=state.toasts.slice(); c[i]={...c[i],...ev}; return c; }
        return [ev,...state.toasts];
      })();
      // toast.delete effect
      if(ev.delete){ const R=listByPos.__rt&&listByPos.__rt[ev.id]; if(R){R.removed=true;} }
      render();
    },0);
  });
  /* theme system (index.tsx) */
  function sysListener(e){ if(props.theme==="system"){ state.actualTheme=e.matches?"dark":"light"; render(); } }
  let mq=null;
  if(props.theme==="system"&&window.matchMedia){ mq=matchMedia("(prefers-color-scheme: dark)"); if(mq.addEventListener)mq.addEventListener("change",sysListener); else if(mq.addListener)mq.addListener(sysListener); }
  /* hotkey Alt+T expand / Escape collapse */
  function onKey(e){
    const hk=props.hotkey||[];
    const hit=hk.length>0&&hk.every(k=>e[k]||e.code===k);
    if(hit){ state.expanded=true; const first=section.querySelector("ol"); if(first)first.focus(); render(); }
    if(e.code==="Escape"&&(document.activeElement===section.querySelector("ol")||section.contains(document.activeElement))){ state.expanded=false; render(); }
  }
  document.addEventListener("keydown",onKey);
  useIsDocumentHidden(null,v=>{state.isHidden=v;render();});
  /* toast.delete watcher */
  const iv=setInterval(()=>{ let ch=false; state.toasts.forEach(t=>{ if(t.delete){ const R=listByPos.__rt&&listByPos.__rt[t.id]; if(R&&!R.removed){R.removed=true;R.offsetBeforeRemove=R.offset||0;ch=true; setTimeout(()=>removeToast(t),TIME_BEFORE_UNMOUNT);} if(t.onDismiss&&!t.__dNotified){t.__dNotified=true; try{t.onDismiss(t);}catch(_){}} } }); if(ch)render(); },120);
  document.body.appendChild(section);
  render();
  const api={el:section,props,state,
    setTheme(th){ props.theme=th; state.actualTheme=th==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):th; render(); },
    setPosition(p){ props.position=p; render(); },
    destroy(){ unsub(); document.removeEventListener("keydown",onKey); clearInterval(iv); section.remove();
      const i=toasters.indexOf(api); if(i>=0)toasters.splice(i,1);
      if(defaultToaster===api)defaultToaster=null; }};
  toasters.push(api); return api;
}
/* default auto-mount mirrors <Toaster/> usage: Sonner.init() */
let defaultToaster=null;
function ensureDefault(opts){
  if(defaultToaster&&defaultToaster.el.isConnected)return defaultToaster;
  const s=window.ThemeStore?ThemeStore.get():{};
  defaultToaster=createToaster(Object.assign({position:s.toasterPosition||"bottom-right",theme:document.documentElement.dataset.theme||"system",dir:document.documentElement.dir||"auto"},opts||{}));
  return defaultToaster;
}
global.Sonner={createToaster,toast,getAsset,ICONS,ensureDefault,
  setTheme:t=>{ toasters.forEach(x=>x.setTheme(t)); },
  setPosition:p=>{ toasters.forEach(x=>x.setPosition(p)); if(window.ThemeStore)ThemeStore.set({toasterPosition:p},{silent:true}); }
};
global.toast=toast;
document.addEventListener("DOMContentLoaded",()=>ensureDefault());
})(window);
