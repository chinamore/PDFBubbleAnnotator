/* FreeCAD-style shell for PDFBubbleAnnotator.
 * Important: this file only rearranges existing DOM nodes and routes menu commands.
 * It deliberately does not replace the legacy bubble annotation DOM or event handlers.
 */
(function(){
'use strict';
if(window.__freecadShellInstalled)return;
window.__freecadShellInstalled=true;

const $=id=>document.getElementById(id);
const click=id=>{const e=$(id); if(e) e.click();};
const setText=(id,text)=>{const e=$(id);if(e)e.textContent=text;};

const css=document.createElement('style');
css.textContent=`
:root{--fc-bg:#e8eaed;--fc-panel:#f4f4f4;--fc-border:#c7cbd1;--fc-blue:#3b78b4;--fc-menu:#fff;--fc-hover:#e7f0fa;--fc-dark:#39434d}
body{background:var(--fc-bg)!important;color:#20252b!important}
.app{grid-template-rows:30px 34px 40px 1fr 22px!important}
.fc-menubar{display:flex;align-items:center;background:#e9eaec;border-bottom:1px solid #b8bdc4;padding:0 6px;gap:1px;z-index:1000;font-size:13px}
.fc-menu{position:relative}.fc-menu>button{border:0;background:transparent;border-radius:2px;padding:5px 9px;color:#222;cursor:pointer}.fc-menu>button:hover,.fc-menu.open>button{background:#d5e4f3}
.fc-dropdown{display:none;position:absolute;top:29px;left:0;min-width:230px;background:#fff;border:1px solid #aeb4bc;box-shadow:0 5px 18px #0003;padding:4px 0;z-index:2000}
.fc-menu.open .fc-dropdown{display:block}.fc-item{display:flex;align-items:center;gap:10px;padding:6px 18px 6px 10px;white-space:nowrap;cursor:pointer}.fc-item:hover{background:#e5eff9}.fc-item .shortcut{margin-left:auto;color:#7a8088;font-size:11px}.fc-sep{height:1px;background:#e2e5e8;margin:4px 0}.fc-disabled{color:#9aa0a8!important}
.fc-workbench{display:flex;align-items:center;background:#f5f5f6;border-bottom:1px solid #c8ccd1;padding:3px 7px;gap:7px}.fc-wb-label{font-size:11px;color:#555}.fc-workbench select{height:28px;min-width:185px;border:1px solid #aeb4bc;background:#fff;border-radius:2px;padding:2px 7px}.fc-doc{margin-left:8px;color:#5b6168;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fc-toolbar{display:flex;align-items:center;gap:3px;background:#e3e5e8;border-bottom:1px solid #bfc4ca;padding:3px 6px;overflow-x:auto;white-space:nowrap}.fc-toolbar .ribbon{display:contents}.fc-toolbar .rgroup{border-right:1px solid #c1c5ca;padding-right:6px}.fc-toolbar button{border:1px solid transparent!important;background:transparent!important;border-radius:2px!important;padding:5px 8px!important;color:#222!important}.fc-toolbar button:hover{background:#d5e4f3!important;border-color:#b4c7da!important}.fc-toolbar button.primary{background:#dbeafa!important;color:#174d78!important;border-color:#aac5df!important}.fc-toolbar button.success{background:#e3f0e5!important;color:#24623b!important;border-color:#b5cfba!important}
.workspace{grid-template-columns:255px minmax(0,1fr) 300px!important;background:#bfc4ca!important}.panel{background:#f5f5f5!important}.panel-title{background:#e7e8ea!important;border-bottom:1px solid #c5c8cc!important;font-weight:600}.section{border-bottom:1px solid #d6d8db!important}.center{background:#cfd2d6!important}.canvasbar{background:#4b5662!important;height:30px!important}.status{background:#e6e7e9!important;color:#4d535a!important;border-top:1px solid #c1c4c8}
.fc-left-tabs{display:flex;border-bottom:1px solid #c6c9cd;background:#e7e8ea}.fc-left-tabs button{flex:1;border:0;border-radius:0;background:transparent;padding:7px 3px;font-size:11px}.fc-left-tabs button.active{background:#fff;border-bottom:2px solid var(--fc-blue);color:#245f91}.fc-tree{padding:6px 8px;font-size:12px;color:#39414a}.fc-tree-row{padding:4px 2px}.fc-tree-row::before{content:'▸';display:inline-block;width:15px;color:#68717b}.fc-tree-row.open::before{content:'▾'}
.fc-overlay-title{font-weight:600;color:#40464d}
`;
document.head.appendChild(css);

function menuItem(label,fn,shortcut,disabled){
 const d=document.createElement('div');d.className='fc-item'+(disabled?' fc-disabled':'');d.innerHTML=`<span>${label}</span>${shortcut?`<span class="shortcut">${shortcut}</span>`:''}`;
 if(!disabled)d.addEventListener('click',()=>{closeMenus();try{fn&&fn()}catch(e){console.error(e)}});
 return d;
}
function separator(){const d=document.createElement('div');d.className='fc-sep';return d;}
function makeMenu(label,items){
 const wrap=document.createElement('div');wrap.className='fc-menu';
 const b=document.createElement('button');b.textContent=label;wrap.appendChild(b);
 const dd=document.createElement('div');dd.className='fc-dropdown';items.forEach(x=>dd.appendChild(x));wrap.appendChild(dd);
 b.addEventListener('click',e=>{e.stopPropagation();document.querySelectorAll('.fc-menu').forEach(m=>m!==wrap&&m.classList.remove('open'));wrap.classList.toggle('open')});
 return wrap;
}
function closeMenus(){document.querySelectorAll('.fc-menu.open').forEach(m=>m.classList.remove('open'));}
document.addEventListener('click',closeMenus);

const bar=document.createElement('div');bar.className='fc-menubar';bar.id='freecadMenuBar';
bar.appendChild(makeMenu('文件',[menuItem('新建文档',()=>{setStatusSafe('新建文档');}),menuItem('打开…',()=>click('openBtn'),'Ctrl+O'),menuItem('保存',()=>click('save'),'Ctrl+S'),menuItem('导出 PDF',()=>click('save')),menuItem('导出 PNG',()=>click('png')),separator(),menuItem('打印…',()=>click('print'),'Ctrl+P'),separator(),menuItem('退出',()=>window.close())]));
bar.appendChild(makeMenu('编辑',[menuItem('撤销',()=>click('undo'),'Ctrl+Z'),menuItem('重做',()=>click('redo'),'Ctrl+Y'),separator(),menuItem('删除',()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'Delete'})),'Delete'),menuItem('清空标注',()=>click('clear')),separator(),menuItem('首选项…',()=>setStatusSafe('首选项功能将在后续版本加入'))]));
bar.appendChild(makeMenu('视图',[menuItem('放大',()=>click('zoomIn'),'+'),menuItem('缩小',()=>click('zoomOut'),'-'),menuItem('适合窗口',()=>click('zoomFit'),'V,F'),separator(),menuItem('上一页',()=>click('prev')),menuItem('下一页',()=>click('next')),separator(),menuItem('左侧面板',()=>togglePanel(0)),menuItem('右侧面板',()=>togglePanel(1))]));
bar.appendChild(makeMenu('Sketcher',[menuItem('进入 Sketcher 工作台',()=>selectWorkbench('Sketcher')),menuItem('选择',()=>sketchTool('select')),separator(),menuItem('创建点',()=>sketchTool('point')),menuItem('创建直线',()=>sketchTool('line')),menuItem('创建连续线',()=>sketchTool('polyline')),menuItem('创建圆',()=>sketchTool('circle')),menuItem('创建圆弧',()=>sketchTool('arc')),menuItem('创建矩形',()=>sketchTool('rectangle')),separator(),menuItem('水平约束',()=>sketchConstraint('horizontal')),menuItem('垂直约束',()=>sketchConstraint('vertical')),menuItem('重合约束',()=>sketchConstraint('coincident')),menuItem('距离约束',()=>sketchConstraint('distance')),menuItem('半径约束',()=>sketchConstraint('radius')),menuItem('角度约束',()=>sketchConstraint('angle')),separator(),menuItem('构造几何',()=>sketchCommand('construction')),menuItem('撤销',()=>click('undo'),'Ctrl+Z'),menuItem('重做',()=>click('redo'),'Ctrl+Y'))]));
bar.appendChild(makeMenu('Part',[menuItem('零件工作台',()=>selectWorkbench('Part')),menuItem('导入 CAD',()=>click('openBtn')),menuItem('测量',()=>setStatusSafe('Part / Measure'))]));
bar.appendChild(makeMenu('Part Design',[menuItem('Part Design 工作台',()=>selectWorkbench('Part Design')),menuItem('创建草图',()=>selectWorkbench('Sketcher')),menuItem('特征',()=>setStatusSafe('Part Design feature'))]));
bar.appendChild(makeMenu('Draft',[menuItem('Draft 工作台',()=>selectWorkbench('Draft')),menuItem('线',()=>sketchTool('line')),menuItem('圆',()=>sketchTool('circle')),menuItem('矩形',()=>sketchTool('rectangle')),menuItem('文字',()=>sketchTool('text'))]));
bar.appendChild(makeMenu('TechDraw',[menuItem('TechDraw 工作台',()=>selectWorkbench('TechDraw')),menuItem('导出 PDF',()=>click('save')),menuItem('打印',()=>click('print'))]));
bar.appendChild(makeMenu('工具',[menuItem('气泡标注工作台',()=>selectWorkbench('PDF Annotator')),menuItem('测量工具',()=>setStatusSafe('测量工作台')),menuItem('转换工具',()=>setStatusSafe('转换工作台')),separator(),menuItem('快捷键',()=>setStatusSafe('快捷键设置将在后续版本加入')),menuItem('自定义…',()=>setStatusSafe('自定义工作台将在后续版本加入'))]));
bar.appendChild(makeMenu('窗口',[menuItem('模型',()=>showLeftTab(0)),menuItem('任务',()=>showLeftTab(1)),separator(),menuItem('属性',()=>showRight(true)),menuItem('隐藏属性',()=>showRight(false))]));
bar.appendChild(makeMenu('帮助',[menuItem('关于 PDFBubbleAnnotator',()=>alert('PDFBubbleAnnotator\nFreeCAD 风格工程工作台')),menuItem('Sketcher 帮助',()=>setStatusSafe('Sketcher：几何、约束、捕捉与参数化草图'))]));

const wb=document.createElement('div');wb.className='fc-workbench';wb.id='freecadWorkbench';
wb.innerHTML='<span class="fc-wb-label">工作台：</span>';
const select=document.createElement('select');select.id='workbenchSelector';['PDF Annotator','Sketcher','Part','Part Design','Draft','TechDraw'].forEach(x=>{const o=document.createElement('option');o.value=x;o.textContent=x;select.appendChild(o)});wb.appendChild(select);
const doc=document.createElement('span');doc.className='fc-doc';doc.id='fcDocumentTitle';doc.textContent='无活动文档';wb.appendChild(doc);
select.addEventListener('change',()=>selectWorkbench(select.value));

const oldRibbon=document.querySelector('.ribbon');
if(oldRibbon){oldRibbon.classList.add('fc-toolbar');oldRibbon.parentElement.insertBefore(bar,oldRibbon.parentElement.firstChild);oldRibbon.parentElement.insertBefore(wb,oldRibbon);}

function setStatusSafe(s){const e=$('status');if(e)e.textContent=s;}
function selectWorkbench(name){select.value=name;const isSketch=name==='Sketcher';document.body.classList.toggle('sketch-on',isSketch);const navSketch=$('navSketcher'),navBubble=$('navBubble');if(navSketch)navSketch.classList.toggle('active',isSketch);if(navBubble)navBubble.classList.toggle('active',!isSketch);const bt=$('bubbleTools');if(bt)bt.style.opacity=isSketch?'0.55':'1';setStatusSafe(name+' 工作台');if(isSketch) sketchCommand('enter');else if(window.exitSketcher)try{window.exitSketcher()}catch(e){}}
function sketchTool(name){selectWorkbench('Sketcher');if(window.PBADrawingSuite&&typeof window.PBADrawingSuite.setTool==='function')window.PBADrawingSuite.setTool(name);else if(window.setSketchTool)window.setSketchTool(name);else document.dispatchEvent(new CustomEvent('pba-sketch-tool',{detail:{tool:name}}));setStatusSafe('Sketcher：'+name)}
function sketchConstraint(name){selectWorkbench('Sketcher');document.dispatchEvent(new CustomEvent('pba-sketch-constraint',{detail:{constraint:name}}));setStatusSafe('Sketcher 约束：'+name)}
function sketchCommand(name){selectWorkbench('Sketcher');document.dispatchEvent(new CustomEvent('pba-sketch-command',{detail:{command:name}}));}
function togglePanel(which){const panels=document.querySelectorAll('.workspace>.panel');if(panels[which])panels[which].style.display=panels[which].style.display==='none'?'':'none'}
function showLeftTab(i){const p=document.querySelector('.workspace>.panel:first-child');if(!p)return;setStatusSafe(i===0?'模型':'任务')}
function showRight(v){const panels=document.querySelectorAll('.workspace>.panel');if(panels[2])panels[2].style.display=v?'':'none'}
window.freecadWorkbench=selectWorkbench;

// Rename the existing legacy navigation without removing its handlers.
if($('navBubble'))$('navBubble').textContent='气泡标注';
if($('navSketcher'))$('navSketcher').textContent='Sketcher';
const fi=$('fileInfo');if(fi)new MutationObserver(()=>{const t=fi.textContent||'';if(t&&t!=='未打开图纸')doc.textContent=t}).observe(fi,{childList:true,subtree:true,characterData:true});
})();
