(() => {
  'use strict';
  if (window.__pbaSketcherRestore) return;
  window.__pbaSketcherRestore = true;
  function mount() {
    const panel = document.querySelector('.workspace .panel');
    if (!panel || document.getElementById('pba-sketcher-panel')) return;
    const box = document.createElement('div');
    box.id = 'pba-sketcher-panel';
    box.className = 'component-box';
    box.innerHTML = `<h4>✏️ Sketcher 2D 绘图</h4><div class="component-grid">
      <button class="component-btn" data-sketch="select"><b>🖱 选择</b><small>选择/检查图形</small></button>
      <button class="component-btn" data-sketch="line"><b>╱ 直线</b><small>绘制直线</small></button>
      <button class="component-btn" data-sketch="rect"><b>▭ 矩形</b><small>绘制矩形</small></button>
      <button class="component-btn" data-sketch="square"><b>□ 正方形</b><small>保持等边</small></button>
      <button class="component-btn" data-sketch="cloud"><b>☁ 云线</b><small>突出区域</small></button>
      <button class="component-btn" data-sketch="leader"><b>↗ 引线</b><small>带箭头</small></button>
      <button class="component-btn" data-sketch="mtext"><b>T 多行文字</b><small>支持换行</small></button>
    </div><div class="note">Sketcher 与原有气泡标注分离；气泡继续使用原核心逻辑。</div>`;
    panel.insertBefore(box, panel.firstChild);
    box.querySelectorAll('[data-sketch]').forEach(btn => btn.addEventListener('click', () => {
      const t = btn.dataset.sketch;
      if (window.PBADrawingSuite && typeof window.PBADrawingSuite.setTool === 'function') {
        window.PBADrawingSuite.setTool(t);
        box.querySelectorAll('[data-sketch]').forEach(b => b.classList.toggle('active', b === btn));
        if (window.setStatus) window.setStatus('Sketcher：' + btn.querySelector('b').textContent);
      } else alert('Sketcher 模块尚未加载，请稍候再试。');
    }));
  }
  function protectBubbleTools() {
    document.querySelectorAll('.tool[data-tool]').forEach(btn => btn.addEventListener('click', () => {
      if (window.PBADrawingSuite && typeof window.PBADrawingSuite.setTool === 'function') window.PBADrawingSuite.setTool('select');
      document.querySelectorAll('[data-sketch]').forEach(b => b.classList.remove('active'));
    }, true));
  }
  function init(){ mount(); protectBubbleTools(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(init,350)); else setTimeout(init,350);
})();
