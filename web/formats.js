/* File format viewer: PDF + raster images + ASCII DXF. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const state={mode:'pdf',file:null,dxf:null,img:null,zoom:1,offsetX:0,offsetY:0,drag:false,lastX:0,lastY:0};
  const imageTypes=new Set(['image/png','image/jpeg','image/jpg','image/webp','image/bmp','image/gif','image/svg+xml']);
  const ext=f=>(f.name.split('.').pop()||'').toLowerCase();
  function status(t){if($('status')) $('status').textContent=t;}
  function clearViewer(){
    const c=$('canvas'),ctx=c.getContext('2d');
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,c.width,c.height);
    $('overlay').innerHTML=''; $('empty').classList.add('hidden');
  }
  function fitCanvas(w,h){
    const v=$('viewer'); const pad=48; const aw=Math.max(320,v.clientWidth-pad), ah=Math.max(240,v.clientHeight-pad-34);
    state.zoom=Math.min(aw/w,ah/h,1); if(!isFinite(state.zoom)||state.zoom<=0)state.zoom=1;
    state.offsetX=state.offsetY=0; draw();
  }
  function setCanvasSize(w,h){const c=$('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));c.style.width=Math.ceil(w)+'px';c.style.height=Math.ceil(h)+'px';$('paper').style.width=Math.ceil(w)+'px';$('paper').style.height=Math.ceil(h)+'px';}
  function drawImage(){
    const im=state.img; const w=Math.max(1,Math.round(im.naturalWidth*state.zoom)),h=Math.max(1,Math.round(im.naturalHeight*state.zoom));
    setCanvasSize(w,h);const ctx=$('canvas').getContext('2d');ctx.clearRect(0,0,w,h);ctx.drawImage(im,0,0,w,h);$('zoomInfo').textContent=Math.round(state.zoom*100)+'%';
  }
  function parseDxf(text){
    const a=text.replace(/\r/g,'').split('\n');const pairs=[];for(let i=0;i+1<a.length;i+=2)pairs.push([a[i].trim(),a[i+1]]);
    const ents=[];let inEnt=false,type='';let e={};
    function flush(){if(type){e.type=type;ents.push(e);}type='';e={};}
    for(const [code,val] of pairs){
      if(code==='0'){
        if(val.trim()==='SECTION'){inEnt=false;continue} if(val.trim()==='ENDSEC'){flush();inEnt=false;continue}
        if(val.trim()==='ENTITIES'){inEnt=true;continue} if(val.trim()==='ENDSEC'||val.trim()==='EOF'){flush();inEnt=false;continue}
        if(inEnt){flush();type=val.trim().toUpperCase();}
        continue;
      }
      if(!inEnt)continue;
      const n=Number(val); const v=Number.isFinite(n)?n:val;
      if(code==='8')e.layer=String(val).trim();
      else if(code==='10'){if(type==='LINE'||type==='CIRCLE'||type==='ARC'||type==='POINT'||type==='TEXT'||type==='MTEXT')e.x=Number(val);else if(type==='LWPOLYLINE'){e.xs=e.xs||[];e.xs.push(Number(val));}}
      else if(code==='20'){if(type==='LWPOLYLINE'){e.ys=e.ys||[];e.ys.push(Number(val));}else e.y=Number(val);}
      else if(code==='11')e.x2=Number(val); else if(code==='21')e.y2=Number(val);
      else if(code==='40')e.r=Number(val); else if(code==='50')e.a1=Number(val); else if(code==='51')e.a2=Number(val);
      else if(code==='1')e.text=String(val); else if(code==='70')e.flags=Number(val);
    }
    flush();return ents.filter(e=>e.type==='LINE'||e.type==='CIRCLE'||e.type==='ARC'||e.type==='LWPOLYLINE'||e.type==='TEXT'||e.type==='MTEXT');
  }
  function dxfBounds(ents){let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;const add=(x,y)=>{if(Number.isFinite(x)&&Number.isFinite(y)){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}};for(const e of ents){if(e.type==='LWPOLYLINE'){(e.xs||[]).forEach((x,i)=>add(x,(e.ys||[])[i]));}else if(e.type==='LINE'){add(e.x,e.y);add(e.x2,e.y2);}else{add(e.x,e.y);if(e.r){add(e.x-e.r,e.y-e.r);add(e.x+e.r,e.y+e.r);}}}if(!isFinite(minX))return {minX:0,minY:0,maxX:100,maxY:100};return {minX,minY,maxX,maxY};}
  function drawDxf(){
    const ents=state.dxf.entities,b=state.dxf.bounds;const vw=Math.max(500,$('viewer').clientWidth-48),vh=Math.max(400,$('viewer').clientHeight-70);const sx=vw/Math.max(1,b.maxX-b.minX),sy=vh/Math.max(1,b.maxY-b.minY);const s=Math.min(sx,sy)*state.zoom;const w=Math.max(400,Math.ceil((b.maxX-b.minX)*s+40)),h=Math.max(300,Math.ceil((b.maxY-b.minY)*s+40));setCanvasSize(w,h);const ctx=$('canvas').getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#111827';ctx.fillStyle='#111827';ctx.lineWidth=Math.max(1,1.2*state.zoom);const X=x=>(x-b.minX)*s+20,Y=y=>h-((y-b.minY)*s+20);for(const e of ents){ctx.beginPath();if(e.type==='LINE'){ctx.moveTo(X(e.x),Y(e.y));ctx.lineTo(X(e.x2),Y(e.y2));ctx.stroke();}else if(e.type==='CIRCLE'){ctx.arc(X(e.x),Y(e.y),Math.abs(e.r*s),0,Math.PI*2);ctx.stroke();}else if(e.type==='ARC'){let a1=(e.a1||0)*Math.PI/180,a2=(e.a2||360)*Math.PI/180;ctx.arc(X(e.x),Y(e.y),Math.abs(e.r*s),-a1,-a2,true);ctx.stroke();}else if(e.type==='LWPOLYLINE'){let xs=e.xs||[],ys=e.ys||[];if(xs.length){ctx.moveTo(X(xs[0]),Y(ys[0]));for(let i=1;i<xs.length;i++)ctx.lineTo(X(xs[i]),Y(ys[i]));if((e.flags&1)===1)ctx.closePath();ctx.stroke();} }else if(e.type==='TEXT'||e.type==='MTEXT'){ctx.font=Math.max(10,12*state.zoom)+'px Segoe UI';ctx.fillText(String(e.text||''),X(e.x),Y(e.y));}}
    $('zoomInfo').textContent=Math.round(state.zoom*100)+'%';
  }
  async function openImage(file){
    const url=URL.createObjectURL(file),im=new Image();im.onload=()=>{state.mode='image';state.file=file;state.img=im;state.dxf=null;clearViewer();$('fileInfo').textContent=file.name+' · '+im.naturalWidth+'×'+im.naturalHeight;$('pageCount').textContent='1';$('pageInput').value='1';fitCanvas(im.naturalWidth,im.naturalHeight);status('已打开图片：'+file.name);URL.revokeObjectURL(url)};im.onerror=()=>{URL.revokeObjectURL(url);status('图片解码失败：'+file.name)};im.src=url;
  }
  async function openDxf(file){const text=await file.text();if(!/\bSECTION\b|\bENTITIES\b/i.test(text)){status('DXF 文件不是可读取的 ASCII DXF；二进制 DXF 不支持');return}const entities=parseDxf(text);state.mode='dxf';state.file=file;state.dxf={entities,bounds:dxfBounds(entities)};state.img=null;clearViewer();$('fileInfo').textContent=file.name+' · DXF · '+entities.length+' 个实体';$('pageCount').textContent='1';$('pageInput').value='1';state.zoom=1;drawDxf();status('已打开 DXF：'+file.name+'（基础矢量实体）')}
  function openDwg(file){state.mode='dwg';state.file=file;clearViewer();$('fileInfo').textContent=file.name+' · DWG';$('empty').classList.remove('hidden');$('empty').innerHTML='<strong>DWG 文件已识别</strong><div style="margin-top:10px">当前离线版尚未内置 DWG 二进制解析引擎。请先转换为 DXF，或接入 LibreDWG/ODA 等解析器后再直接打开。</div>';status('已识别 DWG，但当前版本没有 DWG 二进制解析器');}
  function openAny(file){if(!file)return;const e=ext(file);if(file.type.startsWith('image/')||imageTypes.has(file.type)||['png','jpg','jpeg','webp','bmp','gif','svg'].includes(e))return openImage(file);if(e==='dxf')return openDxf(file);if(e==='dwg')return openDwg(file);if(e==='pdf')return window.openPdf(file);status('暂不支持的文件格式：'+e)}
  function install(){const input=$('file'),btn=$('openBtn');if(!input||!btn)return;input.accept='.pdf,.dxf,.dwg,image/*';btn.onclick=()=>input.click();input.onchange=()=>{const f=input.files&&input.files[0];input.value='';openAny(f)};$('zoomIn').addEventListener('click',()=>{if(state.mode==='image'||state.mode==='dxf'){state.zoom=Math.min(8,state.zoom*1.2);state.mode==='image'?drawImage():drawDxf()}});$('zoomOut').addEventListener('click',()=>{if(state.mode==='image'||state.mode==='dxf'){state.zoom=Math.max(.1,state.zoom/1.2);state.mode==='image'?drawImage():drawDxf()}});$('zoomFit').addEventListener('click',()=>{if(state.mode==='image'&&state.img)fitCanvas(state.img.naturalWidth,state.img.naturalHeight);else if(state.mode==='dxf'&&state.dxf){state.zoom=1;drawDxf()}});$('prev').addEventListener('click',()=>{if(state.mode!=='pdf')status('图片/DXF 为单页图纸')});$('next').addEventListener('click',()=>{if(state.mode!=='pdf')status('图片/DXF 为单页图纸')});window.openAnyFile=openAny;}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
