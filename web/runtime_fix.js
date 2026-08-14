(function(){
  'use strict';
  function install(){
    const list=document.getElementById('annList');
    if(list){
      const style=document.createElement('style');
      style.id='runtime-list-limit';
      style.textContent='#annList .item:nth-child(n+11){display:none!important;}';
      if(!document.getElementById(style.id)) document.head.appendChild(style);
    }

    function rgb(c){
      let h=(c||'#ef3340').replace('#','');
      if(h.length===3) h=h.split('').map(x=>x+x).join('');
      return PDFLib.rgb(parseInt(h.slice(0,2),16)/255,parseInt(h.slice(2,4),16)/255,parseInt(h.slice(4,6),16)/255);
    }

    async function buildPdfBytesFixed(){
      const doc=await PDFLib.PDFDocument.load(buf.slice(0));
      const font=await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
      const pages=doc.getPages();
      ann.forEach(a=>{
        const p=pages[a.page-1];
        if(!p) return;
        const w=p.getWidth(), h=p.getHeight();
        const x=(Number(a.nx)||0)*w;
        const y=(1-(Number(a.ny)||0))*h;
        const k=baseScale;
        const wantedDiameter=Math.max(0,Number(a.size)||28)/k;
        const borderWidth=Math.max(0,Number(a.border)||2)/k;
        // CSS uses box-sizing:border-box, so the configured size is the OUTER diameter.
        // pdf-lib centers the stroke on the circle path, therefore subtract one border width
        // from the path diameter so the final painted outer diameter matches the UI size.
        const pathDiameter=Math.max(0,wantedDiameter-borderWidth);
        p.drawCircle({
          x,y,size:pathDiameter,
          borderWidth,
          borderColor:rgb(a.outerColor),
          color:a.isTransparent?undefined:rgb(a.innerColor),
          opacity:a.isTransparent?undefined:(a.opacity==null?1:Number(a.opacity))
        });
        const fs=Math.max(1,(Number(a.fontSize)||13)/k);
        const text=String(a.text||'');
        const tw=font.widthOfTextAtSize(text,fs);
        p.drawText(text,{x:x-tw/2,y:y-fs*0.34,size:fs,font,color:rgb(a.fontColor)});
      });
      return await doc.save();
    }

    function replaceButton(id,handler){
      const old=document.getElementById(id);
      if(!old) return;
      const fresh=old.cloneNode(true);
      old.replaceWith(fresh);
      fresh.addEventListener('click',handler);
    }

    replaceButton('save',async function(){
      if(!pdf||!buf) return alert('请先打开 PDF 图纸');
      try{
        setStatus('正在导出 PDF…');
        const bytes=await buildPdfBytesFixed();
        const name=sourceName.replace(/\.[^.]+$/i,'')+' - Annotated.pdf';
        downloadBlob(new Blob([bytes],{type:'application/pdf'}),name);
        setStatus('PDF 导出完成（尺寸已锁定）');
      }catch(e){
        console.error(e); alert('PDF 导出失败：'+e.message); setStatus('PDF 导出失败');
      }
    });

    replaceButton('print',async function(){
      if(!pdf||!buf) return alert('请先打开 PDF 图纸');
      try{
        setStatus('正在生成打印 PDF…');
        const bytes=await buildPdfBytesFixed();
        if(nativeBridge&&nativeBridge.printPdf){
          nativeBridge.printPdf(bytesToBase64(bytes),sourceName.replace(/\.[^.]+$/i,'')+' - Print.pdf');
        }else{
          const c=await makePageCanvas(pageNo,2),url=c.toDataURL('image/png'),w=window.open('','_blank','width=1000,height=800');
          if(!w) throw new Error('打印窗口被阻止，请允许弹窗');
          w.document.write('<html><body style="margin:0;text-align:center"><img src="'+url+'" style="max-width:100%" onload="window.print();"></body></html>');
          w.document.close();
        }
      }catch(e){console.error(e);alert('打印失败：'+e.message);setStatus('打印失败')}
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0));
  else setTimeout(install,0);
})();
