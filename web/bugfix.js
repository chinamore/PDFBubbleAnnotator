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
async function exportPdfFixed(){
  var s=getState();
  if(!s.pdf||!s.buf)return alert('请先打开 PDF');
  if(!window.PDFLib)return alert('PDF 导出组件未加载');
  try{
    setStatus&&setStatus('正在生成矢量 PDF…');
    var doc=await PDFLib.PDFDocument.load(s.buf.slice(0));
    var font=await doc.embedFont(PDFLib.StandardFonts.Helvetica);
    var pages=doc.getPages();
    var k=typeof baseScale==='number'&&baseScale>0?baseScale:1.5;
    s.anns.forEach(function(a){
      if(!a||!a.page)return;
      var p=pages[a.page-1];if(!p)return;
      var w=p.getWidth(),h=p.getHeight();
      var x=(Number(a.nx)||0)*w,y=(1-(Number(a.ny)||0))*h;
      /* CSS width/height is the complete outer diameter. pdf-lib drawCircle(size) uses xScale/yScale as radius. */
      var diameter=(Number(a.size)||28)/k;
      var radius=diameter/2;
      var bw=(Number(a.border)||2)/k;
      var color=hexColor(a.color);
      p.drawCircle({x:x,y:y,size:radius,borderWidth:bw,borderColor:color,color:PDFLib.rgb(1,1,1)});
      var text=String(a.text==null?'':a.text),fs=(Number(a.font)||13)/k;
      var tw=font.widthOfTextAtSize(text,fs);
      p.drawText(text,{x:x-tw/2,y:y-fs*0.34,size:fs,font:font,color:color});
    });
    var out=await doc.save();
    var name=s.name.replace(/\.[^.]+$/i,'')+' - Bubble Drawing.pdf';
    if(window.showSaveFilePicker){
      try{
        var opts={suggestedName:name,types:[{description:'PDF',accept:{'application/pdf':['.pdf']}}]};
        if(s.handle)opts.startIn=s.handle;
        var h=await window.showSaveFilePicker(opts),w=await h.createWritable();await w.write(out);await w.close();
      }catch(e){if(e.name!=='AbortError')throw e;}
    }else downloadBlob(new Blob([out],{type:'application/pdf'}),name);
    setStatus&&setStatus('PDF 导出完成：'+name);
  }catch(e){console.error(e);alert('PDF 导出失败：'+(e&&e.message||e));setStatus&&setStatus('PDF 导出失败');}
}
async function exportPngFixed(){
  var s=getState();
  if(!s.pdf)return alert('请先打开 PDF');
  try{
    setStatus&&setStatus('正在导出 PNG…');
    var base=s.name.replace(/\.[^.]+$/i,'');
    for(var i=1;i<=s.pdf.numPages;i++){
      var p=await s.pdf.getPage(i),v=p.getViewport({scale:2}),c=document.createElement('canvas');
      c.width=Math.ceil(v.width);c.height=Math.ceil(v.height);
      var cctx=c.getContext('2d',{alpha:false});
      await p.render({canvasContext:cctx,viewport:v}).promise;
      var blob=await canvasPng(c);
      var ok=await pngSignature(blob);
      if(!ok)throw new Error('第 '+i+' 页不是有效 PNG');
      downloadBlob(new Blob([await blob.arrayBuffer()],{type:'image/png'}),base+'-page-'+String(i).padStart(3,'0')+'.png');
      await new Promise(function(r){setTimeout(r,180)});
      setStatus&&setStatus('PNG '+i+' / '+s.pdf.numPages);
    }
    setStatus&&setStatus('PNG 导出完成');
  }catch(e){console.error(e);alert('PNG 导出失败：'+(e&&e.message||e));setStatus&&setStatus('PNG 导出失败');}
}
function install(){
  var s=document.getElementById('save');if(s)s.onclick=exportPdfFixed;
  var b=document.getElementById('batchPng');if(b)b.onclick=exportPngFixed;
  var old=document.getElementById('_img');if(old)old.onclick=exportPngFixed;
  window.PDFBubbleBugfix={exportPdfFixed:exportPdfFixed,exportPngFixed:exportPngFixed};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
setTimeout(install,300);setTimeout(install,1000);setTimeout(install,2000);
})();