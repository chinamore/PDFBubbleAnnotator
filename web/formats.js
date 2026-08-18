/* File format viewer: PDF + raster images + ASCII DXF + LibreDWG DWG. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const state={mode:'pdf',file:null,dxf:null,img:null,svg:null,zoom:1};
const imageTypes=new Set(['image/png','image/jpeg','image/jpg','image/webp','image/bmp','image/gif','image/svg+xml']);
const ext=f=>(f.name.split('.').pop()||'').toLowerCase();
function status(t){if($('status'))$('status').textContent=t}
function clearViewer(){const p=$('paper');p.innerHTML='<canvas id="canvas"></canvas><div id="overlay" class="overlay"></div>'; $('empty').classList.add('hidden')}
function setCanvasSize(w,h){const c=$('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));c.style.width=Math.ceil(w)+'px';c.style.height=Math.ceil(h)+'px';$('paper').style.width=Math.ceil(w)+'px';$('paper').style.height=Math.ceil(h)+'px'}
function fitCanvas(w,h){const v=$('viewer'),aw=Math.max(320,v.clientWidth-48),ah=Math.max(240,v.clientHeight-70);state.zoom=Math.min(aw/w,ah/h,1);if(!isFinite(state.zoom)||state.zoom<=0)state.zoom=1;drawCurrent()}
function drawImage(){const im=state.img,w=Math.max(1,Math.round(im.naturalWidth*state.zoom)),h=Math.max(1,Math.round(im.naturalHeight*state.zoom));setCanvasSize(w,h);$('canvas').getContext('2d').drawImage(im,0,0,w,h);$('zoomInfo').textContent=Math.round(state.zoom*100)+'%'}
function parseDxf(text){const a=text.replace(/\r/g,'').split('\n'),ents=[];let inEnt=false,type='',e={};function flush(){if(type)ents.push({...e,type});type='';e={}}for(let i=0;i+1<a.length;i+=2){const code=a[i].trim(),val=a[i+1];if(code==='0'){const t=val.trim().toUpperCase();if(t==='ENTITIES'){inEnt=true;continue}if(t==='ENDSEC'||t==='EOF'){flush();inEnt=false;continue}if(inEnt)flush(),type=t;continue}if(!inEnt)continue;if(code==='8')e.layer=val.trim();else if(code==='10'){if(type==='LWPOLYLINE'){(e.xs??=[]).push(+val)}else e.x=+val}else if(code==='20'){if(type==='LWPOLYLINE'){(e.ys??=[]).push(+val)}else e.y=+val}else if(code==='11')e.x2=+val;else if(code==='21')e.y2=+val;else if(code==='40')e.r=+val;else if(code==='50')e.a1=+val;else if(code==='51')e.a2=+val;else if(code==='1')e.text=val;else if(code==='70')e.flags=+val}flush();return ents.filter(e=>['LINE','CIRCLE','ARC','LWPOLYLINE','TEXT','MTEXT'].includes(e.type))}
function dxfBounds(es){let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;const add=(x,y)=>{if(Number.isFinite(x)&&Number.isFinite(y)){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}};for(const e of es){if(e.type==='LINE'){add(e.x,e.y);add(e.x2,e.y2)}else if(e.type==='LWPOLYLINE'){(e.xs||[]).forEach((x,i)=>add(x,(e.ys||[])[i]))}else{add(e.x,e.y);if(e.r){add(e.x-e.r,e.y-e.r);add(e.x+e.r,e.y+e.r)}}}return isFinite(minX)?{minX,minY,maxX,maxY}:{minX:0,minY:0,maxX:100,maxY:100}}
function drawDxf(){const es=state.dxf.entities,b=state.dxf.bounds,vw=Math.max(500,$('viewer').clientWidth-48),vh=Math.max(400,$('viewer').clientHeight-70),s=Math.min(vw/Math.max(1,b.maxX-b.minX),vh/Math.max(1,b.maxY-b.minY))*state.zoom,w=Math.max(400,(b.maxX-b.minX)*s+40),h=Math.max(300,(b.maxY-b.minY)*s+40);setCanvasSize(w,h);const c=$('canvas'),ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#111827';ctx.fillStyle='#111827';ctx.lineWidth=Math.max(1,1.2*state.zoom);const X=x=>(x-b.minX)*s+20,Y=y=>h-((y-b.minY)*s+20);for(const e of es){ctx.beginPath();if(e.type==='LINE'){ctx.moveTo(X(e.x),Y(e.y));ctx.lineTo(X(e.x2),Y(e.y2));ctx.stroke()}else if(e.type==='CIRCLE'){ctx.arc(X(e.x),Y(e.y),Math.abs(e.r*s),0,Math.PI*2);ctx.stroke()}else if(e.type==='ARC'){ctx.arc(X(e.x),Y(e.y),Math.abs(e.r*s),-(e.a1||0)*Math.PI/180,-(e.a2??360)*Math.PI/180,true);ctx.stroke()}else if(e.type==='LWPOLYLINE'){const xs=e.xs||[],ys=e.ys||[];if(xs.length){ctx.moveTo(X(xs[0]),Y(ys[0]));for(let i=1;i<xs.length;i++)ctx.lineTo(X(xs[i]),Y(ys[i]));if((e.flags&1)===1)ctx.closePath();ctx.stroke()}}else{ctx.font=Math.max(10,12*state.zoom)+'px Segoe UI';ctx.fillText(String(e.text||''),X(e.x),Y(e.y))}}$('zoomInfo').textContent=Math.round(state.zoom*100)+'%'}
function drawSvg(){const svg=$('paper').querySelector('svg');if(!svg)return;const vb=svg.viewBox&&svg.viewBox.baseVal;const w=vb&&vb.width||parseFloat(svg.getAttribute('width'))||1000;const h=vb&&vb.height||parseFloat(svg.getAttribute('height'))||700;svg.style.width=w*state.zoom+'px';svg.style.height=h*state.zoom+'px';$('paper').style.width=svg.style.width;$('paper').style.height=svg.style.height;$('zoomInfo').textContent=Math.round(state.zoom*100)+'%'}
function drawCurrent(){if(state.mode==='image')drawImage();else if(state.mode==='dxf')drawDxf();else if(state.mode==='dwg')drawSvg()}
async function openImage(file){const url=URL.createObjectURL(file),im=new Image();im.onload=()=>{state.mode='image';state.file=file;state.img=im;clearViewer();$('fileInfo').textContent=file.name+' · '+im.naturalWidth+'×'+im.naturalHeight;$('pageCount').textContent='1';$('pageInput').value='1';fitCanvas(im.naturalWidth,im.naturalHeight);status('已打开图片：'+file.name);URL.revokeObjectURL(url)};im.onerror=()=>{URL.revokeObjectURL(url);status('图片解码失败：'+file.name)};im.src=url}
async function openDxf(file){const text=await file.text();if(!/\bSECTION\b|\bENTITIES\b/i.test(text)){status('DXF 不是 ASCII 文本格式；当前基础解析器不读取二进制 DXF');return}const entities=parseDxf(text);state.mode='dxf';state.file=file;state.dxf={entities,bounds:dxfBounds(entities)};state.img=null;clearViewer();$('fileInfo').textContent=file.name+' · DXF · '+entities.length+' 个实体';$('pageCount').textContent='1';$('pageInput').value='1';state.zoom=1;drawDxf();status('已打开 DXF：'+file.name+'（LINE/CIRCLE/ARC/LWPOLYLINE/TEXT）')}
async function openDwg(file){
  clearViewer();state.mode='dwg';state.file=file;$('fileInfo').textContent=file.name+' · DWG';$('pageCount').textContent='1';$('pageInput').value='1';status('正在加载 LibreDWG…');
  try{
    const mod=await import('./vendor/libredwg/dist/index.js');
    const LibreDwg=mod.LibreDwg; const Dwg_File_Type=mod.Dwg_File_Type;
    if(!LibreDwg||!Dwg_File_Type)throw new Error('LibreDWG Web 模块接口不完整');
    const wasmBase=new URL('./vendor/libredwg/wasm/',document.baseURI).href;
    const lib=await LibreDwg.create(wasmBase);
    const fileContent=await file.arrayBuffer();
    const dwg=lib.dwg_read_data(fileContent,Dwg_File_Type.DWG);
    if(!dwg)throw new Error('LibreDWG 未返回 DWG 数据');
    const db=lib.convert(dwg);
    const svgText=lib.dwg_to_svg(db);
    if(!svgText||typeof svgText!=='string')throw new Error('LibreDWG 未生成 SVG');
    const doc=new DOMParser().parseFromString(svgText,'image/svg+xml');
    const svg=doc.documentElement;
    if(!svg||svg.nodeName.toLowerCase()!=='svg')throw new Error('DWG SVG 解析失败');
    const parserError=svg.querySelector('parsererror');if(parserError)throw new Error('DWG SVG 文档无效');
    const p=$('paper');p.innerHTML='';p.appendChild(document.importNode(svg,true));const ov=document.createElement('div');ov.id='overlay';ov.className='overlay';p.appendChild(ov);state.svg=svg;state.zoom=1;drawSvg();$('empty').classList.add('hidden');status('DWG 打开成功：LibreDWG 矢量视图');
    if(typeof lib.dwg_free==='function')lib.dwg_free(dwg);
  }catch(e){console.error('LibreDWG:',e);$('empty').classList.remove('hidden');$('empty').innerHTML='<strong>DWG 打开失败</strong><div style="margin-top:10px">'+String(e.message||e)+'</div><div style="margin-top:8px">离线包需要包含 web/vendor/libredwg/dist/index.js 与 web/vendor/libredwg/wasm/libredwg.wasm。</div>';status('DWG 解析失败：'+(e.message||e))}
}
function openAny(file){if(!file)return;const e=ext(file);if(file.type.startsWith('image/')||imageTypes.has(file.type)||['png','jpg','jpeg','webp','bmp','gif','svg'].includes(e))return openImage(file);if(e==='dxf')return openDxf(file);if(e==='dwg')return openDwg(file);if(e==='pdf')return window.openPdf(file);status('暂不支持的文件格式：'+e)}
function install(){const input=$('file'),btn=$('openBtn');if(!input||!btn)return;input.accept='.pdf,.dxf,.dwg,image/*';btn.onclick=()=>input.click();input.onchange=()=>{const f=input.files?.[0];input.value='';openAny(f)};for(const id of ['zoomIn','zoomOut','zoomFit'])$(id).addEventListener('click',()=>{if(state.mode==='image'||state.mode==='dxf'||state.mode==='dwg'){if(id==='zoomIn')state.zoom=Math.min(8,state.zoom*1.2);else if(id==='zoomOut')state.zoom=Math.max(.1,state.zoom/1.2);else state.zoom=1;drawCurrent()}});for(const id of ['prev','next'])$(id).addEventListener('click',()=>{if(state.mode!=='pdf')status('当前文件为单页图纸')});window.openAnyFile=openAny}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
