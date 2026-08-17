(function(){
  'use strict';
  if(window.__pbaCadExport)return; window.__pbaCadExport=1;
  const status=s=>{const e=document.getElementById('status');if(e)e.textContent=s};
  const download=(blob,name)=>{const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(u);a.remove()},1000)};
  const esc=s=>String(s??'').replace(/\\/g,'/').replace(/[\r\n]+/g,' ');
  function ent(type,layer,body){return `0\n${type}\n8\n${layer}\n${body}`}
  function dxfForAllPages(){
    if(!window.pdf||!Array.isArray(window.ann)){alert('请先打开 PDF 并添加标注');return}
    const W=1000,H=700; let d='0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1015\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n6\n';
    const layers=['PBA_BUBBLE','PBA_TEXT','PBA_CLOUD','PBA_LEADER','PBA_MEASURE','PBA_PAGE'];
    layers.forEach((l,i)=>{d+=`0\nLAYER\n2\n${l}\n70\n0\n62\n${i+1}\n6\nCONTINUOUS\n`});
    d+='0\nENDTAB\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n';
    const annotations=window.ann||[];
    for(let page=1;page<=(window.pdf.numPages||1);page++){
      d+=ent('TEXT','PBA_PAGE',`10\n20\n${H-20}\n40\n8\n1\nPAGE ${page}`);
      annotations.filter(a=>Number(a.page)===page).forEach(a=>{
        const x=Number(a.nx||0)*W, y=(1-Number(a.ny||0))*H;
        const r=Math.max(2,Number(a.size||28))/2;
        const font=Math.max(2,Number(a.font||13));
        d+=ent('CIRCLE','PBA_BUBBLE',`10\n${x.toFixed(3)}\n20\n${y.toFixed(3)}\n40\n${r.toFixed(3)}\n`);
        d+=ent('TEXT','PBA_TEXT',`10\n${x.toFixed(3)}\n20\n${(y-font*0.35).toFixed(3)}\n40\n${font.toFixed(3)}\n72\n1\n11\n${x.toFixed(3)}\n21\n${y.toFixed(3)}\n1\n${esc(a.text||'')}\n`);
        if(a.type==='leader' && Number.isFinite(Number(a.x2))){d+=ent('LINE','PBA_LEADER',`10\n${x.toFixed(3)}\n20\n${y.toFixed(3)}\n11\n${(Number(a.x2)*W).toFixed(3)}\n21\n${((1-Number(a.y2))*H).toFixed(3)}\n`)}
      });
    }
    d+='0\nENDSEC\n0\nEOF\n';
    const base=(window.sourceName||'drawing.pdf').replace(/\.pdf$/i,'');
    download(new Blob([d],{type:'application/dxf'}),base+' - Annotations.dxf');
    status('全部页面标注已导出为 DXF');
  }
  function openDwgHelp(){
    alert('DWG 导出说明：DXF 是开放的 CAD 交换格式，本软件先生成完整矢量 DXF。DWG 为专有二进制格式，下一阶段通过离线 CAD 转换引擎将 DXF 转为 DWG，避免把不完整的 DXF 冒充 DWG。');
  }
  function add(){
    const p=document.querySelector('.workspace .panel'); if(!p||document.querySelector('.pba-cad-box'))return;
    const box=document.createElement('div');box.className='component-box pba-cad-box';
    box.innerHTML='<h4>CAD 导出</h4><div class="component-grid"><button class="component-btn" id="pbaExportDxf"><b>📐 全部标注 → DXF</b><small>所有页面 / 图层分类</small></button><button class="component-btn" id="pbaExportDwg"><b>🏗 DXF → DWG</b><small>CAD 常用 DWG（下一阶段）</small></button></div>';
    p.appendChild(box);document.getElementById('pbaExportDxf').onclick=dxfForAllPages;document.getElementById('pbaExportDwg').onclick=openDwgHelp;
  }
  window.PBACadExport={dxfForAllPages};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add);else setTimeout(add,300);
})();
