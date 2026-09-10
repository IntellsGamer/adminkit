/* Carousel — 5 types, mouse + touch drag. Offline, no deps.
   Types (data-car="slide|fade|auto|thumbs|marquee"):
     slide  — arrows + dots, drag to move
     fade   — crossfade, arrows + dots, drag to move
     auto   — slide + autoplay (data-interval ms) + progress bar, pauses on hover
     thumbs — slide + thumbnail strip
     marquee— infinite auto-scroll strip (pauses on hover), no controls
   Markup:
     <div class="car" data-car="slide">
       <div class="car-track">
         <div class="car-slide">…</div> x N
       </div>
     </div>
   JS: Carousel.init(root?) builds nav/dots/thumbs/bars. Re-runnable (Turbo-safe).
       new Carousel(el) for one instance; el._car.destroy() to unbind.
   Drag: pointerdown/move/up with 40px threshold; RTL aware. */
(function(g){
"use strict";
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
class Carousel{
  constructor(el){
    this.el=el; this.type=el.dataset.car||"slide";
    this.track=el.querySelector(":scope > .car-track");
    if(!this.track)return;
    this.slides=[...this.track.children];
    this.i=0; this.timer=null;
    if(el._car)try{el._car.destroy();}catch(e){}
    el._car=this;
    this.build();
    this.bindDrag();
    this.go(0,true);
    if(this.type==="auto")this.auto();
  }
  n(){ return this.slides.length; }
  build(){
    const el=this.el;
    // remove previous generated UI (re-init safe)
    el.querySelectorAll(":scope > .car-nav, :scope > .car-dots, :scope > .car-thumbs, :scope > .car-bar").forEach(x=>x.remove());
    el.classList.toggle("car-fade",this.type==="fade");
    el.classList.toggle("car-auto",this.type==="auto");
    el.classList.toggle("car-marq",this.type==="marquee");
    if(this.type==="marquee"){
      // duplicate slides once for a seamless -50% loop
      if(!this.track.dataset.dup){
        this.track.innerHTML+=this.track.innerHTML;
        this.track.dataset.dup="1";
        this.slides=[...this.track.children];
      }
      return;
    }
    if(this.type==="fade"){
      this.slides.forEach(s=>s.classList.add("car-slide"));
    }
    // arrows
    const nav=document.createElement("div"); nav.className="car-nav";
    nav.innerHTML='<button type="button" data-c="p" aria-label="Previous"><i class="fa-solid fa-chevron-left"></i></button><button type="button" data-c="n" aria-label="Next"><i class="fa-solid fa-chevron-right"></i></button>';
    el.appendChild(nav);
    nav.querySelector('[data-c="p"]').onclick=()=>this.go(this.i-1);
    nav.querySelector('[data-c="n"]').onclick=()=>this.go(this.i+1);
    // dots
    const dots=document.createElement("div"); dots.className="car-dots";
    dots.innerHTML=this.slides.map((_,k)=>'<button type="button" data-d="'+k+'" aria-label="Go to slide '+(k+1)+'"></button>').join("");
    el.appendChild(dots);
    dots.querySelectorAll("button").forEach(b=>b.onclick=()=>this.go(+b.dataset.d));
    this.dots=[...dots.querySelectorAll("button")];
    if(this.type==="auto"){
      const bar=document.createElement("div"); bar.className="car-bar"; bar.innerHTML="<i></i>";
      el.appendChild(bar); this.bar=bar.firstChild;
      el.addEventListener("mouseenter",()=>this.stop());
      el.addEventListener("mouseleave",()=>this.auto());
    }
    if(this.type==="thumbs"){
      const th=document.createElement("div"); th.className="car-thumbs";
      th.innerHTML=this.slides.map((s,k)=>{
        const bg=(s.querySelector(".car-art")||{}).outerHTML||"";
        return '<button type="button" data-t="'+k+'" aria-label="Thumbnail '+(k+1)+'">'+(s.dataset.thumb||(""+(k+1)))+"</button>";
      }).join("");
      // paint thumb buttons with slide art colors when available
      [...th.querySelectorAll("button")].forEach((b,k)=>{
        try{
          const art=this.slides[k].querySelector(".car-art");
          if(art)b.style.background=getComputedStyle(art).background||art.style.background;
        }catch(e){}
      });
      el.appendChild(th);
      th.querySelectorAll("button").forEach(b=>b.onclick=()=>this.go(+b.dataset.t));
      this.thumbs=[...th.querySelectorAll("button")];
    }
  }
  go(k,silent){
    const n=this.slides.length; if(!n)return;
    this.i=((k%n)+n)%n;
    const rtl=document.documentElement.dir==="rtl";
    if(this.type==="fade"){
      this.slides.forEach((s,idx)=>s.classList.toggle("on",idx===this.i));
    }else if(this.type!=="marquee"){
      const x=-(this.i*100)*(rtl?-1:1);
      // RTL: flex row reverses visually; translate sign flips to keep order.
      this.track.style.transform="translateX("+x+"%)";
    }
    if(this.dots)this.dots.forEach((d,idx)=>d.classList.toggle("on",idx===this.i));
    if(this.thumbs)this.thumbs.forEach((t,idx)=>t.classList.toggle("on",idx===this.i));
    if(this.type==="auto"&&this.bar&&!silent){ this.bar.style.transition="none"; this.bar.style.width="0"; requestAnimationFrame(()=>{ this.bar.style.transition="width "+(this.interval() /1000)+"s linear"; this.bar.style.width="100%"; }); }
  }
  interval(){ return +(this.el.dataset.interval||3500); }
  auto(){
    this.stop();
    const ms=this.interval();
    this.timer=setInterval(()=>this.go(this.i+1),ms);
    if(this.bar){ this.bar.style.transition="width "+(ms/1000)+"s linear"; requestAnimationFrame(()=>{this.bar.style.width="100%";}); }
  }
  stop(){ if(this.timer){clearInterval(this.timer); this.timer=null;} if(this.bar){this.bar.style.transition="none"; this.bar.style.width="0";} }
  bindDrag(){
    if(this.type==="marquee")return;
    const track=this.track; let sx=null,dx=0;
    const down=e=>{ sx=(e.touches?e.touches[0].clientX:e.clientX); dx=0; };
    const move=e=>{ if(sx===null)return; const x=(e.touches?e.touches[0].clientX:e.clientX); dx=x-sx; };
    const up=()=>{
      if(sx===null)return;
      const rtl=document.documentElement.dir==="rtl";
      if(Math.abs(dx)>40){ this.go(this.i+((dx<0)!==!!rtl?1:-1)); }
      sx=null; dx=0;
    };
    // pointer events cover mouse; touch events cover mobile Safari
    track.addEventListener("pointerdown",down);
    window.addEventListener("pointermove",move);
    window.addEventListener("pointerup",up);
    track.addEventListener("touchstart",down,{passive:true});
    track.addEventListener("touchmove",move,{passive:true});
    track.addEventListener("touchend",up);
    this._dragOff=()=>{ try{track.removeEventListener("pointerdown",down);}catch(e){} };
  }
  destroy(){ try{this.stop();}catch(e){} try{this._dragOff&&this._dragOff();}catch(e){} }
  static init(root){
    (root||document).querySelectorAll(".car[data-car]").forEach(el=>{
      try{ if(el._car&&el._car.el===el&&el.isConnected)return; new Carousel(el); }catch(e){}
    });
  }
}
function boot(){ try{Carousel.init(document);}catch(e){} }
document.addEventListener("DOMContentLoaded",boot);
document.addEventListener("turbo:load",boot);
g.Carousel=Carousel;
})(window);
