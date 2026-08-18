/* Bridge between the FreeCAD-style workbench selector and the isolated Sketcher UI. */
(() => {
  'use strict';
  if (window.__pbaFreeCADSketcherBridge) return;
  window.__pbaFreeCADSketcherBridge = true;
  const sync = () => {
    const s = document.getElementById('workbenchSelector');
    const active = !!s && s.value === 'Sketcher';
    if (window.PBAFreeCADSketcherWorkbench) window.PBAFreeCADSketcherWorkbench.show(active);
    if (active && window.PBABSketcher && typeof window.PBABSketcher.open === 'function') window.PBABSketcher.open();
    if (!active && window.PBABSketcher && typeof window.PBABSketcher.close === 'function') window.PBABSketcher.close();
  };
  const install = () => {
    const s = document.getElementById('workbenchSelector');
    if (s && !s.__pbaSketchBound) { s.__pbaSketchBound = true; s.addEventListener('change', sync); }
    sync();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(install, 50));
  else setTimeout(install, 50);
})();
