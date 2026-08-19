/*
 * PDFBubbleAnnotator - Standalone FreeCAD-inspired 2D Sketcher
 *
 * This module intentionally owns only the Sketcher workspace. It does not
 * replace or modify the legacy bubble annotation state, controls or export.
 */
(function () {
  'use strict';

  const S = {
    active: false,
    tool: 'select',
    construction: false,
    grid: true,
    snap: true,
    gridSize: 10,
    items: [],
    constraints: [],
    history: [],
    future: [],
    start: null,
    temp: null,
    selected: null,
    zoom: 1,
    panX: 0,
    panY: 0
  };

  const $ = id => document.getElementById(id);
  const status = text => window.setStatus && window.setStatus(text);

  function host() { return $('paper') || $('viewer'); }

  function ensure() {
    if ($('sketcherRoot')) return;
    const h = host();
    if (!h) return;

    const css = document.createElement('style');
    css.id = 'sketcherStyle';
    css.textContent = `
      #sketcherRoot{position:fixed;inset:0;z-index:40;display:none;background:#eef1f5;color:#1f2937;font:13px "Segoe UI","Microsoft YaHei",sans-serif}
      #sketcherRoot *{box-sizing:border-box}
      .sk-top{height:38px;background:#f7f8fa;border-bottom:1px solid #c8cdd4;display:flex;align-items:center;padding:0 8px;gap:5px}
      .sk-brand{font-weight:700;padding:0 12px 0 5px;color:#374151}.sk-menu{height:28px;border:0;background:transparent;padding:4px 9px;border-radius:3px}.sk-menu:hover{background:#e5e7eb}
      .sk-tabs{height:31px;background:#fff;border-bottom:1px solid #cfd5dc;display:flex;align-items:flex-end;padding-left:8px;gap:2px}.sk-tab{padding:7px 15px 6px;border:1px solid transparent;border-bottom:0;border-radius:4px 4px 0 0;font-size:12px}.sk-tab.active{background:#eef1f5;border-color:#cfd5dc;font-weight:600}
      .sk-toolbar{height:74px;background:#f7f8fa;border-bottom:1px solid #c8cdd4;display:flex;align-items:stretch;padding:5px 8px;gap:8px;overflow:auto}
      .sk-group{display:flex;align-items:center;gap:3px;padding:0 8px;border-right:1px solid #d5d9df;flex:none}.sk-group-title{font-size:10px;color:#6b7280;align-self:flex-end;margin:0 0 2px 2px}.sk-tools{display:flex;gap:2px;align-items:center}.sk-tool{min-width:45px;height:55px;padding:3px 5px;border:1px solid transparent;background:transparent;border-radius:4px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:11px}.sk-tool:hover{background:#e8edf5;border-color:#cbd5e1}.sk-tool.active{background:#dcecff;border-color:#76a9e8;color:#0757b8}.sk-icon{font-size:20px;line-height:20px}.sk-small{min-width:36px;height:34px;font-size:10px}.sk-small .sk-icon{font-size:15px}
      .sk-main{height:calc(100% - 143px);display:grid;grid-template-columns:230px minmax(0,1fr) 250px;min-height:0}.sk-left,.sk-right{background:#f7f8fa;overflow:auto}.sk-left{border-right:1px solid #c8cdd4}.sk-right{border-left:1px solid #c8cdd4}.sk-panel-title{padding:9px 11px;background:#e9edf2;border-bottom:1px solid #cfd5dc;font-weight:600}.sk-section{padding:10px;border-bottom:1px solid #d9dde3}.sk-section h4{font-size:11px;color:#596273;margin:0 0 8px;text-transform:uppercase}.sk-row{display:flex;align-items:center;gap:6px;margin:6px 0}.sk-row label{flex:1}.sk-input{width:74px;border:1px solid #c8ced8;border-radius:3px;padding:4px 6px;background:#fff}.sk-list{display:flex;flex-direction:column;gap:2px}.sk-list button{text-align:left;border:0;background:transparent;padding:6px 7px;border-radius:3px}.sk-list button:hover{background:#e9eef6}.sk-list button.active{background:#dcecff;color:#0757b8}.sk-center{position:relative;overflow:hidden;background:#d8dde4}.sk-canvas{position:absolute;inset:0;width:100%;height:100%;background:#fff;cursor:crosshair}.sk-origin{position:absolute;left:50%;top:50%;width:1px;height:1px;pointer-events:none}.sk-status{height:30px;position:absolute;left:0;right:0;bottom:0;background:#f7f8fa;border-top:1px solid #c8cdd4;display:flex;align-items:center;padding:0 10px;gap:18px;color:#596273;font-size:11px}.sk-close{margin-left:auto;background:#fff;border:1px solid #bcc5d1;border-radius:4px;padding:4px 12px}.sk-constraint{display:inline-flex;align-items:center;gap:5px;padding:5px 7px;background:#fff;border:1px solid #d4d9e0;border-radius:3px;margin:2px;font-size:11px}.sk-badge{display:inline-block;width:8px;height:8px;border-radius:50%;background:#1677ff}.sk-empty{color:#8a94a3;padding:12px;text-align:center;font-size:11px}
      #sketcherRoot .sk-escape{color:#b42318}
    `;
    document.head.appendChild(css);

    const root = document.createElement('section');
    root.id = 'sketcherRoot';
    root.innerHTML = `
      <div class="sk-top">
        <div class="sk-brand">◈ Sketcher</div>
        <button class="sk-menu" data-menu="Sketch">草图</button>
        <button class="sk-menu" data-menu="Sketch">编辑</button>
        <button class="sk-menu" data-menu="Sketch">约束</button>
        <button class="sk-menu" data-menu="Sketch">几何</button>
        <button class="sk-menu" data-menu="Sketch">视图</button>
        <button class="sk-close" id="skClose">退出 Sketcher</button>
      </div>
      <div class="sk-tabs"><div class="sk-tab active">Sketch</div><div class="sk-tab">Model</div><div class="sk-tab">Tasks</div></div>
      <div class="sk-toolbar">
        <div class="sk-group"><div class="sk-tools">
          <button class="sk-tool" data-sk="select"><span class="sk-icon">↖</span>选择</button>
          <button class="sk-tool" data-sk="move"><span class="sk-icon">✥</span>移动</button>
          <button class="sk-tool" data-sk="delete"><span class="sk-icon">⌫</span>删除</button>
        </div></div>
        <div class="sk-group"><div class="sk-tools">
          <button class="sk-tool" data-sk="line"><span class="sk-icon">╱</span>直线</button>
          <button class="sk-tool" data-sk="polyline"><span class="sk-icon">⌁</span>连续线</button>
          <button class="sk-tool" data-sk="rectangle"><span class="sk-icon">□</span>矩形</button>
          <button class="sk-tool" data-sk="circle"><span class="sk-icon">○</span>圆</button>
          <button class="sk-tool" data-sk="arc"><span class="sk-icon">◔</span>圆弧</button>
          <button class="sk-tool" data-sk="point"><span class="sk-icon">•</span>点</button>
        </div></div>
        <div class="sk-group"><div class="sk-tools">
          <button class="sk-tool sk-small" data-sk="horizontal"><span class="sk-icon">━</span>水平</button>
          <button class="sk-tool sk-small" data-sk="vertical"><span class="sk-icon">┃</span>垂直</button>
          <button class="sk-tool sk-small" data-sk="coincident"><span class="sk-icon">⊙</span>重合</button>
          <button class="sk-tool sk-small" data-sk="parallel"><span class="sk-icon">∥</span>平行</button>
          <button class="sk-tool sk-small" data-sk="perpendicular"><span class="sk-icon">⊥</span>正交</button>
          <button class="sk-tool sk-small" data-sk="tangent"><span class="sk-icon">◡</span>相切</button>
        </div></div>
        <div class="sk-group"><div class="sk-tools">
          <button class="sk-tool sk-small" data-sk="distance"><span class="sk-icon">↔</span>距离</button>
          <button class="sk-tool sk-small" data-sk="radius"><span class="sk-icon">R</span>半径</button>
          <button class="sk-tool sk-small" data-sk="angle"><span class="sk-icon">∠</span>角度</button>
          <button class="sk-tool sk-small" data-sk="construction"><span class="sk-icon">┄</span>构造</button>
        </div></div>
        <div class="sk-group"><div class="sk-tools">
          <button class="sk-tool sk-small" data-sk="undo"><span class="sk-icon">↶</span>撤销</button>
          <button class="sk-tool sk-small" data-sk="redo"><span class="sk-icon">↷</span>重做</button>
          <button class="sk-tool sk-small" data-sk="grid"><span class="sk-icon">▦</span>网格</button>
          <button class="sk-tool sk-small" data-sk="snap"><span class="sk-icon">⌖</span>捕捉</button>
        </div></div>
      </div>
      <div class="sk-main">
        <aside class="sk-left">
          <div class="sk-panel-title">任务 / 几何</div>
          <div class="sk-section"><h4>几何</h4><div class="sk-list">
            <button data-sk="line">╱ 直线</button><button data-sk="polyline">⌁ 连续线</button><button data-sk="rectangle">□ 矩形</button><button data-sk="circle">○ 圆</button><button data-sk="arc">◔ 圆弧</button><button data-sk="point">• 点</button>
          </div></div>
          <div class="sk-section"><h4>编辑</h4><div class="sk-list"><button data-sk="trim">✂ 修剪</button><button data-sk="extend">↔ 延伸</button><button data-sk="fillet">⌒ 圆角</button><button data-sk="chamfer">◇ 倒角</button><button data-sk="mirror">⇋ 镜像</button></div></div>
          <div class="sk-section"><h4>草图属性</h4><div class="sk-row"><label>网格</label><input id="skGridSize" class="sk-input" value="10"></div><div class="sk-row"><label>捕捉</label><input id="skSnapSize" class="sk-input" value="10"></div></div>
        </aside>
        <main class="sk-center" id="sketcherCenter"><canvas id="sketchCanvas" class="sk-canvas"></canvas><div class="sk-status"><span id="skToolStatus">选择</span><span id="skCoordStatus">X 0.00  Y 0.00</span><span>几何体 <b id="skGeomCount">0</b></span><span>约束 <b id="skConstraintCount">0</b></span><span id="skSolveStatus">欠约束</span><span style="margin-left:auto">Grid: <b id="skGridStatus">10</b></span></div></main>
        <aside class="sk-right">
          <div class="sk-panel-title">约束</div>
          <div class="sk-section"><div id="skConstraints"><div class="sk-empty">尚无约束</div></div></div>
          <div class="sk-section"><h4>尺寸</h4><div class="sk-row"><label>长度</label><input id="skLength" class="sk-input" value="—"></div><div class="sk-row"><label>半径</label><input id="skRadius" class="sk-input" value="—"></div><div class="sk-row"><label>角度</label><input id="skAngle" class="sk-input" value="—"></div></div>
          <div class="sk-section"><h4>当前工具</h4><div id="skToolHelp" class="sk-empty">选择几何工具开始绘图</div></div>
        </aside>
      </div>`;
    document.body.appendChild(root);

    const c = $('sketchCanvas');
    c.addEventListener('pointerdown', pointerDown);
    c.addEventListener('pointermove', pointerMove);
    c.addEventListener('pointerup', pointerUp);
    c.addEventListener('pointerleave', pointerMove);
    $('skClose').onclick = close;
    root.querySelectorAll('[data-sk]').forEach(b => b.addEventListener('click', () => command(b.dataset.sk)));
    $('skGridSize').addEventListener('change', () => { S.gridSize = Math.max(2, Number($('skGridSize').value) || 10); update(); });
    $('skSnapSize').addEventListener('change', () => { S.gridSize = Math.max(2, Number($('skSnapSize').value) || 10); });
    window.addEventListener('resize', resize);
  }

  function resize() {
    const c = $('sketchCanvas'), box = $('sketcherCenter');
    if (!c || !box) return;
    const d = window.devicePixelRatio || 1, r = box.getBoundingClientRect();
    c.width = Math.max(1, Math.round(r.width * d)); c.height = Math.max(1, Math.round(r.height * d));
    c.style.width = r.width + 'px'; c.style.height = r.height + 'px'; draw();
  }

  function snap(v) { return S.snap ? Math.round(v / S.gridSize) * S.gridSize : v; }
  function point(e) { const r = $('sketchCanvas').getBoundingClientRect(); return { x: snap(e.clientX-r.left), y: snap(e.clientY-r.top) }; }
  function save() { S.history.push(JSON.stringify({items:S.items,constraints:S.constraints})); if(S.history.length>60)S.history.shift(); S.future=[]; }
  function restore(s) { const o=JSON.parse(s); S.items=o.items||[]; S.constraints=o.constraints||[]; update(); }

  function command(t) {
    if (t==='undo') { if(!S.history.length)return; S.future.push(JSON.stringify({items:S.items,constraints:S.constraints})); restore(S.history.pop()); return; }
    if (t==='redo') { if(!S.future.length)return; S.history.push(JSON.stringify({items:S.items,constraints:S.constraints})); restore(S.future.pop()); return; }
    if (t==='grid') { S.grid=!S.grid; update(); return; }
    if (t==='snap') { S.snap=!S.snap; update(); return; }
    if (t==='construction') { S.construction=!S.construction; setTool('select'); status('构造几何：'+(S.construction?'开启':'关闭')); return; }
    if (['horizontal','vertical','coincident','parallel','perpendicular','tangent','distance','radius','angle'].includes(t)) { addConstraint(t); return; }
    if (['trim','extend','fillet','chamfer','mirror'].includes(t)) { status('Sketcher：'+t+' 工具界面已就绪'); setTool(t); return; }
    setTool(t);
  }

  function setTool(t) {
    S.tool=t; S.start=null; S.temp=null;
    document.querySelectorAll('#sketcherRoot [data-sk]').forEach(b=>b.classList.toggle('active',b.dataset.sk===t));
    const names={select:'选择',move:'移动',delete:'删除',line:'直线',polyline:'连续线',rectangle:'矩形',circle:'圆',arc:'圆弧',point:'点',trim:'修剪',extend:'延伸',fillet:'圆角',chamfer:'倒角',mirror:'镜像'};
    $('skToolStatus').textContent=names[t]||t; $('skToolHelp').textContent=names[t]?'当前工具：'+names[t]:'选择几何工具开始绘图';
    status('Sketcher：'+(names[t]||t)); draw();
  }

  function addConstraint(type) {
    save(); S.constraints.push({type, index:S.selected}); update(); status('添加约束：'+type); 
  }

  function update() {
    $('skGeomCount').textContent=S.items.length; $('skConstraintCount').textContent=S.constraints.length; $('skGridStatus').textContent=S.gridSize;
    $('skSolveStatus').textContent=S.constraints.length?'约束系统已建立':'欠约束';
    const box=$('skConstraints'); box.innerHTML='';
    if(!S.constraints.length){box.innerHTML='<div class="sk-empty">尚无约束</div>';} else S.constraints.forEach((c,i)=>{const d=document.createElement('div');d.className='sk-constraint';d.innerHTML='<span class="sk-badge"></span>'+constraintName(c.type)+' #'+(i+1);box.appendChild(d)});
    draw();
  }
  function constraintName(t){return {horizontal:'水平',vertical:'垂直',coincident:'重合',parallel:'平行',perpendicular:'正交',tangent:'相切',distance:'距离',radius:'半径',angle:'角度'}[t]||t}

  function pointerDown(e) {
    if(!S.active)return; const p=point(e); S.start=p; $('sketchCanvas').setPointerCapture?.(e.pointerId);
    if(S.tool==='point'){save();S.items.push({type:'point',x:p.x,y:p.y,construction:S.construction});S.start=null;update();}
  }
  function pointerMove(e) {
    if(!S.active)return; const r=$('sketchCanvas').getBoundingClientRect(); $('skCoordStatus').textContent=`X ${(e.clientX-r.left).toFixed(2)}  Y ${(e.clientY-r.top).toFixed(2)}`;
    if(!S.start)return; const p=point(e); const a=S.start;
    if(['line','polyline'].includes(S.tool))S.temp={type:'line',x1:a.x,y1:a.y,x2:p.x,y2:p.y,construction:S.construction};
    else if(S.tool==='rectangle')S.temp={type:'rect',x1:a.x,y1:a.y,x2:p.x,y2:p.y,construction:S.construction};
    else if(S.tool==='circle')S.temp={type:'circle',cx:a.x,cy:a.y,r:Math.hypot(p.x-a.x,p.y-a.y),construction:S.construction};
    else if(S.tool==='arc')S.temp={type:'arc',cx:a.x,cy:a.y,r:Math.hypot(p.x-a.x,p.y-a.y),a1:0,a2:Math.atan2(p.y-a.y,p.x-a.x),construction:S.construction};
    draw();
  }
  function pointerUp(e) {
    if(!S.active||!S.start)return; const p=point(e),a=S.start; save();
    if(['line','polyline'].includes(S.tool))S.items.push({type:'line',x1:a.x,y1:a.y,x2:p.x,y2:p.y,construction:S.construction});
    else if(S.tool==='rectangle')S.items.push({type:'rect',x1:a.x,y1:a.y,x2:p.x,y2:p.y,construction:S.construction});
    else if(S.tool==='circle')S.items.push({type:'circle',cx:a.x,cy:a.y,r:Math.hypot(p.x-a.x,p.y-a.y),construction:S.construction});
    else if(S.tool==='arc')S.items.push({type:'arc',cx:a.x,cy:a.y,r:Math.hypot(p.x-a.x,p.y-a.y),a1:0,a2:Math.atan2(p.y-a.y,p.x-a.x),construction:S.construction});
    S.start=null;S.temp=null;update();
  }

  function draw() {
    const c=$('sketchCanvas'); if(!c)return; const g=c.getContext('2d'),d=window.devicePixelRatio||1,r=c.getBoundingClientRect();
    g.clearRect(0,0,c.width,c.height);g.save();g.scale(d,d);
    if(S.grid){g.strokeStyle='#e6e9ed';g.lineWidth=1;const step=S.gridSize;for(let x=0;x<r.width;x+=step){g.beginPath();g.moveTo(x,0);g.lineTo(x,r.height);g.stroke()}for(let y=0;y<r.height;y+=step){g.beginPath();g.moveTo(0,y);g.lineTo(r.width,y);g.stroke()}}
    const ox=r.width/2,oy=r.height/2;g.strokeStyle='#b7bec8';g.lineWidth=1;g.beginPath();g.moveTo(ox,0);g.lineTo(ox,r.height);g.moveTo(0,oy);g.lineTo(r.width,oy);g.stroke();
    g.save();g.translate(0,0);S.items.forEach((o,i)=>shape(g,o,i===S.selected,false));if(S.temp)shape(g,S.temp,false,true);g.restore();g.restore();
  }
  function shape(g,o,sel,temp){g.save();g.strokeStyle=o.construction?'#8a94a3':'#1677ff';g.fillStyle='#1677ff';g.lineWidth=sel?3:(temp?1:2);g.setLineDash(o.construction?[6,4]:[]);
    if(o.type==='line'){g.beginPath();g.moveTo(o.x1,o.y1);g.lineTo(o.x2,o.y2);g.stroke()}
    else if(o.type==='rect')g.strokeRect(Math.min(o.x1,o.x2),Math.min(o.y1,o.y2),Math.abs(o.x2-o.x1),Math.abs(o.y2-o.y1));
    else if(o.type==='circle'){g.beginPath();g.arc(o.cx,o.cy,o.r,0,Math.PI*2);g.stroke()}
    else if(o.type==='arc'){g.beginPath();g.arc(o.cx,o.cy,o.r,o.a1,o.a2);g.stroke()}
    else if(o.type==='point'){g.beginPath();g.arc(o.x,o.y,3,0,Math.PI*2);g.fill()}
    g.restore();
  }

  function open(){ensure();S.active=true;$('sketcherRoot').style.display='block';resize();setTool('select');status('Sketcher 工作台已开启');}
  function close(){S.active=false;S.start=null;S.temp=null;const r=$('sketcherRoot');if(r)r.style.display='none';status('已退出 Sketcher');}
  window.PBABSketcher={open,close,toggle:()=>S.active?close():open,resize,items:S.items};
})();
