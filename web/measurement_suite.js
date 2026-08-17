(function(){
  'use strict';
  if(window.__pbaMeasurementSuite)return; window.__pbaMeasurementSuite=1;
  const overlay=document.getElementById('overlay');
  if(!overlay)return;
  const status=s=>{const e=document.getElementById('status');if(e)e.textContent=s};
  const viewer=()=>document.getElementById('paper');
  const measurements=window.PBAMeasurements=window.PBAMeasurements||[];
  let mode=null,pts=[],svg=null;
  const mmPerPt=25.4/72;
  function pagePoint(ev){const r=overlay.getBoundingClientRect();const x=Math.max(0,Math.min(r.width,ev.clientX-r.left));const y=Math.max(0,Math.min(r.height,ev.clientY-r.top));const vp=pdf.getPage(pageNo).then(p=>p.getViewport({scale:1}));return {x,y,vp};}
  async function point(ev){const r=overlay.getBoundingClientRect();const p=await pdf.getPage(pageNo);const v=p.getViewport({scale:1});return {x:(ev.clientX-r.left)/r.width*v.width,y:(1-(ev.clientY-r.top)/r.height)*v.height};}
  function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
  function area(poly){let s=0;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];s+=a.x*b.y-b.x*a.y}return Math.abs(s)/2}
  function angle(a,b,c){const ux=a.x-b.x,uy=a.y-b.y,vx=c.x-b.x,vy=c.y-b.y;return Math.acos(Math.max(-1,Math.min(1,(ux*vx+uy*vy)/(Math.hypot(ux,uy)*Math.hypot(vx,vy)))))*180/Math.PI}
  function circum(a,b,c){const d=2*(a.x*(b.y-c.y)+b.x*(c.y-a.y)+c.x*(a.y-b.y));if(Math.abs(d)<1e-9)return null;const ux=((a.x*a.x+a.y*a.y)*(b.y-c.y)+(b.x*b.x+b.y*b.y)*(c.y-a.y)+(c.x*c.x+c.y*c.y)*(a.y-b.y))/d;const uy=((a.x*a.x+a.y*a.y)*(c.x-b.x)+(b.x*b.x+b.y*b.y)*(a.x-c.x)+(c.x*c.x+c.y*c.y)*(b.x-a.x))/d;return {x:ux,y:uy,r:Math.hypot(ux-a.x,uy-a.y)}}
  function lineDistance(p,a,b){const den=Math.hypot(b.x-a.x,b.y-a.y);return den?Math.abs((b.x-a.x)*(a.y-p.y)-(a.x-p.x)*(b.y-a.y))/den:0}
  function ensureSvg(){if(svg)return;svg=document.createElementNS('http://www.w3.org/2000/svg','http://www.w3.org/2000/svg');svg.style='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:30';overlay.appendChild(svg)}
  function clearPreview(){if(svg)svg.innerHTML=''}
  function drawPreview(){ensureSvg();clearPreview();if(!pts.length)return;const r=overlay.getBoundingClientRect(),p2=[];for(const p of pts)p2.push({x:p.x/r.width*100,y:(1-p.y/currentPageHeight())*100});const el=(tag,attrs)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));svg.appendChild(n)};const cssPts=pts.map(p=>({x:p.x/currentPageWidth()*r.width,y:(1-p.y/currentPageHeight())*r.height}));if(cssPts.length>1)el('polyline',{points:cssPts.map(p=>`${p.x},${r.height-p.y}`).join(' '),fill:'none',stroke:'#1677ff','stroke-width':'2','stroke-dasharray':'6 4'});cssPts.forEach(p=>el('circle',{cx:p.x,cy:r.height-p.y,r:'4',fill:'#1677ff'}))}
  function currentPageWidth(){const r=overlay.getBoundingClientRect();return r.width*(pdf.getPage(pageNo)._pageInfo?.view?.[2]/Math.max(1,document.getElementById('canvas').width)||1)}
  function currentPageHeight(){const r=overlay.getBoundingClientRect();return r.height*(pdf.getPage(pageNo)._pageInfo?.view?.[3]/Math.max(1,document.getElementById('canvas').height)||1)}
  function finish(value,unit,label){measurements.push({page:pageNo,type:label,value,unit,timestamp:new Date().toISOString()});status(`${label}：${value.toFixed(3)} ${unit}`);mode=null;pts=[];clearPreview();updateMeasureCount()}
  function updateMeasureCount(){const e=document.getElementById('markCount');if(e)e.textContent=String(measurements.length);window.dispatchEvent(new CustomEvent('pba-measurement-added'))}
  async function onClick(ev){if(!mode||!pdf)return;ev.preventDefault();ev.stopPropagation();const p=await point(ev);pts.push(p);drawPreview();
    if(mode==='length'&&pts.length>=2){finish(dist(pts[pts.length-2],pts[pts.length-1])*mmPerPt,'mm','连续测量');return}
    if(mode==='area'&&pts.length>=3&&ev.detail===2){finish(area(pts)*mmPerPt*mmPerPt,'mm²','异形面积');return}
    if(mode==='angle'&&pts.length===3){finish(angle(pts[0],pts[1],pts[2]),'°','角度测量');return}
    if(mode==='pointline'&&pts.length===3){finish(lineDistance(pts[0],pts[1],pts[2])*mmPerPt,'mm','点到直线');return}
    if(mode==='radius'&&pts.length===2){finish(dist(pts[0],pts[1])*mmPerPt,'mm','半径测量');return}
    if(mode==='circle'&&pts.length===3){const c=circum(...pts);if(!c){status('三点共线，无法计算圆');pts=[];clearPreview();return}finish(c.r*mmPerPt,'mm','圆形半径');return}
    if(mode==='arc'&&pts.length===3){const c=circum(...pts);if(!c){status('三点共线，无法计算弧');pts=[];clearPreview();return}const a=Math.atan2(pts[0].y-c.y,pts[0].x-c.x),b=Math.atan2(pts[1].y-c.y,pts[1].x-c.x),d=Math.atan2(pts[2].y-c.y,pts[2].x-c.x);let sweep=(d-a+Math.PI*2)%(Math.PI*2);if(((b-a+Math.PI*2)%(Math.PI*2))>sweep)sweep-=Math.PI*2;finish(Math.abs(sweep)*c.r*mmPerPt,'mm','弧长');return}
  }
  overlay.addEventListener('click',onClick,true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&mode){mode=null;pts=[];clearPreview();status('已取消测量')}});
  function start(m){if(!pdf){alert('请先打开 PDF 图纸');return}mode=m;pts=[];ensureSvg();clearPreview();const names={length:'连续测量',area:'异形面积（双击结束）',angle:'角度测量',pointline:'点到直线',radius:'半径测量',circle:'圆形测量（三点）',arc:'弧长测量（三点）'};status(names[m]+'：请在图纸上取点')}
  function exportMeasurements(){if(!measurements.length){alert('暂无测量结果');return}const rows=[['页码','类型','结果','单位','时间'],...measurements.map(m=>[m.page,m.type,m.value,m.unit,m.timestamp])];const csv='\ufeff'+rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=(sourceName||'document.pdf').replace(/\.pdf$/i,'')+' - Measurements.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);status('测量结果已导出 CSV')}
  function addUI(){const p=document.querySelector('.workspace .panel');if(!p||document.querySelector('.pba-measure-box'))return;const box=document.createElement('div');box.className='section pba-measure-box';box.innerHTML='<h4>工程测量</h4><div class="tool-grid"><button data-m="length">📏 连续测量<small>逐段长度</small></button><button data-m="area">⬡ 异形面积<small>双击结束</small></button><button data-m="radius">◯ 半径测量<small>两点取半径</small></button><button data-m="circle">◉ 圆形测量<small>三点成圆</small></button><button data-m="angle">∠ 角度测量<small>三点测角</small></button><button data-m="pointline">↕ 点到直线<small>三点取距</small></button><button data-m="arc">⌒ 弧长测量<small>三点取弧</small></button><button id="pbaExportMeasurements">📊 测量统计<small>导出 CSV</small></button></div><div class="note" style="margin-top:6px">单位基于 PDF 点（72 pt/in），换算为 mm；工程图如有比例尺，可在后续版本加入比例校准。</div>';p.appendChild(box);box.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>start(b.dataset.m));box.querySelector('#pbaExportMeasurements').onclick=exportMeasurements}
  window.PBAMeasurements=measurements;window.PBAMeasurementSuite={start,exportMeasurements,measurements};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(addUI,250));else setTimeout(addUI,250);
})();