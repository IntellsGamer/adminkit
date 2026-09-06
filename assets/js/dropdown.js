/* Beautiful <select> replacement (react-select-like, offline). Search-on-type, keyboard, clearable.
   Usage: new NiceSelect(el,{options:[{value,label}],value,search:true,onChange}) — el is <select> or <div>. */
(function(g){
"use strict";
class NiceSelect{
  constructor(el,opts){
    this.o=Object.assign({options:[],value:"",search:true,placeholder:"Select…",onChange:null},opts||{});
    if(el.tagName==="SELECT"){ this.o.options=[...el.options].map(o=>({value:o.value,label:o.textContent})); this.o.value=el.value; this.src=el; el.style.display="none"; this.root=document.createElement("div"); el.after(this.root); }
    else this.root=el;
    this.root.classList.add("dd"); this.hl=0; this.build();
  }
  label(v){ const f=this.o.options.find(o=>String(o.value)===String(v)); return f?f.label:this.o.placeholder; }
  build(){
    this.root.innerHTML='<button type="button" class="dd-btn"><span data-s="label">'+this.label(this.o.value)+'</span><i class="fa-solid fa-chevron-down chev"></i></button><div class="dd-panel"><div class="dd-search" data-s="swrap"><input type="search" data-s="q" placeholder="Type to search…"></div><div class="dd-list" data-s="list"></div></div>';
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
    document.addEventListener("click",e=>{if(!this.root.contains(e.target))this.close();});
    this.draw();
  }
  items(){ const q=(this.q.value||"").toLowerCase(); return this.o.options.filter(o=>!q||o.label.toLowerCase().includes(q)); }
  draw(){
    const items=this.items();
    this.list.innerHTML=items.map((o,i)=>'<button type="button" class="dd-opt'+(String(o.value)===String(this.o.value)?" sel":"")+(i===this.hl?" hl":"")+'" data-v="'+String(o.value).replace(/"/g,"&quot;")+'"><span>'+o.label+'</span><i class="fa-solid fa-check tick"></i></button>').join("")||'<div class="muted" style="padding:10px">No results</div>';
    this.list.querySelectorAll(".dd-opt").forEach(b=>b.onclick=()=>this.pick(b.dataset.v));
    this.root.querySelector('[data-s="label"]').textContent=this.label(this.o.value);
  }
  toggle(){ this.root.classList.contains("open")?this.close():this.open(); }
  open(){ this.root.classList.add("open"); this.q.value=""; this.hl=0; this.draw(); setTimeout(()=>this.q.focus(),30); }
  close(){ this.root.classList.remove("open"); }
  pick(v){ this.o.value=v; if(this.src)this.src.value=v; this.close(); this.draw(); this.o.onChange&&this.o.onChange(v); }
  setOptions(opts){ this.o.options=opts; this.draw(); }
}
g.NiceSelect=NiceSelect;
})(window);
