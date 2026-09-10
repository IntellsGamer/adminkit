/* Tickets — tiny offline ticket store (localStorage). No deps.
   API:
     Tickets.seed()                 // ensure demo data (idempotent)
     Tickets.all()                  // [{id,title,desc,status,prio,date,replies:[{who,text,at}]}]
     Tickets.get(id)
     Tickets.create({title,desc,prio})
     Tickets.reply(id,text)
     Tickets.setStatus(id,status)   // open | pending | closed
   Statuses: open (blue), pending (amber), closed (green).
*/
(function(g){
"use strict";
const KEY="adminkit.tickets.v1";
function load(){ try{ const v=JSON.parse(localStorage.getItem(KEY)||"null"); return Array.isArray(v)?v:null; }catch(e){ return null; } }
function save(a){ try{ localStorage.setItem(KEY,JSON.stringify(a)); }catch(e){} }
function seed(){
  let a=load();
  if(a&&a.length)return a;
  const now=Date.now();
  a=[
    {id:"t-1042",title:"Invoice export shows wrong totals",desc:"CSV export from the reports table sums the visible page only. Expected: all filtered rows.",status:"open",prio:"High",date:new Date(now-86400000*1).toISOString(),replies:[{who:"Support",text:"Thanks — we reproduced it. Fix is queued for the next patch.",at:new Date(now-86400000*0.5).toISOString()}]},
    {id:"t-1041",title:"RTL glitch in datepicker popup",desc:"When dir=rtl the second month overlaps the first on small screens.",status:"pending",prio:"Medium",date:new Date(now-86400000*2).toISOString(),replies:[]},
    {id:"t-1040",title:"Add dark-mode logo variant",desc:"Brand mark is hard to read in graphite dark. Requesting a lighter gradient.",status:"closed",prio:"Low",date:new Date(now-86400000*5).toISOString(),replies:[{who:"Support",text:"Shipped — the mark now inverts with the theme.",at:new Date(now-86400000*4).toISOString()}]},
    {id:"t-1039",title:"Auto-lock timer ignores 0 (off)",desc:"Setting idle minutes to 0 still shows the warning card after 15 minutes.",status:"closed",prio:"High",date:new Date(now-86400000*9).toISOString(),replies:[{who:"Support",text:"Fixed — 0 now fully disables the guard.",at:new Date(now-86400000*8).toISOString()}]}
  ];
  save(a); return a;
}
function all(){ return seed().slice(); }
function get(id){ return seed().find(t=>t.id===id)||null; }
function create(o){
  o=o||{}; const a=seed();
  const n=1043+Math.floor(Math.random()*400);
  const t={id:"t-"+n,title:o.title||"Untitled",desc:o.desc||"",status:"open",prio:o.prio||"Medium",date:new Date().toISOString(),replies:[]};
  a.unshift(t); save(a);
  try{ if(window.toast)toast.success("Ticket created",{description:t.id}); }catch(e){}
  return t;
}
function reply(id,text){
  const a=seed(); const t=a.find(x=>x.id===id); if(!t)return null;
  t.replies.push({who:"You",text:String(text||""),at:new Date().toISOString()});
  if(t.status==="closed")t.status="open";
  save(a); return t;
}
function setStatus(id,status){
  const a=seed(); const t=a.find(x=>x.id===id); if(!t)return null;
  t.status=status; save(a); return t;
}
g.Tickets={seed,all,get,create,reply,setStatus,KEY};
})(window);
