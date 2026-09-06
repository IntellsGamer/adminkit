/* Lightweight DataTables-like grid. Offline, no deps. Configurable/hideable modules.
   Features: search, sort, paging, page-size, "showing .. from ..", CSV/Excel/copy/clipboard export,
   column visibility popover. VB.NET-migration friendly: plain <table> + JSON rows.
   Render split: toolbar builds once (no focus loss while typing, popover never
   rebuilds on toggle), only the table body repaints on state changes.
   Usage: new DataGrid(el,{columns:[{key,title}],rows:[...],exports:true,...}) */
(function(g){
"use strict";
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function toCSV(cols,rows){ const q=v=>'"'+String(v??"").replace(/"/g,'""')+'"';
  return [cols.map(c=>q(c.title)).join(","),...rows.map(r=>cols.map(c=>q(r[c.key])).join(","))].join("\n"); }
function download(name,content,type){ const b=new Blob([content],{type:type||"text/plain"}); const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),2000); }
function toExcelHTML(cols,rows){ let h='<table><thead><tr>'+cols.map(c=>"<th>"+esc(c.title)+"</th>").join("")+"</tr></thead><tbody>";
  rows.forEach(r=>{h+="<tr>"+cols.map(c=>"<td>"+esc(r[c.key])+"</td>").join("")+"</tr>";}); return '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body>'+h+"</tbody></table></body></html>"; }
class DataGrid{
  constructor(el,opts){
    this.el=el; this.o=Object.assign({columns:[],rows:[],pageSize:8,search:true,paging:true,exports:true,colToggle:true,info:true},opts||{});
    this.o.strings=Object.assign({search:"Search…",columns:"Columns",showing:"Showing",from:"from",page:"Page",perPage:"/ page",noRows:"No rows"},(opts&&opts.strings)||{});
    this.q=""; this.sortKey=""; this.sortDir=1; this.page=1; this.hidden=new Set(); this.colsOpen=false;
    this._docClick=(e)=>{ if(this.colsOpen&&this.el.isConnected&&!this.el.contains(e.target)){ this.colsOpen=false; const p=this.el.querySelector('[data-g="colpanel"]'); if(p)p.hidden=true; } };
    this._docKey=(e)=>{ if(e.key==="Escape"&&this.colsOpen){ this.colsOpen=false; const p=this.el.querySelector('[data-g="colpanel"]'); if(p)p.hidden=true; } };
    document.addEventListener("click",this._docClick);
    document.addEventListener("keydown",this._docKey);
    this.el.innerHTML='<div class="tbl-tools"></div><div class="tbl-grid"></div>';
    this.renderTools();
    this.renderBody();
  }
  destroy(){ document.removeEventListener("click",this._docClick); document.removeEventListener("keydown",this._docKey); }
  visibleCols(){return this.o.columns.filter(c=>!this.hidden.has(c.key));}
  filtered(){
    let r=this.o.rows.slice();
    if(this.q){const q=this.q.toLowerCase(); r=r.filter(row=>this.o.columns.some(c=>String(row[c.key]??"").toLowerCase().includes(q)));}
    if(this.sortKey){const k=this.sortKey,d=this.sortDir; r.sort((a,b)=>{const x=a[k],y=b[k];return(typeof x==="number"&&typeof y==="number"?x-y:String(x??"").localeCompare(String(y??"")))*d;});}
    return r;
  }
  colCountLabel(){ return this.visibleCols().length+"/"+this.o.columns.length; }
  renderTools(){
    const box=this.el.querySelector(".tbl-tools");
    let h="";
    if(this.o.search)h+='<input type="search" data-g="q" placeholder="'+esc(this.o.strings.search)+'" value="'+esc(this.q)+'">';
    if(this.o.exports)h+='<button type="button" class="btn btn-ghost btn-sm" data-g="csv"><i class="fa-solid fa-file-csv"></i>CSV</button><button type="button" class="btn btn-ghost btn-sm" data-g="xls"><i class="fa-solid fa-file-excel"></i>Excel</button><button type="button" class="btn btn-ghost btn-sm" data-g="copy"><i class="fa-solid fa-copy"></i>Copy</button>';
    if(this.o.colToggle){
      h+='<span class="colvis"><button type="button" class="btn btn-ghost btn-sm" data-g="cols"><i class="fa-solid fa-table-columns"></i>'+esc(this.o.strings.columns)+' (<span data-g="colcount">'+this.colCountLabel()+'</span>)<i class="fa-solid fa-chevron-down" style="font-size:10px"></i></button>'
        +'<span class="colvis-panel" data-g="colpanel"'+(this.colsOpen?'':' hidden')+'>'
        +this.o.columns.map(c=>'<label class="colvis-row"><span>'+esc(c.title)+'</span><span class="switch switch-sm"><input type="checkbox" data-g="col" value="'+esc(c.key)+'"'+(this.hidden.has(c.key)?'':' checked')+'><i></i></span></label>').join('')+'</span></span>';
    }
    box.innerHTML=h;
    const q=box.querySelector('[data-g="q"]');
    if(q)q.addEventListener("input",()=>{this.q=q.value;this.page=1;this.renderBody();});
    const current=()=>({cols:this.visibleCols(),rows:this.filtered()});
    const csv=box.querySelector('[data-g="csv"]'); if(csv)csv.onclick=()=>{const s=current();download("export.csv","\ufeff"+toCSV(s.cols,s.rows),"text/csv;charset=utf-8");};
    const xls=box.querySelector('[data-g="xls"]'); if(xls)xls.onclick=()=>{const s=current();download("export.xls",toExcelHTML(s.cols,s.rows),"application/vnd.ms-excel");};
    const cp=box.querySelector('[data-g="copy"]'); if(cp)cp.onclick=async()=>{const s=current();try{await navigator.clipboard.writeText(toCSV(s.cols,s.rows));toast.success("Copied to clipboard");}catch(e){toast.error("Copy failed");}};
    const colsBtn=box.querySelector('[data-g="cols"]');
    if(colsBtn)colsBtn.onclick=(e)=>{e.stopPropagation();this.colsOpen=!this.colsOpen;const p=box.querySelector('[data-g="colpanel"]');if(p)p.hidden=!this.colsOpen;};
    // toggling a column repaints ONLY the table body + count label.
    // The popover DOM is untouched: no flicker, stays open, switch animates.
    box.querySelectorAll('[data-g="col"]').forEach(cb=>cb.onchange=()=>{
      cb.checked?this.hidden.delete(cb.value):this.hidden.add(cb.value);
      const cc=box.querySelector('[data-g="colcount"]'); if(cc)cc.textContent=this.colCountLabel();
      this.renderBody();
    });
  }
  renderBody(){
    const box=this.el.querySelector(".tbl-grid");
    const cols=this.visibleCols(), rows=this.filtered();
    const total=rows.length, ps=this.o.pageSize, pages=Math.max(1,Math.ceil(total/ps));
    if(this.page>pages)this.page=pages;
    const start=(this.page-1)*ps, slice=rows.slice(start,start+ps);
    let h='<div class="tbl-wrap"><table class="data"><thead><tr>'+cols.map(c=>'<th data-k="'+esc(c.key)+'"'+(this.sortKey===c.key?' aria-sort="'+(this.sortDir>0?"ascending":"descending")+'"':"")+'>'+'<button type="button" class="thbtn" data-g="sort" data-k="'+esc(c.key)+'">'+esc(c.title)+(this.sortKey===c.key?'<i class="fa-solid '+(this.sortDir>0?"fa-sort-up":"fa-sort-down")+'"></i>':"")+"</button></th>").join("")+"</tr></thead><tbody>";
    h+=slice.map(r=>"<tr>"+cols.map(c=>"<td>"+esc(r[c.key])+"</td>").join("")+"</tr>").join("")||'<tr><td colspan="'+cols.length+'">'+esc(this.o.strings.noRows)+"</td></tr>";
    h+="</tbody></table></div>";
    if(this.o.paging||this.o.info){
      h+='<div class="tbl-pager">';
      if(this.o.info)h+='<span class="muted">'+esc(this.o.strings.showing)+' '+(total?(start+1):0)+"–"+Math.min(start+ps,total)+" "+esc(this.o.strings.from)+" "+total+"</span>";
      if(this.o.paging){h+='<span style="flex:1"></span><button type="button" class="btn btn-ghost btn-sm" data-g="prev"><i class="fa-solid fa-chevron-left"></i></button><span>'+esc(this.o.strings.page)+' '+this.page+" / "+pages+'</span><button type="button" class="btn btn-ghost btn-sm" data-g="next"><i class="fa-solid fa-chevron-right"></i></button><select data-g="ps" aria-label="Rows per page">'+[5,8,15,25,50].map(n=>'<option value="'+n+'"'+(ps===n?" selected":"")+">"+n+" "+esc(this.o.strings.perPage)+"</option>").join("")+"</select>";}
      h+="</div>";
    }
    box.innerHTML=h;
    box.querySelectorAll('[data-g="sort"]').forEach(th=>th.addEventListener("click",()=>{const k=th.dataset.k; if(this.sortKey===k)this.sortDir*=-1; else{this.sortKey=k;this.sortDir=1;} this.renderBody();}));
    const prev=box.querySelector('[data-g="prev"]'); if(prev)prev.onclick=()=>{if(this.page>1){this.page--;this.renderBody();}};
    const next=box.querySelector('[data-g="next"]'); if(next)next.onclick=()=>{this.page++;this.renderBody();};
    const psSel=box.querySelector('[data-g="ps"]'); if(psSel)psSel.onchange=()=>{this.o.pageSize=+psSel.value;this.page=1;this.renderBody();};
  }
}
g.DataGrid=DataGrid;
})(window);
