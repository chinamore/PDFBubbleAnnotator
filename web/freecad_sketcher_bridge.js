/* Bridge between the FreeCAD-style workbench and the isolated Sketcher engine. */
(() => {
  'use strict';
  if (window.__pbaFreeCADSketcherBridge) return;
  window.__pbaFreeCADSketcherBridge = true;
  const legacyTool={select:'select',point:'point',line:'line',polyline:'polyline',rectangle:'rectangle',circle:'circle',arc:'arc',dimension:'dimension',construction:'construction',undo:'undo',redo:'redo',clear:'clear'};
  const status=t=>{const e=document.getElementById('status');if(e)e.textContent=t;};
  function command(name){
    if(legacyTool[name]){const b=document.querySelector(`#sketcherPanel [data-sk="${name}"]`);if(b){b.click();return true;}}
    if(name==='enter'){if(window.PBABSketcher?.open)window.PBABSketcher.open();return true;}
    status('Sketcher：'+name+' 已进入工作台，等待对应几何命令实现');
    document.dispatchEvent(new CustomEvent('pba-sketch-command',{detail:{command:name}}));
    return false;
  }
  function constraint(name){document.dispatchEvent(new CustomEvent('pba-sketch-constraint',{detail:{constraint:name}}));status('Sketcher 约束：'+name+'（选择几何后应用）');}
  function setOption(name,value){document.dispatchEvent(new CustomEvent('pba-sketch-option',{detail:{name,value}}));}
  window.PBABSketcher=window.PBABSketcher||{};window.PBABSketcher.command=command;window.PBABSketcher.constraint=constraint;window.PBABSketcher.setOption=setOption;
  const sync=()=>{const s=document.getElementById('workbenchSelector');const active=!!s&&s.value==='Sketcher';if(window.PBAFreeCADSketcherWorkbench)window.PBAFreeCADSketcherWorkbench.show(active);if(active&&window.PBABSketcher.open)window.PBABSketcher.open();if(!active&&window.PBABSketcher.close)window.PBABSketcher.close();};
  const install=()=>{const s=document.getElementById('workbenchSelector');if(s&&!s.__pbaSketchBound){s.__pbaSketchBound=true;s.addEventListener('change',sync);}sync();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,80));else setTimeout(install,80);
})();
