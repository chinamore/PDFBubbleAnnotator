(function(){
'use strict';
if(window.__pbaCadExport)return;window.__pbaCadExport=1;
const status=s=>{const e=document.getElementById('status');if(e)e.textContent=s};
const download=(blob,name)=>{const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(u);a.remove()},1000)};
const esc=s=>String(s??'').replace(/\\/g,'/').replace(/[\r\n]+/g,' '),pt=25.4/72;
const ent=(t,l,b)=>`0\n${t}\n8\n${l}\n${b}`;
function getPdf(){try{return typeof pdf!=='undefined'?pdf:null}catch(_){return null}}
function getName(){try{return typeof sourceName!=='undefined'&&sourceName?sourceName:'drawing.pdf'}catch(_){return'drawing.pdf'}}
function header(){return '0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1015\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n5\n'+['PDF_LINE','PDF_TEXT','PDF_PAGE','PDF_PATH','PDF_IMAGE'].map((l,i)=>`0\nLAYER\n2\n${l}\n70\n0\n62\n${i+1}\n6\nCONTINUOUS\n`).join('')+'0\nENDTAB\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n'}
async function exportSourcePdfToDxf(){
 const doc=getPdf();if(!doc){alert('请先打开 PDF 图纸');return}
 let d=header();
 for(let n=1;n<=doc.numPages;n++){
  const page=await doc.getPage(n),v=page.getViewport({scale:1}),w=v.width,h=v.height,W=w*pt,H=h*pt;
  d+=ent('TEXT','PDF_PAGE',`10\n0\n20\n${H.toFixed(6)}\n40\n3\n1\nPAGE ${n}\n`);
  try{const tc=await page.getTextContent();for(const item of(tc.items||[])){if(!item.str)continue;const t=item.transform||[1,0,0,1,0,0],x=Number(t[4])*pt,y=(h-Number(t[5]))*pt,s=Math.max(.5,Math.abs(Number(t[3]||t[0]||10))*pt);d+=ent('TEXT','PDF_TEXT',`10\n${x.toFixed(6)}\n20\n${y.toFixed(6)}\n40\n${s.toFixed(6)}\n1\n${esc(item.str)}\n`)}}catch(e){console.warn('text extraction',e)}
  d+=ent('LINE','PDF_PAGE',`10\n0\n20\n0\n11\n${W.toFixed(6)}\n21\n0\n`)+ent('LINE','PDF_PAGE',`10\n${W.toFixed(6)}\n20\n0\n11\n${W.toFixed(6)}\n21\n${H.toFixed(6)}\n`)+ent('LINE','PDF_PAGE',`10\n${W.toFixed(6)}\n20\n${H.toFixed(6)}\n11\n0\n21\n${H.toFixed(6)}\n`)+ent('LINE','PDF_PAGE',`10\n0\n20\n${H.toFixed(6)}\n11\n0\n21\n0\n`);
 }
 d+='0\nENDSEC\n0\nEOF\n';const base=getName().replace(/\.pdf$/i,'');download(new Blob([d],{type:'application/dxf'}),base+' - CAD 1to1.dxf');status('PDF → DXF 1:1 已导出');
}
function add(){const p=document.querySelector('.workspace .panel');if(!p||document.querySelector('.pba-cad-box'))return;const b=document.createElement('div');b.className='component-box pba-cad-box';b.innerHTML='<h4>PDF → CAD（1:1）</h4><div class="component-grid"><button class="component-btn" id="pbaExportDxf"><b>📐 PDF → DXF</b><small>源图纸 / 1:1 / 文字可编辑</small></button><button class="component-btn" id="pbaExportDwg"><b>🏗 DXF → DWG</b><small>下一阶段接入离线转换引擎</small></button></div>';p.appendChild(b);document.getElementById('pbaExportDxf').onclick=()=>exportSourcePdfToDxf().catch(e=>alert('PDF→DXF失败：'+e.message));document.getElementById('pbaExportDwg').onclick=()=>alert('DWG 转换将在 DXF 1:1 验证通过后接入。')}
window.PBACadExport={exportSourcePdfToDxf};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add);else setTimeout(add,300);
})();
