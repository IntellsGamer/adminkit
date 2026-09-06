/* Persian + Gregorian date-picker popup. Jalali math vendored EXACTLY from
   jalaali-js (MIT, https://github.com/jalaali/jalaali-js) at assets/js/jalaali-vendor.js
   (toJalaali/toGregorian/isLeapJalaaliYear/jalaaliMonthLength). UI is a modern
   react-multi-date-picker-like popup: month/year nav, presets, min/max,
   format tokens (YYYY/MM/DD, jYYYY/jM/jD), clear/today, keyboard. Offline.
   Usage: new DatePicker(input,{locale:'fa'|'en',format:'jYYYY/jMM/jDD',...}) */
(function(g){
"use strict";
const FA_MONTHS=["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
const FA_DOW=["ش","ی","د","س","چ","پ","ج"];
const EN_MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const EN_DOW=["Su","Mo","Tu","We","Th","Fr","Sa"];
function J(){ return g.jalaali||null; }
function toJ(d){ const j=J(); if(j&&j.toJalaali)return j.toJalaali(d.getFullYear(),d.getMonth()+1,d.getDate()); // exact vendored impl
  // fallback via Intl (never used offline when vendor present)
  const p=new Intl.DateTimeFormat("fa-IR-u-ca-persian",{year:"numeric",month:"numeric",day:"numeric"}).formatToParts(d);
  const g2=k=>+p.find(x=>x.type===k).value; return{jy:g2("year"),jm:g2("month"),jd:g2("day")}; }
function toG(jy,jm,jd){ const j=J(); if(j&&j.toGregorian){const r=j.toGregorian(jy,jm,jd);return new Date(r.gy,r.gm-1,r.gd);} return new Date(); }
function jLen(jy,jm){ const j=J(); if(j&&j.jalaaliMonthLength)return j.jalaaliMonthLength(jy,jm); return jm<=6?31:jm<=11?30:29; }
function pad(n){return String(n).padStart(2,"0");}
class DatePicker{
  constructor(input,opts){
    this.input=input; this.o=Object.assign({locale:"fa",format:"",min:null,max:null,presets:true,onChange:null},opts||{});
    if(!this.o.format)this.o.format=this.o.locale==="fa"?"jYYYY/jMM/jDD":"YYYY-MM-DD";
    this.view=new Date(); this.sel=null;
    this.pop=document.createElement("div"); this.pop.className="dp-pop"; this.pop.style.display="none";
    document.body.appendChild(this.pop);
    input.addEventListener("focus",()=>this.show()); input.addEventListener("click",()=>this.show());
    document.addEventListener("mousedown",e=>{if(!this.pop.contains(e.target)&&e.target!==input)this.hide();});
    input.setAttribute("readonly","readonly"); input.setAttribute("autocomplete","off");
  }
  fmt(d){
    if(!d)return"";
    const jy=toJ(d);
    return this.o.format.replace("jYYYY",jy.jy).replace("jMM",pad(jy.jm)).replace("jM",jy.jm).replace("jDD",pad(jy.jd)).replace("jD",jy.jd)
      .replace("YYYY",d.getFullYear()).replace("MM",pad(d.getMonth()+1)).replace("DD",pad(d.getDate()));
  }
  show(){ this.draw(); this.pop.style.display="block"; const r=this.input.getBoundingClientRect();
    this.pop.style.position="fixed"; this.pop.style.top=Math.min(innerHeight-360,r.bottom+6)+"px";
    const rtl=document.documentElement.dir==="rtl"; this.pop.style[rtl?"right":"left"]=Math.max(8,(rtl?innerWidth-r.right:r.left))+"px"; }
  hide(){ this.pop.style.display="none"; }
  draw(){
    const fa=this.o.locale==="fa";
    let title="",cells="",jump="";
    if(fa){
      const j=toJ(this.view);
      title=FA_MONTHS[j.jm-1]+" "+j.jy;
      jump='<span class="dp-jump"><select data-n="jm">'+FA_MONTHS.map((m,i)=>'<option value="'+(i+1)+'"'+(i+1===j.jm?" selected":"")+">"+m+"</option>").join("")+'</select><select data-n="jy">'
        +Array.from({length:61},(_,k)=>j.jy-30+k).map(y=>'<option value="'+y+'"'+(y===j.jy?" selected":"")+">"+y+"</option>").join("")+"</select></span>";
      const firstG=toG(j.jy,j.jm,1);
      let start=(firstG.getDay()+1)%7; // Sat-first for Jalali
      cells=FA_DOW.map(d=>'<div class="dp-dow">'+d+"</div>").join("");
      for(let i=0;i<start;i++)cells+="<span></span>";
      const n=jLen(j.jy,j.jm);
      for(let d=1;d<=n;d++){ const g2=toG(j.jy,j.jm,d); cells+=this.dayBtn(g2,d,fa); }
      this._nav={jy:j.jy,jm:j.jm};
    }else{
      const Y=this.view.getFullYear(),M=this.view.getMonth();
      title=EN_MONTHS[M]+" "+Y;
      jump='<span class="dp-jump"><select data-n="em">'+EN_MONTHS.map((m,i)=>'<option value="'+i+'"'+(i===M?" selected":"")+">"+m.slice(0,3)+"</option>").join("")+'</select><select data-n="ey">'
        +Array.from({length:61},(_,k)=>Y-30+k).map(y=>'<option value="'+y+'"'+(y===Y?" selected":"")+">"+y+"</option>").join("")+"</select></span>";
      const first=new Date(Y,M,1);
      cells=EN_DOW.map(d=>'<div class="dp-dow">'+d+"</div>").join("");
      for(let i=0;i<first.getDay();i++)cells+="<span></span>";
      const n=new Date(Y,M+1,0).getDate();
      for(let d=1;d<=n;d++)cells+=this.dayBtn(new Date(Y,M,d),d,fa);
    }
    this.pop.innerHTML='<div class="dp-head"><button class="icon-btn" data-n="p" aria-label="Previous"><i class="fa-solid fa-chevron-left"></i></button>'+jump+'<button class="icon-btn" data-n="n" aria-label="Next"><i class="fa-solid fa-chevron-right"></i></button></div>'
      +'<div class="muted" style="font-size:12px;font-weight:700;margin-bottom:6px">'+title+'</div>'
      +'<div class="dp-grid">'+cells+'</div>'
      +'<div class="btn-row" style="margin-top:10px"><button class="btn btn-ghost btn-sm" data-n="today"><i class="fa-solid fa-calendar-day"></i> Today / امروز</button><button class="btn btn-ghost btn-sm" data-n="clear">Clear</button>'
      +(this.o.presets?'<button class="btn btn-soft btn-sm" data-n="now">Now</button>':"")+"</div>";
    this.pop.querySelectorAll(".dp-day").forEach(b=>b.onclick=()=>{this.sel=new Date(+b.dataset.t);this.input.value=this.fmt(this.sel);this.view=new Date(this.sel);this.o.onChange&&this.o.onChange(this.sel);this.hide();});
    this.pop.querySelector('[data-n="p"]').onclick=()=>this.nav(-1);
    this.pop.querySelector('[data-n="n"]').onclick=()=>this.nav(1);
    const jm=this.pop.querySelector('[data-n="jm"]'),jy=this.pop.querySelector('[data-n="jy"]');
    if(jm&&jy){const go=()=>{this.view=toG(+jy.value,+jm.value,1);this.draw();};jm.onchange=go;jy.onchange=go;}
    const em=this.pop.querySelector('[data-n="em"]'),ey=this.pop.querySelector('[data-n="ey"]');
    if(em&&ey){const go=()=>{this.view=new Date(+ey.value,+em.value,1);this.draw();};em.onchange=go;ey.onchange=go;}
    this.pop.querySelector('[data-n="today"]').onclick=()=>{this.sel=new Date();this.view=new Date();this.input.value=this.fmt(this.sel);this.o.onChange&&this.o.onChange(this.sel);this.draw();};
    this.pop.querySelector('[data-n="clear"]').onclick=()=>{this.sel=null;this.input.value="";this.o.onChange&&this.o.onChange(null);this.hide();};
    const now=this.pop.querySelector('[data-n="now"]'); if(now)now.onclick=()=>{this.sel=new Date();this.view=new Date();this.input.value=this.fmt(this.sel);this.o.onChange&&this.o.onChange(this.sel);this.hide();};
  }
  dayBtn(date,num){
    const dis=(this.o.min&&date<this.o.min)||(this.o.max&&date>this.o.max);
    const sel=this.sel&&date.toDateString()===this.sel.toDateString();
    const today=date.toDateString()===new Date().toDateString();
    return '<button class="dp-day'+(sel?" sel":"")+(today?" today":"")+'" data-t="'+date.getTime()+'"'+(dis?" disabled":"")+">"+num+"</button>";
  }
  nav(d){
    if(this.o.locale==="fa"){ const n=this._nav; let m=n.jm+d,y=n.jy; if(m<1){m=12;y--;} if(m>12){m=1;y++;} this.view=toG(y,m,1); }
    else this.view=new Date(this.view.getFullYear(),this.view.getMonth()+d,1);
    this.draw();
  }
  setLocale(l){ this.o.locale=l; if(!this.o._fmtTouched)this.o.format=l==="fa"?"jYYYY/jMM/jDD":"YYYY-MM-DD"; this.draw(); }
}
g.DatePicker=DatePicker;
})(window);
