/* Shop — tiny offline cart store (localStorage). No deps.
   Products are static data in products.html; cart persists across pages.
   API:
     Shop.PRODUCTS            // [{id,name,price,cat,icon,grad}]
     Shop.add(id,qty)         // add to cart + toast
     Shop.remove(id)          // remove line
     Shop.setQty(id,qty)      // set quantity (0 removes)
     Shop.clear()
     Shop.lines()             // [{...product,qty,total}]
     Shop.count()             // total items
     Shop.subtotal()
     Shop.cart()              // {id:qty} raw
*/
(function(g){
"use strict";
const KEY="adminkit.cart.v1";
const PRODUCTS=[
  {id:"p1",name:"Aurora Headphones",price:189,cat:"Audio",icon:"fa-headphones",grad:"linear-gradient(135deg,#f59e0b,#ea580c)"},
  {id:"p2",name:"Nimbus Keyboard",price:129,cat:"Workspace",icon:"fa-keyboard",grad:"linear-gradient(135deg,#38bdf8,#0369a1)"},
  {id:"p3",name:"Pulse Watch",price:249,cat:"Wearables",icon:"fa-clock",grad:"linear-gradient(135deg,#34d399,#059669)"},
  {id:"p4",name:"Orbit Mouse",price:79,cat:"Workspace",icon:"fa-computer-mouse",grad:"linear-gradient(135deg,#8b5cf6,#4c1d95)"},
  {id:"p5",name:"Halo Speaker",price:149,cat:"Audio",icon:"fa-volume-high",grad:"linear-gradient(135deg,#fb7185,#be123c)"},
  {id:"p6",name:"Vertex Monitor",price:399,cat:"Workspace",icon:"fa-desktop",grad:"linear-gradient(135deg,#0ea5e9,#1e3a8a)"},
  {id:"p7",name:"Drift Backpack",price:99,cat:"Travel",icon:"fa-briefcase",grad:"linear-gradient(135deg,#f97316,#7f1d1d)"},
  {id:"p8",name:"Lumen Lamp",price:59,cat:"Home",icon:"fa-lightbulb",grad:"linear-gradient(135deg,#ec4899,#581c87)"},
  {id:"p9",name:"Flux Charger",price:45,cat:"Power",icon:"fa-bolt",grad:"linear-gradient(135deg,#7c3aed,#312e81)"}
];
function load(){ try{ return JSON.parse(localStorage.getItem(KEY)||"{}"); }catch(e){ return {}; } }
function save(c){ try{ localStorage.setItem(KEY,JSON.stringify(c)); }catch(e){} try{ document.dispatchEvent(new CustomEvent("shop:change",{detail:{cart:c}})); }catch(e){} }
function byId(id){ return PRODUCTS.find(p=>p.id===id); }
function add(id,qty){
  qty=qty||1; const c=load(); c[id]=(c[id]||0)+qty; save(c);
  try{ const p=byId(id); if(window.toast&&p)toast.success("Added to cart",{description:p.name+" × "+c[id]}); }catch(e){}
  updateBadges(); return c;
}
function remove(id){ const c=load(); delete c[id]; save(c); updateBadges(); return c; }
function setQty(id,qty){ const c=load(); qty=+qty||0; if(qty<=0)delete c[id]; else c[id]=qty; save(c); updateBadges(); return c; }
function clear(){ save({}); updateBadges(); }
function lines(){ const c=load(); return Object.keys(c).map(id=>{ const p=byId(id); if(!p)return null; return Object.assign({},p,{qty:c[id],total:p.price*c[id]}); }).filter(Boolean); }
function count(){ const c=load(); return Object.keys(c).reduce((a,k)=>a+(+c[k]||0),0); }
function subtotal(){ return lines().reduce((a,l)=>a+l.total,0); }
function cart(){ return load(); }
function updateBadges(){
  try{
    const n=count();
    document.querySelectorAll("[data-cart-count]").forEach(el=>{
      el.textContent=String(n);
      el.style.display=n?"grid":"none";
    });
  }catch(e){}
}
document.addEventListener("DOMContentLoaded",updateBadges);
document.addEventListener("turbo:load",updateBadges);
g.Shop={PRODUCTS,add,remove,setQty,clear,lines,count,subtotal,cart,updateBadges,KEY};
})(window);
