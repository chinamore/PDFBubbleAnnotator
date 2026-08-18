/* PDFBubbleAnnotator Sketcher - isolated from the legacy bubble engine.
 * The bubble annotation DOM/state is never modified by this module.
 */
(function(){
'use strict';
const S={active:false,tool:'select',construction:false,items:[],start:null,temp:null,history:[],future:[],drag:null};
const $=id=>document.getElementById(id);
function viewer(){return $('overlay')||$('viewer')}
function status(t){if(window.setStatus)window.setStatus(t)}
function snap(v,g=10){return Math.round(v/g)*g}
function ensure(){
  if($('sketchLayer')) return $('sketchLayer');
  const host=$('paper')||$('viewer'); if(!host)return null;
  const c=document.createElement('canvas'); c.id='sketchLayer'; c.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:6;pointer-events:none'; host.appendChild(c);
  const style=document.createElement('style');style.textContent=`
  #sketcherPanel{position:fixed;top:122px;left:278px;z-index:30;background:#fff;border:1px solid #b8c4d4;border-radius:7px;box-shadow:0 6px 24px #0003;padding:7px;display:none;min-width:420px}
  #sketcherPanel .sk-row{display:flex;gap:4px;align-items:center;flex-wrap:wrap}
  #sketcherPanel button{font-size:12px;padding:5px 8px}.sk-active{background:#dbeafe!important;border-color:#60a5fa!important;color:#0757b8!important}
  #sketcherPanel .sk-title{font-weight:700;margin-right:8px;color:#334155}.sk-coord{font-size:10px;color:#64748b;margin-left:auto}
  #sketchLayer{cursor:crosshair}
  `;document.head.appendChild(style);
  const p=document.createElement('div');p.id='sketcherPanel';p.innerHTML=`<div class="sk-row"><span class="sk-title">✏ Sketcher</span><button data-sk="select">选择</button><button data-sk="line">直线</button><button data-sk="polyline">连续线</button><button data-sk="rectangle">矩形</button><button data-sk="circle">圆</button><button data-sk="arc">圆弧</button><button data-sk="point">点</button><button data-sk="dimension">尺寸</button><button data-sk="construction">构造线</button><button data-sk="undo">撤销</button><button data-sk="redo">重做</button><button data-sk="clear">清空</button><span class="sk-coord" id="skCoord">—</span></div>`;document.body.appendChild(p);
  p.querySelectorAll('[data-sk]').forEach(b=>b.onclick=()=>cmd(b.dataset.sk));
  c.addEventListener('pointerdown',down);c.addEventListener('pointermove',move);c.addEventListener('pointerup',up);c.addEventListener('pointerleave',move);return c;
}
function resize(){const c=$('sketchLayer'),p=$('paper');if(!c||!p)return;const r=p.getBoundingClientRect(),d=devicePixelRatio||1;c.width=Math.max(1,Math.round(r.width*d));c.height=Math.max(1,Math.round(r.height*d));c.style.width=r.width+'px';c.style.height=r.height+'px';draw()}
function pt(e){const c=$('sketchLayer'),r=c.getBoundingClientRect(),d=devicePixelRatio||1;return{x:e.clientX-r.left,y:e.clientY-r.top,X:(e.clientX-r.left)*d,Y:(e.clientY-r.top)*d}}
function save(){S.history.push(JSON.stringify(S.items));if(S.history.length>50)S.history.shift();S.future=[]}
function draw(){const c=$('sketchLayer');if(!c)return;const g=c.getContext('2d'),d=devicePixelRatio||1;g.clearRect(0,0,c.width,c.height);g.save();g.scale(d,d);g.lineWidth=1.5;g.strokeStyle='#1677ff';g.fillStyle='#1677ff';
 S.items.forEach(o=>shape(g,o)); if(S.temp)shape(g,S.temp,true);g.restore()}
function shape(g,o,temp){g.save();g.strokeStyle=o.construction?'#64748b':'#1677ff';g.setLineDash(o.construction?[6,4]:[]);g.lineWidth=temp?1.2:1.8;
 if(o.type==='line'||o.type==='polyline'){g.beginPath();g.moveTo(o.x1,o.y1);g.lineTo(o.x2,o.y2);g.stroke()}
 else if(o.type==='rect'){g.strokeRect(Math.min(o.x1,o.x2),Math.min(o.y1,o.y2),Math.abs(o.x2-o.x1),Math.abs(o.y2-o.y1))}
 else if(o.type==='circle'){g.beginPath();g.arc(o.x1,o.y1,Math.hypot(o.x2-o.x1,o.y2-o.y1),0,Math.PI*2);g.stroke()}
 else if(o.type==='arc'){g.beginPath();g.arc(o.cx,o.cy,o.r,o.a1,o.a2,o.ccw);g.stroke()}
 else if(o.type==='point'){g.beginPath();g.arc(o.x1,o.y1,3,0,Math.PI*2);g.fill()}
 else if(o.type==='dimension'){g.beginPath();g.moveTo(o.x1,o.y1);g.lineTo(o.x2,o.y2);g.stroke();const m=Math.hypot(o.x2-o.x1,o.y2-o.y1);g.fillText(m.toFixed(2),((o.x1+o.x2)/2)+5,((o.y1+o.y2)/2)-5)}
 g.restore()}
function cmd(t){if(t==='undo'){if(!S.history.length)return;S.future.push(JSON.stringify(S.items));S.items=JSON.parse(S.history.pop());draw();return}if(t==='redo'){if(!S.future.length)return;S.history.push(JSON.stringify(S.items));S.items=JSON.parse(S.future.pop());draw();return}if(t==='clear'){save();S.items=[];draw();return}if(t==='construction'){S.construction=!S.construction;status('构造几何：'+(S.construction?'开启':'关闭'));return}S.tool=t;document.querySelectorAll('#sketcherPanel [data-sk]').forEach(b=>b.classList.toggle('sk-active',b.dataset.sk===t));status('Sketcher：'+t)}
function down(e){if(!S.active)return;const p=pt(e);S.start=p;S.temp=null; $('sketchLayer').setPointerCapture?.(e.pointerId); if(S.tool==='select')return; if(S.tool==='point'){save();S.items.push({type:'point',x1:snap(p.x),y1:snap(p.y),construction:S.construction});S.start=null;draw()}}
function move(e){if(!S.active)return;const p=pt(e);if($('skCoord'))$('skCoord').textContent=`X ${p.x.toFixed(1)}  Y ${p.y.toFixed(1)}`;if(!S.start)return;const a=S.start,b=p;if(S.tool==='line'||S.tool==='polyline')S.temp={type:'line',x1:a.x,y1:a.y,x2:snap(b.x),y2:snap(b.y),construction:S.construction};else if(S.tool==='rectangle')S.temp={type:'rect',x1:a.x,y1:a.y,x2:snap(b.x),y2:snap(b.y),construction:S.construction};else if(S.tool==='circle')S.temp={type:'circle',x1:a.x,y1:a.y,x2:b.x,y2:b.y,construction:S.construction};else if(S.tool==='dimension')S.temp={type:'dimension',x1:a.x,y1:a.y,x2:b.x,y2:b.y,construction:false};else if(S.tool==='arc'){const cx=a.x,cy=a.y,r=Math.hypot(b.x-cx,b.y-cy),ang=Math.atan2(b.y-cy,b.x-cx);S.temp={type:'arc',cx,cy,r,a1:0,a2:ang,ccw:false,construction:S.construction};}draw()}
function up(e){if(!S.active||!S.start)return;const p=pt(e),a=S.start,b=p;save();if(S.tool==='line'||S.tool==='polyline')S.items.push({type:'line',x1:a.x,y1:a.y,x2:snap(b.x),y2:snap(b.y),construction:S.construction});else if(S.tool==='rectangle')S.items.push({type:'rect',x1:a.x,y1:a.y,x2:snap(b.x),y2:snap(b.y),construction:S.construction});else if(S.tool==='circle')S.items.push({type:'circle',x1:a.x,y1:a.y,x2:b.x,y2:b.y,construction:S.construction});else if(S.tool==='dimension')S.items.push({type:'dimension',x1:a.x,y1:a.y,x2:b.x,y2:b.y,construction:false});else if(S.tool==='arc'){const r=Math.hypot(b.x-a.x,b.y-a.y),ang=Math.atan2(b.y-a.y,b.x-a.x);S.items.push({type:'arc',cx:a.x,cy:a.y,r,a1:0,a2:ang,ccw:false,construction:S.construction});}S.start=null;S.temp=null;draw()}
function open(){ensure();S.active=true;$('sketcherPanel').style.display='block';$('sketchLayer').style.pointerEvents='auto';resize();cmd('select');status('Sketcher 已开启')}
function close(){S.active=false;S.start=null;S.temp=null;const p=$('sketcherPanel'),c=$('sketchLayer');if(p)p.style.display='none';if(c)c.style.pointerEvents='none';draw();status('已退出 Sketcher')}
window.PBABSketcher={open,close,toggle:()=>S.active?close():open,resize,items:S.items};
window.addEventListener('resize',resize);
})();