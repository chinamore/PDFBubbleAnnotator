(() => {
  if (window.__localWheelZoomInstalled) return;
  window.__localWheelZoomInstalled = true;

  const viewerEl = document.getElementById('viewer');
  if (!viewerEl) return;

  viewerEl.addEventListener('wheel', async (event) => {
    if (!window.pdf || !window.render || !window.scale) return;
    if (!event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();
    } else {
      return;
    }

    const rectBefore = paper.getBoundingClientRect();
    const mx = event.clientX - rectBefore.left;
    const my = event.clientY - rectBefore.top;
    if (mx < 0 || my < 0 || mx > rectBefore.width || my > rectBefore.height) return;

    const rx = rectBefore.width ? mx / rectBefore.width : 0.5;
    const ry = rectBefore.height ? my / rectBefore.height : 0.5;
    const oldScale = scale;
    const factor = event.deltaY < 0 ? 1.15 : (1 / 1.15);
    const newScale = Math.max(0.35, Math.min(6, oldScale * factor));
    if (Math.abs(newScale - oldScale) < 0.0001) return;

    scale = newScale;
    fitMode = false;
    updateZoom();
    try {
      await render();
      requestAnimationFrame(() => {
        const rectAfter = paper.getBoundingClientRect();
        const viewerRect = viewerEl.getBoundingClientRect();
        const xInViewer = rectAfter.left - viewerRect.left + rx * rectAfter.width;
        const yInViewer = rectAfter.top - viewerRect.top + ry * rectAfter.height;
        viewerEl.scrollLeft += xInViewer - (event.clientX - viewerRect.left);
        viewerEl.scrollTop += yInViewer - (event.clientY - viewerRect.top);
      });
      setStatus(`局部缩放 ${Math.round(scale / baseScale * 100)}%`);
    } catch (err) {
      console.error('local wheel zoom failed', err);
      scale = oldScale;
      updateZoom();
      await render();
    }
  }, { passive: false });
})();
