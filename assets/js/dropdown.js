/* Beautiful <select> replacement (react-select-like, offline). Search-on-type, keyboard, clearable.
   Usage: new NiceSelect(el,{options:[{value,label}],value,search:true,onChange}) — el is <select> or <div>. */
(function(g){
"use strict";
class NiceSelect{
  constructor(el,opts){
    this.o=Object.assign({options:[],value:"",search:true,placeholder:"Select…",searchPh:"Type to search…",noResults:"No results",onChange:null},opts||{});
    if(el.tagName==="SELECT"){ this.o.options=[...el.options].map(o=>({value:o.value,label:o.textContent})); this.o.value=el.value; this.src=el; el.style.display="none"; this.root=document.createElement("div"); el.after(this.root); el._nice=this; }
    else { this.root=el; el._nice=this; }
    this.root.classList.add("dd"); this.hl=0; this.build();
  }
  label(v){ const f=this.o.options.find(o=>String(o.value)===String(v)); return f?f.label:this.o.placeholder; }
  items(){ const q=(this.q&&this.q.value||"").toLowerCase(); return this.o.options.filter(o=>!q||o.label.toLowerCase().includes(q)); }
  // index of the current value within the (possibly filtered) list, so the
  // keyboard highlight starts on the ticked row instead of always row 0.
  selIndex(){ try{ const items=this.items(); const i=items.findIndex(o=>String(o.value)===String(this.o.value)); return i>=0?i:0; }catch(e){ return 0; } }
  build(){
    this.root.innerHTML='<button type="button" class="dd-btn" aria-haspopup="listbox" aria-expanded="false"><span data-s="label">'+this.label(this.o.value)+'</span><i class="fa-solid fa-chevron-down chev"></i></button><div class="dd-panel"><div class="dd-search" data-s="swrap"><input type="search" data-s="q" role="searchbox" placeholder="'+this.o.searchPh.replace(/"/g,"&quot;")+'"></div><div class="dd-list" data-s="list" role="listbox"></div></div>';
    this.btn=this.root.querySelector(".dd-btn"); this.panel=this.root.querySelector(".dd-panel");
    this.q=this.root.querySelector('[data-s="q"]'); this.list=this.root.querySelector('[data-s="list"]');
    if(!this.o.search)this.root.querySelector('[data-s="swrap"]').style.display="none";
    this.btn.onclick=e=>{e.stopPropagation();this.toggle();};
    this.q.addEventListener("input",()=>{this.hl=0;this.draw();});
    this.q.addEventListener("keydown",e=>{
      const items=this.items();
      if(e.key==="ArrowDown"){e.preventDefault();this.hl=Math.min(items.length-1,this.hl+1);this.draw();}
      if(e.key==="ArrowUp"){e.preventDefault();this.hl=Math.max(0,this.hl-1);this.draw();}
      if(e.key==="Enter"){e.preventDefault();if(items[this.hl])this.pick(items[this.hl].value);}
      if(e.key==="Escape")this.close();
    });
    // self-cleaning outside closer: detached roots (e.g. after a Turbo visit)
    // unsubscribe themselves instead of piling up document listeners.
    const closeIfOutside=(e)=>{ if(!this.root.isConnected){document.removeEventListener("click",closeIfOutside);return;} if(!this.root.contains(e.target))this.close(); };
    document.addEventListener("click",closeIfOutside);
    this.hl=this.selIndex(); this.draw();
  }
  items(){ const q=(this.q.value||"").toLowerCase(); return this.o.options.filter(o=>!q||o.label.toLowerCase().includes(q)); }
  draw(){
    const items=this.items();
    if(this.hl>=items.length)this.hl=Math.max(0,items.length-1);
    if(this.hl<0)this.hl=0;
    this.list.innerHTML=items.map((o,i)=>'<button type="button" role="option" aria-selected="'+(String(o.value)===String(this.o.value))+'" class="dd-opt'+(String(o.value)===String(this.o.value)?" sel":"")+(i===this.hl?" hl":"")+'" data-v="'+String(o.value).replace(/"/g,"&quot;")+'"><span>'+o.label+'</span><i class="fa-solid fa-check tick"></i></button>').join("")||'<div class="muted" style="padding:10px">'+this.o.noResults+"</div>";
    // hover follows the highlight (class swap only — no redraw, so the list
    // never jumps): exactly one orange row, no duplicate with the ticked one.
    this.list.querySelectorAll(".dd-opt").forEach((b,i)=>{
      b.onclick=()=>this.pick(b.dataset.v);
      b.onmouseenter=()=>{ this.hl=i; try{ this.list.querySelectorAll(".dd-opt.hl").forEach(x=>{ if(x!==b)x.classList.remove("hl"); }); }catch(e){} b.classList.add("hl"); };
    });
    this.root.querySelector('[data-s="label"]').textContent=this.label(this.o.value);
    const hlEl=this.list.querySelector(".dd-opt.hl"); if(hlEl&&hlEl.scrollIntoView)hlEl.scrollIntoView({block:"nearest"});
  }
  toggle(){ this.root.classList.contains("open")?this.close():this.open(); }
  open(){ this.root.classList.add("open"); this.btn.setAttribute("aria-expanded","true"); this.q.value=""; this.hl=this.selIndex(); this.draw(); setTimeout(()=>{ try{ this.q.focus(); }catch(e){} },30); }
  close(){ this.root.classList.remove("open"); this.btn.setAttribute("aria-expanded","false"); }
  pick(v){ this.o.value=v; if(this.src){ this.src.value=v; try{ this.src.dispatchEvent(new Event("change",{bubbles:true})); }catch(e){} } this.close(); this.draw(); this.o.onChange&&this.o.onChange(v); }
  // Re-read options + value from the wrapped native <select> (silent: no
  // onChange, no change event). Used after ThemeStore syncs values or I18N
  // re-translates <option> labels, so the custom UI never goes stale.
  syncFromSrc(){ if(this.src){ try{ this.o.options=[...this.src.options].map(o=>({value:o.value,label:o.textContent})); this.o.value=this.src.value; }catch(e){} } this.hl=this.selIndex(); this.draw(); return this; }
  setOptions(opts){ this.o.options=opts; this.draw(); }
  destroy(){ if(this.src){ try{ delete this.src._nice; }catch(e){ this.src._nice=null; } this.src.style.display=""; this.root.remove(); } else { try{ delete this.root._nice; }catch(e){} this.root.innerHTML=""; this.root.classList.remove("dd","open"); } }
}
g.NiceSelect=NiceSelect;
})(window);
