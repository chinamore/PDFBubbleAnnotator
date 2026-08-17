(function(){
  if(window.__pbaFeatureSuite)return; window.__pbaFeatureSuite=1;
  const $=id=>document.getElementById(id);
  const status=s=>{const e=$('status');if(e)e.textContent=s};
  const click=id=>{const e=$(id);if(e)e.click()};
  function downloadBlob(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)}
  async function allPagesText(){
    if(!window.pdf){alert('请先打开 PDF 图纸');return null}
    let out=[];
    for(let i=1;i<=pdf.numPages;i++){
      const p=await pdf.getPage(i), c=await p.getTextContent();
      out.push({page:i,text:c.items.map(x=>x.str).join(' ')});
    }
    return out;
  }
  async function extractText(){
    try{status('正在提取全部页面文字…');const rows=await allPagesText();if(!rows)return;
      const txt=rows.map(r=>`--- Page ${r.page} ---\n${r.text}`).join('\n\n');
      downloadBlob(new Blob(['\ufeff'+txt],{type:'text/plain;charset=utf-8'}),(sourceName||'document.pdf').replace(/\.pdf$/i,'')+' - Text.txt');
      status('文字提取完成');
    }catch(e){console.error(e);alert('文字提取失败：'+e.message);status('文字提取失败')}
  }
  function exportAnnotationJson(){
    if(!window.pdf){alert('请先打开 PDF 图纸');return}
    const data={version:'0.4',source:window.sourceName||'document.pdf',pages:pdf.numPages,annotations:window.ann||[]};
    downloadBlob(new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}),(sourceName||'document.pdf').replace(/\.pdf$/i,'')+' - Annotations.json');
    status('标注数据已导出');
  }
  async function splitPdf(){
    if(!window.pdf||!window.buf||!window.PDFLib){alert('请先打开 PDF 图纸');return}
    try{status('正在分图…');const src=await PDFLib.PDFDocument.load(buf.slice(0));
      for(let i=0;i<src.getPageCount();i++){const out=await PDFLib.PDFDocument.create();const [p]=await out.copyPages(src,[i]);out.addPage(p);const bytes=await out.save();downloadBlob(new Blob([bytes],{type:'application/pdf'}),`${(sourceName||'document.pdf').replace(/\.pdf$/i,'')}-${String(i+1).padStart(3,'0')}.pdf`);await new Promise(r=>setTimeout(r,80));}
      status('分图完成：'+src.getPageCount()+' 页');
    }catch(e){console.error(e);alert('分图失败：'+e.message);status('分图失败')}
  }
  async function comparePages(){
    if(!window.pdf){alert('请先打开 PDF 图纸');return}
    const other=prompt('输入要对比的页码（1-'+pdf.numPages+'）',String(Math.min(pdf.numPages,pageNo+1))); if(!other)return;
    const n=Math.max(1,Math.min(pdf.numPages,parseInt(other,10)||1));
    try{
      const [a,b]=await Promise.all([pdf.getPage(pageNo),pdf.getPage(n)]), sc=1.2;
      const va=a.getViewport({scale:sc}),vb=b.getViewport({scale:sc});
      const wrap=document.createElement('div');wrap.style='position:fixed;inset:5%;z-index:9999;background:#0f1d32;padding:12px;border-radius:10px;box-shadow:0 20px 60px #0008;overflow:auto';
      wrap.innerHTML=`<div style="display:flex;justify-content:space-between;color:white;margin-bottom:8px"><b>图纸对比：第 ${pageNo} 页 ↔ 第 ${n} 页</b><button id="pbaCloseCompare">关闭</button></div><div style="display:flex;gap:12px;align-items:flex-start"></div>`;
      document.body.appendChild(wrap);wrap.querySelector('#pbaCloseCompare').onclick=()=>wrap.remove();const row=wrap.lastElementChild;
      for(const [p,v,label] of [[a,va,pageNo],[b,vb,n]]){const c=document.createElement('canvas');c.width=Math.ceil(v.width);c.height=Math.ceil(v.height);c.style='background:white;max-width:48%;height:auto';await p.render({canvasContext:c.getContext('2d'),viewport:v}).promise;const box=document.createElement('div');box.style='color:white;min-width:45%';box.innerHTML=`<div style="margin-bottom:4px">第 ${label} 页</div>`;box.appendChild(c);row.appendChild(box)}
      status('已打开图纸对比');
    }catch(e){console.error(e);alert('对比失败：'+e.message)}
  }
  function findText(){
    if(!window.pdf){alert('请先打开 PDF 图纸');return}
    const q=prompt('查找文字：');if(!q)return;
    (async()=>{try{status('正在查找：'+q);let hits=[];for(let i=1;i<=pdf.numPages;i++){const p=await pdf.getPage(i),c=await p.getTextContent(),text=c.items.map(x=>x.str).join(' ');if(text.toLowerCase().includes(q.toLowerCase()))hits.push(i)}alert(hits.length?`找到 ${hits.length} 页：${hits.join(', ')}`:'没有找到匹配文字');status('查找完成')}catch(e){alert('查找失败：'+e.message)}})();
  }
  function stats(){if(!window.pdf){alert('请先打开 PDF 图纸');return}const bubbles=(window.ann||[]).length;alert(`图纸统计\n页数：${pdf.numPages}\n气泡：${bubbles}\n当前页：${pageNo}`)}
  function exportDxf(){
    if(!window.pdf){alert('请先打开 PDF 图纸');return}
    const W=1000,H=700;let d='0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n';
    (window.ann||[]).forEach(a=>{if(Number(a.page)!==Number(pageNo))return;const x=Number(a.nx||0)*W,y=(1-Number(a.ny||0))*H,r=Math.max(1,Number(a.size||28));d+=`0\nCIRCLE\n8\nBUBBLE\n10\n${x.toFixed(3)}\n20\n${y.toFixed(3)}\n40\n${(r/2).toFixed(3)}\n`;d+=`0\nTEXT\n8\nBUBBLE_TEXT\n10\n${x.toFixed(3)}\n20\n${y.toFixed(3)}\n40\n${Math.max(2,Number(a.font||13))}\n1\n${String(a.text||'').replace(/\n/g,' ')}\n`;});
    d+='0\nENDSEC\n0\nEOF\n';downloadBlob(new Blob([d],{type:'application/dxf'}),(sourceName||'document.pdf').replace(/\.pdf$/i,'')+` - Page ${pageNo} Annotations.dxf`);status('DXF 标注已导出');
  }
  function addComponentUI(){
    const p=document.querySelector('.workspace .panel');if(!p)return;
    const box=document.createElement('div');box.className='component-box pba-feature-box';
    box.innerHTML='<h4>工程效率</h4><div class="component-grid">'+
      '<button class="component-btn" data-f="split"><b>✂ 一键分图</b><small>按页拆分 PDF</small></button>'+
      '<button class="component-btn" data-f="batch"><b>📦 批量导出</b><small>整本 PDF 转图片</small></button>'+
      '<button class="component-btn" data-f="text"><b>🔤 文字提取</b><small>全部页面文字</small></button>'+
      '<button class="component-btn" data-f="find"><b>🔎 区域查找</b><small>快速查找文字</small></button>'+
      '<button class="component-btn" data-f="json"><b>↗ 导入导出</b><small>保存标注数据</small></button>'+
      '<button class="component-btn" data-f="compare"><b>⇄ 图纸对比</b><small>双页并排查看</small></button>'+
      '<button class="component-btn" data-f="stats"><b>🔢 数量统计</b><small>页数与标注汇总</small></button>'+
      '<button class="component-btn" data-f="cad"><b>📐 PDF→CAD</b><small>导出标注 DXF</small></button>'+
      '</div>';
    p.appendChild(box);
    box.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{const f=b.dataset.f;if(f==='split')splitPdf();else if(f==='batch')click('batchPng');else if(f==='text')extractText();else if(f==='find')findText();else if(f==='json')exportAnnotationJson();else if(f==='compare')comparePages();else if(f==='stats')stats();else if(f==='cad')exportDxf();});
  }
  window.PBAFeatureSuite={addComponentUI,extractText,splitPdf,comparePages,findText,stats,exportAnnotationJson,exportDxf};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addComponentUI);else setTimeout(addComponentUI,500);
})();
