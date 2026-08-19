/* Stable runtime: protect the legacy bubble engine and add an isolated Sketcher entry point. */
(function(){
  'use strict';
  if(window.__PBA_STABLE_RUNTIME__) return;
  window.__PBA_STABLE_RUNTIME__ = true;

  function loadScript(src, done){
    if(document.querySelector('script[data-pba-src="'+src+'"]')){ done&&done(); return; }
    const s=document.createElement('script');
    s.src=src; s.dataset.pbaSrc=src; s.onload=()=>done&&done(); s.onerror=()=>console.warn('PBA optional module failed:',src);
    document.head.appendChild(s);
  }

  function setActive(id,active){ const e=document.getElementById(id); if(e)e.classList.toggle('active',!!active); }

  function bind(){
    const bubble=document.getElementById('navBubble');
    const sketch=document.getElementById('navSketcher');
    if(bubble && !bubble.dataset.stableBound){
      bubble.dataset.stableBound='1';
      bubble.addEventListener('click',function(){
        setActive('navBubble',true); setActive('navSketcher',false);
        if(window.PBABSketcher) window.PBABSketcher.close();
        document.body.classList.remove('sketch-on');
        if(window.setStatus) window.setStatus('气泡标注模式');
      });
    }
    if(sketch && !sketch.dataset.stableBound){
      sketch.dataset.stableBound='1';
      sketch.addEventListener('click',function(){
        setActive('navBubble',false); setActive('navSketcher',true);
        const start=function(){
          if(window.PBABSketcher){ window.PBABSketcher.open(); document.body.classList.add('sketch-on'); }
          else if(window.setStatus) window.setStatus('Sketcher 模块正在加载…');
        };
        if(window.PBABSketcher) start(); else loadScript('./sketcher.js',start);
      });
    }
  }

  function install(){
    bind();
    /* FreeCAD-style workbench is optional UI only; it never replaces bubble DOM. */
    loadScript('./freecad_sketcher_workbench.js');
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
