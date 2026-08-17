(function(){
  'use strict';
  if(window.__pbaCadExport)return; window.__pbaCadExport=1;
  const status=s=>{const e=document.getElementById('status');if(e)e.textContent=s};
  const download=(blob,name)=>{const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(u);a.remove()},1000)};
  const esc=s=>String(s??'').replace(/\\/g,'/').replace(/[\r\n]+/g,' ');
  const pt=25.4/72;
  const ent=(type,layer,body)=>`0\n${type}\n8\n${layer}\n${body}`;
  function header(){return '0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1015\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n5\n'+['PDF_LINE','PDF_TEXT','PDF_PAGE','PDF_PATH','PDF_IMAGE'].map((l,i)=>`0\nLAYER\n2\n${l}\n70\n0\n62\n${i+1}\n6\nCONTINUOUS\n`).join('')+'0\nENDTAB\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n'}
  function pageLines(opList,w,h){
    let out='';
    for(const op of opList||[]){
      if(op.fn==='strokeLine'&&op.args){const [x1,y1,x2,y2]=op.args.map(Number);if([x1,y1,x2,y2].every(Number.isFinite))out+=ent('LINE','PDF_LINE',`10\n${(x1*pt).toFixed(6)}\n20\n${((h-y1)*pt).toFixed(6)}\n11\n${(x2*pt).toFixed(6)}\n21\n${((h-y2)*pt).toFixed(6)}\n`)}
    }
    return out;
  }
  async function exportSourcePdfToDxf(){
    if(!window.__pbaGetPdf){alert('请先打开 PDF 图纸；当前版本尚未把 PDF 引擎暴露给 CAD 转换器。');return}
    const pdf=window.__pbaGetPdf();if(!pdf)throw new Error('PDF 尚未加载');
    let d=header();
    for(let n=1;n<=pdf.numPages;n++){
      const page=await pdf.getPage(n), vp=page.getViewport({scale:1}), w=vp.width, h=vp.height;
      d+=ent('TEXT','PDF_PAGE',`10\n0\n20\n${((h)*pt).toFixed(6)}\n40\n3\n1\nPAGE ${n}\n`);
      try{
        const tc=await page.getTextContent();
        for(const item of (tc.items||[])){
          if(!item.str)continue;const t=item.transform||[1,0,0,1,0,0];
          const x=Number(t[4])*pt,y=(h-Number(t[5]))*pt,size=Math.max(.5,Math.abs(Number(t[3]||t[0]||10))*pt);
          d+=ent('TEXT','PDF_TEXT',`10\n${x.toFixed(6)}\n20\n${y.toFixed(6)}\n40\n${size.toFixed(6)}\n1\n${esc(item.str)}\n`);
        }
      }catch(e){console.warn('text extraction',e)}
      try{
        const op=await page.getOperatorList();d+=pageLines(op.fnArray.map((fn,i)=>({fn,args:op.argsArray[i]})),w,h);
      }catch(e){console.warn('vector extraction',e)}
      const W=w*pt,H=h*pt;d+=ent('LINE','PDF_PAGE',`10\n0\n20\n0\n11\n${W.toFixed(6)}\n21\n0\n`)+ent('LINE','PDF_PAGE',`10\n${W.toFixed(6)}\n20\n0\n11\n${W.toFixed(6)}\n21\n${H.toFixed(6)}\n`)+ent('LINE','PDF_PAGE',`10\n${W.toFixed(6)}\n20\n${H.toFixed(6)}\n11\n0\n21\n${H.toFixed(6)}\n`)+ent('LINE','PDF_PAGE',`10\n0\n20\n${H.toFixed(6)}\n11\n0\n21\n0\n`);
    }
    d+='0\nENDSEC\n0\nEOF\n';
    const base=(window.sourceName||'drawing.pdf').replace(/\.pdf$/i,'');download(new Blob([d],{type:'application/dxf'}),base+' - CAD 1to1.dxf');status('PDF → DXF 1:1 已导出');
  }
  function add(){const p=document.querySelector('.workspace .panel');if(!p||document.querySelector('.pba-cad-box'))return;const box=document.createElement('div');box.className='component-box pba-cad-box';box.innerHTML='<h4>PDF → CAD（1:1）</h4><div class="component-grid"><button class="component-btn" id="pbaExportDxf"><b>📐 PDF → DXF</b><small>源图纸 / 1:1 / 矢量优先</small></button><button class="component-btn" id="pbaExportDwg"><b>🏗 DXF → DWG</b><small>下一阶段接入离线转换引擎</small></button></div>';p.appendChild(box);document.getElementById('pbaExportDxf').onclick=()=>exportSourcePdfToDxf().catch(e=>alert('PDF→DXF 失败：'+e.message));document.getElementById('pbaExportDwg').onclick=()=>alert('DWG 转换将在 DXF 1:1 验证通过后接入。')}
  window.PBACadExport={exportSourcePdfToDxf};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add);else setTimeout(add,300);
})();
