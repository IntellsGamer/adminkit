/* Idle manager: configurable minutes (0=off). No interaction -> warning card with
   live progress bar + Stay/Leave buttons (reruns interval on stay). If countdown
   passes -> lock screen (PIN, default 1234, change via Idle.setPin). All offline. */
(function(g){
"use strict";
let timer=null,warnTimer=null,last=Date.now(),pin="1234",warnSecs=60;
function mins(){ try{return+(ThemeStore.get().idleMinutes||0);}catch(e){return 15;} }
function reset(){ last=Date.now(); }
["pointerdown","keydown","wheel","touchstart","mousemove"].forEach(ev=>document.addEventListener(ev,()=>{last=Date.now();},{passive:true}));
function tick(){
  clearTimeout(timer);
  const m=mins();
  if(!m||m<=0)return; // off
  const wait=m*60*1000;
  const warnMs=Math.min(warnSecs*1000,wait/2); // short intervals: warn window never eats the whole wait
  timer=setTimeout(showWarn,Math.max(1000,wait-warnMs));
}
function effWarnSecs(){ const m=mins()||15; return Math.min(warnSecs,Math.max(5,(m*60)/2)); }
function showWarn(){
  const m=mins(); if(!m)return;
  const ws=effWarnSecs();
  if(Date.now()-last<(m*60-ws)*1000){tick();return;}
  const w=document.getElementById("idleWrap"), bar=document.getElementById("idleBar"), txt=document.getElementById("idleTxt");
  if(!w)return;
  w.classList.add("show");
  const t0=Date.now();
  clearInterval(warnTimer);
  warnTimer=setInterval(()=>{
    const el=(Date.now()-t0)/1000, left=Math.max(0,ws-el);
    if(bar)bar.style.width=(100*(1-left/ws))+"%";
    if(txt)txt.textContent=Math.ceil(left)+"s";
    if(left<=0){clearInterval(warnTimer);w.classList.remove("show");showLock();}
  },200);
  const stay=document.getElementById("idleStay"), leave=document.getElementById("idleLeave");
  if(stay)stay.onclick=()=>{clearInterval(warnTimer);w.classList.remove("show");last=Date.now();tick();toast&&toast.success("Welcome back");};
  if(leave)leave.onclick=()=>{clearInterval(warnTimer);w.classList.remove("show");showLock();};
}
function showLock(){
  const l=document.getElementById("lockWrap"); if(!l)return;
  l.classList.add("show");
  const inp=document.getElementById("lockPin"), btn=document.getElementById("lockBtn");
  if(inp){inp.value="";setTimeout(()=>inp.focus(),80);}
  const go=()=>{ if(!inp||inp.value===pin){l.classList.remove("show");last=Date.now();tick();toast&&toast.success("Unlocked");} else {toast&&toast.error("Wrong PIN");} };
  if(btn)btn.onclick=go;
  if(inp)inp.onkeydown=e=>{if(e.key==="Enter")go();};
}
g.Idle={tick,reset,setPin:p=>pin=p,setWarnSecs:s=>warnSecs=s};
document.addEventListener("DOMContentLoaded",()=>{reset();tick();document.addEventListener("visibilitychange",()=>{if(!document.hidden)tick();});});
setInterval(tick,30000);
})(window);
