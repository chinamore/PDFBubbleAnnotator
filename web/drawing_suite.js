(() => {
  'use strict';
  if (window.__pbaDrawingSuite) return;
  window.__pbaDrawingSuite = true;

  const state = window.PBADrawings = window.PBADrawings || [];
  let tool = 'select';
  let start = null;
  let draft = null;
  let drag = null;

  const $ = id => document.getElementById(id);
  const overlay = () => $('overlay');
  const pageNo = () => Number(window.pageNo || 1);
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const pos = e => { const r=overlay().getBoundingClientRect(); return {x:clamp(e.clientX-r.left,0,r.width),y:clamp(e.clientY-r.top,0,r.height)}; };
  const norm = p => { const r=overlay().getBoundingClientRect(); return {x:p.x/Math.max(1,r.width),y:p.y/Math.max(1,r.height)}; };
  const denorm = p => { const r=overlay().getBoundingClientRect(); return {x:p.x*r.width,y:p.y*r.height}; };

  function setTool(t){ tool=t; document.querySelectorAll('.pba-draw-tool').forEach(b=>b.classList.toggle('active',b.dataset.draw===t)); if($('toolName'))$('toolName').textContent=t==='line'?'直线':t==='rect'?'矩形':t==='square'?'正方形':t==='cloud'?'云线':t==='leader'?'引线':t==='mtext'?'多行文字':'选择'; }
  function style(){ return {stroke:$('outer')?.value||'#ef3340',width:Number($('border')?.value||2),fill:'transparent',font:Number($('font')?.value||13),textColor:$('fontColor')?.value||'#ef3340'}; }
  function makeEl(d){
    const el=document.createElement('div'); el.className='pba-drawing'; el.style.position='absolute';el.style.inset='0';el.style.pointerEvents='none';
    const r=overlay().getBoundingClientRect();
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('width','100%');svg.setAttribute('height','100%');svg.style.position='absolute';svg.style.inset='0';svg.style.overflow='visible';
    const s=style();
    const add=(tag,attrs)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));svg.appendChild(n);return n;};
    if(['line','leader'].includes(d.type)){const a=denorm(d.a),b=denorm(d.b);add('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:s.stroke,'stroke-width':s.width,'fill':'none'});if(d.type==='leader'){const ang=Math.atan2(b.y-a.y,b.x-a.x),len=10;add('path',{d:`M ${b.x} ${b.y} L ${b.x-len*Math.cos(ang-.5)} ${b.y-len*Math.sin(ang-.5)} M ${b.x} ${b.y} L ${b.x-len*Math.cos(ang+.5)} ${b.y-len*Math.sin(ang+.5)}`,stroke:s.stroke,'stroke-width':s.width,fill:'none'});}}
    if(['rect','square'].includes(d.type)){const a=denorm(d.a),b=denorm(d.b);let x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),w=Math.abs(b.x-a.x),h=Math.abs(b.y-a.y);if(d.type==='square'){const q=Math.max(w,h);w=q;h=q;if(b.x<a.x)x=a.x-q;if(b.y<a.y)y=a.y-q;}add('rect',{x,y,width:w,height:h,stroke:s.stroke,'stroke-width':s.width,fill:'none'});}
    if(d.type==='cloud'){const a=denorm(d.a),b=denorm(d.b),x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),w=Math.abs(b.x-a.x),h=Math.abs(b.y-a.y),n=Math.max(6,Math.ceil((2*(w+h))/28));let path='';for(let i=0;i<n;i++){const t=i/n,t2=(i+1)/n;let p1,p2;if(t<.25){p1={x:x+w*t*4,y:y};p2={x:x+w*t2*4,y:y};}else if(t<.5){p1={x:x+w,y:y+h*(t-.25)*4};p2={x:x+w,y:y+h*(t2-.25)*4};}else if(t<.75){p1={x:x+w*(1-(t-.5)*4),y:y+h};p2={x:x+w*(1-(t2-.5)*4),y:y+h};}else{p1={x:x,y:y+h*(1-(t-.75)*4)};p2={x:x,y:y+h*(1-(t2-.75)*4)};}const mx=(p1.x+p2.x)/2,my=(p1.y+p2.y)/2,dx=p2.x-p1.x,dy=p2.y-p1.y,normal=Math.hypot(dx,dy)||1,bulge=Math.min(12,Math.max(5,normal*.18));const cx=mx-dy/normal*bulge,cy=my+dx/normal*bulge;if(i===0)path+=`M ${p1.x} ${p1.y}`;path+=` Q ${cx} ${cy} ${p2.x} ${p2.y}`;}add('path',{d:path,stroke:s.stroke,'stroke-width':s.width,fill:'none'});}
    if(d.type==='mtext'){const a=denorm(d.a);const fo=document.createElement('foreignObject');fo.setAttribute('x',a.x);fo.setAttribute('y',a.y);fo.setAttribute('width',Math.max(120,(d.w||.35)*r.width));fo.setAttribute('height',Math.max(50,(d.h||.2)*r.height));const div=document.createElement('div');div.textContent=d.text||'';div.style.cssText=`font:${s.font}px Segoe UI,Microsoft YaHei,sans-serif;color:${s.textColor};white-space:pre-wrap;line-height:1.25;border:1px dashed ${s.stroke};padding:4px;background:#ffffffcc;`;fo.appendChild(div);svg.appendChild(fo);}
    el.appendChild(svg);return el;
  }
  function render(){ document.querySelectorAll('.pba-drawing').forEach(e=>e.remove()); const ov=overlay(); if(!ov)return; state.filter(d=>Number(d.page)===pageNo()).forEach(d=>ov.appendChild(makeEl(d))); }
  function add(d){state.push(d);render();}
  function textDialog(p){const text=prompt('输入多行文字（可直接换行）：','');if(text!==null&&text.trim())add({type:'mtext',page:pageNo(),a:norm(p),w:.35,h:.2,text});}

  function down(e){ if(!overlay()||tool==='select')return; if(e.button!==0)return; const p=pos(e);start=p;if(tool==='mtext'){textDialog(p);start=null;return;} draft={type:tool,page:pageNo(),a:norm(p),b:norm(p)};render(); }
  function move(e){if(!start||!draft)return;draft.b=norm(pos(e));render();}
  function up(){if(!draft)return;const a=draft.a,b=draft.b;const dx=Math.abs(b.x-a.x),dy=Math.abs(b.y-a.y);if(dx<.005&&dy<.005){draft=null;render();return;}state.push({...draft});draft=null;render();}

  function addPanel(){const p=document.querySelector('.workspace .panel');if(!p||document.querySelector('.pba-drawing-box'))return;const box=document.createElement('div');box.className='component-box pba-drawing-box';box.innerHTML='<h4>图形标注 / CAD 工具</h4><div class="component-grid">'+['line|╱ 直线','rect|▭ 矩形','square|□ 正方形','cloud|☁ 云线','leader|↗ 引线','mtext|T 多行文字'].map(x=>{const [a,b]=x.split('|');return `<button class="component-btn pba-draw-tool" data-draw="${a}"><b>${b}</b><small>图纸上直接绘制</small></button>`}).join('')+'</div><div class="note">鼠标左键绘制；云线自动生成弧形云线；引线自动带箭头；多行文字支持换行。后续与 PDF/CAD 导出统一。</div>';p.appendChild(box);box.querySelectorAll('.pba-draw-tool').forEach(b=>b.onclick=()=>setTool(b.dataset.draw));}

  window.PBADrawingSuite={setTool,render,add,items:state};
  const ov=overlay(); if(ov){ov.addEventListener('pointerdown',down);ov.addEventListener('pointermove',move);ov.addEventListener('pointerup',up);ov.addEventListener('pointercancel',up);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{addPanel();render()});else setTimeout(()=>{addPanel();render()},250);
  window.addEventListener('resize',render);
})();
