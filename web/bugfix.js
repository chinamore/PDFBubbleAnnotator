(function(){'use strict';
function getState(){
  return {pdf:typeof pdf!=='undefined'?pdf:null,buf:typeof buf!=='undefined'?buf:null,anns:typeof ann!=='undefined'?ann:[],name:typeof sourceName!=='undefined'?sourceName:'document.pdf',handle:typeof sourceHandle!=='undefined'?sourceHandle:null};
}
function downloadBlob(blob,name){
  if(!(blob instanceof Blob)||blob.size===0)throw new Error('导出文件为空');
  var url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(url)},3000);
}
function hexColor(h){
  h=(h||'#ef3340').replace('#','');
  if(h.length===3)h=h.split('').map(function(x){return x+x}).join('');
  return PDFLib.rgb(parseInt(h.slice(0,2),16)/255,parseInt(h.slice(2,4),16)/255,parseInt(h.slice(4,6),16)/255);
}
function cssFill(v){return v==='transparent'||!v?'transparent':v;}
function pngSignature(blob){return new Promise(function(resolve,reject){var r=new FileReader();r.onload=function(){var b=new Uint8Array(r.result||[]);resolve(b.length>=8&&b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71&&b[4]===13&&b[5]===10&&b[6]===26&&b[7]===10)};r.onerror=reject;r.readAsArrayBuffer(blob.slice(0,8));});}
async function canvasPng(canvas){
  var blob=await new Promise(function(resolve){canvas.toBlob(resolve,'image/png',1.0);});
  if(blob && blob.type==='image/png' && blob.size>100 && await pngSignature(blob))return blob;
  var data=canvas.toDataURL('image/png');
  if(typeof data!=='string'||data.indexOf('data:image/png;base64,')!==0)throw new Error('浏览器未生成 PNG 数据');
  var res=await fetch(data);var out=await res.blob();
  if(!(out.type==='image/png' && await pngSignature(out)))throw new Error('PNG 文件头校验失败');
  return out;
}
function getBubbleStyleDefaults(){
  var outer=document.getElementById('outer'),inner=document.getElementById('innerColor'),font=document.getElementById('fontColor'),fill=document.getElementById('fillColor'),transparent=document.getElementById('fillTransparent');
  return {outer:outer?outer.value:'#ef3340',inner:inner?inner.value:'#ef3340',font:font?font.value:'#ef3340',fill:transparent&&transparent.checked?'transparent':(fill?fill.value:'transparent')};
}
function addBubbleStyleControls(){
  if(document.getElementById('bubbleStyleControls'))return;
  var outer=document.getElementById('outer');
  if(!outer||!outer.parentElement)return;
  var wrap=document.createElement('div');wrap.id='bubbleStyleControls';
  wrap.innerHTML='<div class="row"><span>外圈颜色</span><input id="outer" class="color" type="color" value="#ef3340"></div><div class="row"><span>内圈颜色</span><input id="innerColor" class="color" type="color" value="#ef3340"></div><div class="row"><span>字体颜色</span><input id="fontColor" class="color" type="color" value="#ef3340"></div><div class="row"><span>填充颜色</span><span style="display:flex;align-items:center;gap:5px"><input id="fillColor" class="color" type="color" value="#ffffff"><label style="font-size:11px"><input id="fillTransparent" type="checkbox" checked> 透明</label></span></div>';
  outer.parentElement.replaceWith(wrap.firstChild);
  var oldOuter=document.getElementById('outer');
  if(oldOuter){
    var row=oldOuter.parentElement;
    var host=row.parentElement;
    var rows=wrap.querySelectorAll('.row');
  }
  /* The original row is replaced by four rows; insert them at the same position. */
  var marker=document.querySelector('.section .row input#outer');
  if(marker){
    var old=marker.closest('.row');
    var parent=old.parentElement;
    var temp=document.createElement('div');temp.innerHTML=wrap.innerHTML;
    var nodes=Array.prototype.slice.call(temp.children);
    old.remove();nodes.reverse().forEach(function(n){parent.insertBefore(n,parent.children[4]||null);});
  }
}
function ensureBubbleStyleControls(){
  if(document.getElementById('bubbleStyleControls'))return;
  var outer=document.getElementById('outer');
  if(!outer)return;
  var oldRow=outer.closest('.row');
  var parent=oldRow.parentElement;
  var frag=document.createDocumentFragment();
  function row(label,id,type,value){var d=document.createElement('div');d.className='row';d.innerHTML='<span>'+label+'</span><input id="'+id+'" class="color" type="color" value="'+value+'">';return d;}
  var r1=row('外圈颜色','outer','color','#ef3340');
  var r2=row('内圈颜色','innerColor','color','#ef3340');
  var r3=row('字体颜色','fontColor','color','#ef3340');
  var r4=document.createElement('div');r4.className='row';r4.innerHTML='<span>填充颜色</span><span style="display:flex;align-items:center;gap:5px"><input id="fillColor" class="color" type="color" value="#ffffff"><label style="font-size:11px"><input id="fillTransparent" type="checkbox" checked>透明</label></span>';
  frag.appendChild(r1);frag.appendChild(r2);frag.appendChild(r3);frag.appendChild(r4);oldRow.replaceWith(frag);
}
function applyBadgeStyles(){
  if(typeof ann==='undefined'||typeof overlay==='undefined')return;
  ann.filter(function(a){return a.page===pageNo}).forEach(function(a){
    var d=overlay.querySelector('.badge[data-id="'+a.id+'"]');if(!d)return;
    d.style.borderColor=a.outerColor||a.color||'#ef3340';
    d.style.color=a.fontColor||a.color||'#ef3340';
    d.style.backgroundColor=cssFill(a.fillColor);
    d.style.boxShadow='inset 0 0 0 '+Math.max(1,Number(a.innerBorder||a.border||2))+'px '+(a.innerColor||a.outerColor||a.color||'#ef3340');
  });
}
function wrapAnnotationRenderer(){
  if(window.__bubbleRendererWrapped||typeof renderAnnotations!=='function')return;
  var original=renderAnnotations;
  window.renderAnnotations=function(){original();applyBadgeStyles();};
  window.__bubbleRendererWrapped=true;
  applyBadgeStyles();
}
function bindBubbleControls(){
  ['outer','innerColor','fontColor','fillColor','fillTransparent'].forEach(function(id){
    var el=document.getElementById(id);if(!el||el.__bubbleBound)return;
    el.__bubbleBound=true;
    el.addEventListener('input',function(){
      if(typeof selected==='undefined'||!selected||typeof ann==='undefined')return;
      var a=ann.find(function(x){return x.id===selected});if(!a)return;
      var s=getBubbleStyleDefaults();a.outerColor=s.outer;a.innerColor=s.inner;a.fontColor=s.font;a.fillColor=s.fill;renderAnnotations();
    });
  });
}
function captureNewBubbleStyle(){
  if(window.__bubbleCaptureBound)return;
  if(typeof overlay==='undefined')return;
  overlay.addEventListener('click',function(e){
    if(typeof tool==='undefined'||tool!=='bubble'||e.target!==overlay)return;
    setTimeout(function(){
      if(typeof ann==='undefined'||!ann.length)return;
      var a=ann[ann.length-1],s=getBubbleStyleDefaults();
      a.outerColor=s.outer;a.innerColor=s.inner;a.fontColor=s.font;a.fillColor=s.fill;
      a.color=s.outer;
      if(!a.innerBorder)a.innerBorder=a.border||2;
      renderAnnotations();
    },0);
  },true);
  window.__bubbleCaptureBound=true;
}
function drawBubbleOnCanvas(c,a,scaleOut){
  var x=(Number(a.nx)||0)*c.width,y=(Number(a.ny)||0)*c.height;
  var diameter=(Number(a.size)||28)*(scaleOut/(typeof baseScale==='number'?baseScale:1.5));
  var radius=diameter/2,border=Math.max(1,(Number(a.border)||2)*(scaleOut/(typeof baseScale==='number'?baseScale:1.5)));
  var innerBorder=Math.max(1,(Number(a.innerBorder)||Number(a.border)||2)*(scaleOut/(typeof baseScale==='number'?baseScale:1.5)));
  var ctx=c.getContext('2d');ctx.save();
  if(a.fillColor&&a.fillColor!=='transparent'){ctx.fillStyle=a.fillColor;ctx.beginPath();ctx.arc(x,y,Math.max(0,radius-border/2),0,Math.PI*2);ctx.fill();}
  ctx.lineWidth=border;ctx.strokeStyle=a.outerColor||a.color||'#ef3340';ctx.beginPath();ctx.arc(x,y,Math.max(0,radius-border/2),0,Math.PI*2);ctx.stroke();
  ctx.lineWidth=innerBorder;ctx.strokeStyle=a.innerColor||a.outerColor||a.color||'#ef3340';ctx.beginPath();ctx.arc(x,y,Math.max(0,radius-border/2-innerBorder),0,Math.PI*2);ctx.stroke();
  var fs=(Number(a.font)||13)*(scaleOut/(typeof baseScale==='number'?baseScale:1.5));ctx.fillStyle=a.fontColor||a.color||'#ef3340';ctx.font='700 '+fs+'px Arial, Microsoft YaHei, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(a.text==null?'':a.text),x,y);ctx.restore();
}
async function exportPdfFixed(){
  var s=getState();
  if(!s.pdf||!s.buf)return alert('请先打开 PDF');
  if(!window.PDFLib)return alert('PDF 导出组件未加载');
  try{
    setStatus&&setStatus('正在生成矢量 PDF…');
    var doc=await PDFLib.PDFDocument.load(s.buf.slice(0));
    var font=await doc.embedFont(PDFLib.StandardFonts.HelveticaBold),pages=doc.getPages();
    var k=typeof baseScale==='number'&&baseScale>0?baseScale:1.5;
    s.anns.forEach(function(a){
      if(!a||!a.page)return;var p=pages[a.page-1];if(!p)return;var w=p.getWidth(),h=p.getHeight();
      var x=(Number(a.nx)||0)*w,y=(1-(Number(a.ny)||0))*h,diameter=(Number(a.size)||28)/k,radius=diameter/2,bw=(Number(a.border)||2)/k,ib=(Number(a.innerBorder)||Number(a.border)||2)/k;
      var outer=hexColor(a.outerColor||a.color),inner=hexColor(a.innerColor||a.outerColor||a.color),fontColor=hexColor(a.fontColor||a.color),fill=(a.fillColor&&a.fillColor!=='transparent')?hexColor(a.fillColor):undefined;
      p.drawCircle({x:x,y:y,size:radius,borderWidth:bw,borderColor:outer,color:fill});
      if(ib>0&&radius-ib>0)p.drawCircle({x:x,y:y,size:Math.max(0,radius-bw/2-ib),borderWidth:ib,borderColor:inner,color:undefined});
      var fs=(Number(a.font)||13)/k,tw=font.widthOfTextAtSize(String(a.text==null?'':a.text),fs);p.drawText(String(a.text==null?'':a.text),{x:x-tw/2,y:y-fs*0.34,size:fs,font:font,color:fontColor});
    });
    var out=await doc.save(),name=s.name.replace(/\.[^.]+$/i,'')+' - Bubble Drawing.pdf';
    if(window.showSaveFilePicker){try{var opts={suggestedName:name,types:[{description:'PDF',accept:{'application/pdf':['.pdf']}}]};if(s.handle)opts.startIn=s.handle;var h=await window.showSaveFilePicker(opts),w=await h.createWritable();await w.write(out);await w.close();}catch(e){if(e.name!=='AbortError')throw e;}}else downloadBlob(new Blob([out],{type:'application/pdf'}),name);
    setStatus&&setStatus('PDF 导出完成：'+name);
  }catch(e){console.error(e);alert('PDF 导出失败：'+(e&&e.message||e));setStatus&&setStatus('PDF 导出失败');}
}
async function exportPngFixed(){
  var s=getState();if(!s.pdf)return alert('请先打开 PDF');
  try{
    setStatus&&setStatus('正在导出 PNG（包含气泡标注）…');var base=s.name.replace(/\.[^.]+$/i,'');
    for(var i=1;i<=s.pdf.numPages;i++){
      var p=await s.pdf.getPage(i),scaleOut=2,v=p.getViewport({scale:scaleOut}),c=document.createElement('canvas');c.width=Math.ceil(v.width);c.height=Math.ceil(v.height);
      var cctx=c.getContext('2d',{alpha:false});await p.render({canvasContext:cctx,viewport:v}).promise;
      s.anns.filter(function(a){return a.page===i}).forEach(function(a){drawBubbleOnCanvas(c,a,scaleOut)});
      var blob=await canvasPng(c);if(!(await pngSignature(blob)))throw new Error('第 '+i+' 页不是有效 PNG');
      downloadBlob(new Blob([await blob.arrayBuffer()],{type:'image/png'}),base+'-page-'+String(i).padStart(3,'0')+'.png');await new Promise(function(r){setTimeout(r,180)});setStatus&&setStatus('PNG '+i+' / '+s.pdf.numPages+'（含标注）');
    }
    setStatus&&setStatus('PNG 导出完成（包含气泡标注）');
  }catch(e){console.error(e);alert('PNG 导出失败：'+(e&&e.message||e));setStatus&&setStatus('PNG 导出失败');}
}
function install(){
  ensureBubbleStyleControls();bindBubbleControls();captureNewBubbleStyle();wrapAnnotationRenderer();
  var s=document.getElementById('save');if(s)s.onclick=exportPdfFixed;
  var b=document.getElementById('batchPng');if(b)b.onclick=exportPngFixed;
  var old=document.getElementById('_img');if(old)old.onclick=exportPngFixed;
  window.PDFBubbleBugfix={exportPdfFixed:exportPdfFixed,exportPngFixed:exportPngFixed};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
setTimeout(install,300);setTimeout(install,1000);setTimeout(install,2000);setTimeout(install,4000);
})();