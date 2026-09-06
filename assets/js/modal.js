/* ============================================================================
   Modal — vanilla port of Radix Dialog + shadcn/ui dialog styling
   ORIGINAL SOURCES (MIT):
     - radix-ui/primitives packages/react/dialog/src/dialog.tsx (614 lines,
       vendored at _source/modal/radix-dialog.tsx): Root/Provider state,
       Trigger/Content/Overlay/Title/Description/Close, modal vs non-modal,
       FocusScope trap, DismissableLayer (esc/outside), scroll-lock
       (react-remove-scroll), aria-hidden (hideOthers), controlled +
       uncontrolled open, onOpenChange.
     - shadcn/ui dialog styling (overlay bg-black/50 + content bg-background
       p-6 rounded-lg shadow + fade/zoom animations + close X): ported below
       as .mk-overlay/.mk-dialog etc. (no Tailwind at runtime — offline CSS).
   API for later dev: Modal.open({title,desc,body,footer,size,...}) and
   declarative data-modal-target. Full playground at playground-modal.html.
   ============================================================================ */
(function(g){
"use strict";
let seq=0, stack=[];
const FOCUSABLE='a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';
function lockScroll(){ const n=stack.filter(s=>s.opts.modal!==false).length; document.documentElement.style.overflow=n?"hidden":""; }
function trapTab(e,root){
  if(e.key!=="Tab")return;
  const els=[...root.querySelectorAll(FOCUSABLE)].filter(el=>el.offsetParent!==null);
  if(!els.length)return;
  const first=els[0],last=els[els.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
}
function open(opts){
  opts=opts||{};
  const id="mkd"+(++seq);
  const titleId=id+"-title", descId=id+"-desc";
  const overlay=document.createElement("div");
  overlay.className="mk-overlay"; overlay.dataset.modalOverlay="";
  const wrap=document.createElement("div");
  wrap.className="mk-dialog-wrap"; wrap.dataset.modalWrap="";
  const dlg=document.createElement("div");
  dlg.className="mk-dialog mk-size-"+(opts.size||"md");
  dlg.setAttribute("role","dialog"); dlg.setAttribute("aria-modal",opts.modal===false?"false":"true");
  dlg.setAttribute("aria-labelledby",titleId); dlg.setAttribute("aria-describedby",descId);
  dlg.dataset.modalDialog="";
  let html="";
  if(opts.showClose!==false)html+='<button class="mk-close" data-modal-close aria-label="Close dialog"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
  if(opts.title)html+='<div class="mk-head"><h3 class="mk-title" id="'+titleId+'">'+opts.title+'</h3>'+(opts.desc?'<p class="mk-desc" id="'+descId+'">'+opts.desc+'</p>':"")+"</div>";
  html+='<div class="mk-body'+(opts.scrollable===false?"":" is-scroll")+'">'+(opts.body||"")+"</div>";
  if(opts.footer)html+='<div class="mk-foot'+(opts.stickyFooter?" is-sticky":"")+'">'+opts.footer+"</div>";
  dlg.innerHTML=html;
  // allow Node bodies
  if(opts.bodyNode){ const b=dlg.querySelector(".mk-body"); b.innerHTML=""; b.appendChild(opts.bodyNode); }
  if(opts.footerNode){ const f=dlg.querySelector(".mk-foot"); if(f){f.innerHTML="";f.appendChild(opts.footerNode);} }
  wrap.appendChild(dlg); document.body.appendChild(overlay); document.body.appendChild(wrap);
  const rec={id,overlay,wrap,dlg,opts,prevFocus:document.activeElement};
  stack.push(rec); lockScroll();
  requestAnimationFrame(()=>{overlay.classList.add("show");wrap.classList.add("show");dlg.classList.add("show");});
  function close(result){
    if(!stack.includes(rec))return;
    overlay.classList.remove("show");wrap.classList.remove("show");dlg.classList.add("closing");
    setTimeout(()=>{overlay.remove();wrap.remove();},170);
    stack=stack.filter(s=>s!==rec); lockScroll();
    try{opts.onOpenChange&&opts.onOpenChange(false);}catch(e){}
    try{opts.onClose&&opts.onClose(result);}catch(e){}
    if(rec.prevFocus&&rec.prevFocus.focus)try{rec.prevFocus.focus({preventScroll:true});}catch(e){}
  }
  rec.close=close;
  overlay.addEventListener("mousedown",e=>{ if(opts.dismissOutside===false)return; if(e.target===overlay||e.target===wrap)close("outside"); });
  wrap.addEventListener("mousedown",e=>{ if(opts.dismissOutside===false)return; if(e.target===wrap)close("outside"); });
  dlg.addEventListener("click",e=>{ const c=e.target.closest("[data-modal-close]"); if(c)close("close-btn"); });
  dlg.addEventListener("keydown",e=>trapTab(e,dlg));
  document.addEventListener("keydown",function esc(e){ if(e.key==="Escape"&&stack[stack.length-1]===rec){ if(opts.dismissEsc===false)return; close("esc"); document.removeEventListener("keydown",esc); } });
  // autofocus
  setTimeout(()=>{ const f=dlg.querySelector("[data-autofocus]")||dlg.querySelector(FOCUSABLE); (f||dlg).focus&&((f||dlg).setAttribute("tabindex","-1"),(f||dlg).focus()); },60);
  try{opts.onOpenChange&&opts.onOpenChange(true);}catch(e){}
  return rec;
}
function confirm(o){
  o=o||{};
  return new Promise(res=>{
    const h=open({title:o.title||"Are you absolutely sure?",desc:o.desc||"This action cannot be undone.",
      body:o.body||"",footer:'<button class="btn btn-ghost" data-x="cancel">Cancel</button> <button class="btn btn-danger" data-x="ok">Confirm</button>',
      size:o.size||"sm",stickyFooter:true});
    h.dlg.addEventListener("click",e=>{
      if(e.target.closest('[data-x="ok"]')){h.close("ok");res(true);}
      if(e.target.closest('[data-x="cancel"]')){h.close("cancel");res(false);}
    });
  });
}
g.Modal={open,confirm,stack:()=>stack.slice(),closeAll:()=>stack.slice().forEach(s=>s.close("all"))};
// declarative triggers: <button data-modal-target="#id"> + <template id="id">
document.addEventListener("click",e=>{
  const t=e.target.closest("[data-modal-target]");
  if(!t)return;
  const sel=t.getAttribute("data-modal-target");
  const tpl=document.querySelector(sel);
  if(!tpl)return;
  open({title:t.dataset.modalTitle||tpl.dataset.title||"",desc:t.dataset.modalDesc||tpl.dataset.desc||"",
    body:tpl.innerHTML,size:t.dataset.modalSize||tpl.dataset.size||"md",
    footer:t.dataset.modalFooter!==undefined?undefined:(tpl.dataset.footer||"")});
});
})(window);
