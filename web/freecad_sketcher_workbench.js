/* FreeCAD-style Sketcher workbench.
 * This module is intentionally isolated from the legacy bubble annotation engine.
 * It owns only the Sketcher workbench UI/state and communicates with sketcher.js
 * through PBABSketcher commands when available.
 */
(() => {
  'use strict';
  if (window.__pbaFreeCADSketcherWorkbench) return;
  window.__pbaFreeCADSketcherWorkbench = true;

  const S = window.PBAFreeCADSketcher = window.PBAFreeCADSketcher || {
    grid: true,
    snap: true,
    construction: false,
    continuous: true,
    activeCommand: 'select'
  };
  const $ = id => document.getElementById(id);

  const GEOMETRY = [
    ['select','选择'], ['point','点'], ['line','直线'], ['polyline','多段线'],
    ['arc','圆弧'], ['circle','圆'], ['ellipse','椭圆'], ['rectangle','矩形'],
    ['centered-rectangle','中心矩形'], ['rounded-rectangle','圆角矩形'],
    ['polygon','多边形'], ['slot','槽'], ['bspline','B样条'], ['bezier','Bezier曲线']
  ];
  const EDIT = [
    ['trim','修剪'], ['extend','延伸'], ['fillet','圆角'], ['chamfer','倒角'],
    ['offset','偏移几何'], ['mirror','镜像'], ['split','分割'], ['move','移动'],
    ['copy','复制'], ['delete','删除']
  ];
  const CONSTRAINTS = [
    ['coincident','重合'], ['horizontal','水平'], ['vertical','垂直'], ['parallel','平行'],
    ['perpendicular','垂直/正交'], ['tangent','相切'], ['equal','相等'], ['symmetric','对称'],
    ['point-on-object','点在线上'], ['midpoint','中点'], ['block','固定'], ['lock','锁定'],
    ['distance','距离'], ['horizontal-distance','水平距离'], ['vertical-distance','垂直距离'],
    ['length','长度'], ['radius','半径'], ['diameter','直径'], ['angle','角度'], ['distance-x','X距离'], ['distance-y','Y距离']
  ];

  function status(t){
    const e = $('status'); if(e) e.textContent = t;
  }
  function dispatch(name, detail){
    document.dispatchEvent(new CustomEvent(name, {detail: detail || {}}));
  }
  function command(name){
    S.activeCommand = name;
    if(window.PBABSketcher && typeof window.PBABSketcher.command === 'function') window.PBABSketcher.command(name);
    else dispatch('pba-sketch-command', {command:name});
    document.querySelectorAll('.fc-sk-command').forEach(b => b.classList.toggle('active', b.dataset.command === name));
    status('Sketcher：' + name);
  }
  function constraint(name){
    if(window.PBABSketcher && typeof window.PBABSketcher.constraint === 'function') window.PBABSketcher.constraint(name);
    else dispatch('pba-sketch-constraint', {constraint:name});
    status('Sketcher 约束：' + name);
  }
  function toggle(name){
    S[name] = !S[name];
    if(window.PBABSketcher && typeof window.PBABSketcher.setOption === 'function') window.PBABSketcher.setOption(name,S[name]);
    dispatch('pba-sketch-option',{name,value:S[name]});
    status((name==='grid'?'网格':name==='snap'?'自动捕捉':name==='construction'?'构造几何':'连续创建') + '：' + (S[name]?'开':'关'));
    renderState();
  }
  function btn(label, cls, fn){
    const b=document.createElement('button'); b.type='button'; b.textContent=label; b.className=cls||'fc-sk-btn'; b.onclick=fn; return b;
  }
  function group(title, items){
    const g=document.createElement('div'); g.className='fc-sk-group';
    const h=document.createElement('div'); h.className='fc-sk-group-title'; h.textContent=title; g.appendChild(h);
    const row=document.createElement('div'); row.className='fc-sk-row';
    items.forEach(([id,label])=>row.appendChild(btn(label,'fc-sk-command',()=>command(id)))); g.appendChild(row); return g;
  }
  function renderState(){
    const ids={grid:'fcSkGrid',snap:'fcSkSnap',construction:'fcSkConstruction',continuous:'fcSkContinuous'};
    Object.keys(ids).forEach(k=>{const e=$(ids[k]); if(e)e.classList.toggle('active',!!S[k]);});
  }

  function install(){
    if($('fcSketcherDock')) return;
    const css=document.createElement('style');
    css.textContent=`
      #fcSketcherDock{position:fixed;left:8px;top:108px;width:280px;max-height:calc(100vh - 150px);overflow:auto;background:#f7f7f7;border:1px solid #b8bcc2;box-shadow:0 3px 12px #0002;z-index:1500;font:12px Segoe UI,Microsoft YaHei,sans-serif;display:none}
      #fcSketcherDock .fc-sk-title{background:#e3e5e8;border-bottom:1px solid #c0c4c9;padding:7px 9px;font-weight:600;color:#30363b}
      .fc-sk-group{border-bottom:1px solid #d4d7da;padding:6px}.fc-sk-group-title{font-weight:600;color:#555;margin:0 0 5px}.fc-sk-row{display:grid;grid-template-columns:1fr 1fr;gap:3px}
      .fc-sk-command,.fc-sk-option{border:1px solid transparent;background:#fff;padding:5px 6px;text-align:left;cursor:pointer;border-radius:2px}.fc-sk-command:hover,.fc-sk-option:hover{background:#e5eff9;border-color:#b6cde2}.fc-sk-command.active,.fc-sk-option.active{background:#d8e9f8;border-color:#8fb6d9;color:#174f7d}
      #fcSketcherDock .fc-sk-options{display:grid;grid-template-columns:1fr 1fr;gap:3px}.fc-sk-footer{padding:7px;color:#70767d;font-size:11px;line-height:1.4}
      #fcSketcherToolbar{display:none;position:fixed;left:296px;right:8px;top:108px;background:#eceeef;border:1px solid #c0c4c8;z-index:1499;padding:3px;box-shadow:0 2px 7px #0001;white-space:nowrap;overflow-x:auto}
      #fcSketcherToolbar button{border:1px solid transparent;background:transparent;padding:5px 8px;cursor:pointer;border-radius:2px}#fcSketcherToolbar button:hover{background:#d8e7f5;border-color:#b8cadc}
      #fcSketcherToolbar .sep{display:inline-block;height:22px;border-left:1px solid #c4c7ca;margin:0 3px;vertical-align:middle}
    `; document.head.appendChild(css);

    const dock=document.createElement('aside'); dock.id='fcSketcherDock';
    dock.innerHTML='<div class="fc-sk-title">Sketcher · Tasks</div>';
    dock.appendChild(group('几何',GEOMETRY));
    dock.appendChild(group('编辑几何',EDIT));
    dock.appendChild(group('约束',CONSTRAINTS));
    const opt=document.createElement('div'); opt.className='fc-sk-group'; opt.innerHTML='<div class="fc-sk-group-title">草图选项</div><div class="fc-sk-options"></div>';
    [['grid','网格'],['snap','自动捕捉'],['construction','构造几何'],['continuous','连续创建']].forEach(([id,label])=>{const b=btn(label,'fc-sk-option',()=>toggle(id));b.id='fcSk'+id[0].toUpperCase()+id.slice(1);opt.querySelector('.fc-sk-options').appendChild(b)});
    dock.appendChild(opt);
    const foot=document.createElement('div'); foot.className='fc-sk-footer'; foot.textContent='FreeCAD 风格 Sketcher：几何、编辑、约束和草图选项。命令由独立 Sketcher 引擎执行。'; dock.appendChild(foot); document.body.appendChild(dock);

    const tb=document.createElement('div'); tb.id='fcSketcherToolbar';
    [['选择','select'],['点','point'],['直线','line'],['连续线','polyline'],['圆弧','arc'],['圆','circle'],['椭圆','ellipse'],['矩形','rectangle'],['中心矩形','centered-rectangle'],['圆角矩形','rounded-rectangle'],['槽','slot'],['B样条','bspline']].forEach(([l,id])=>tb.appendChild(btn(l,'',()=>command(id))));
    const sep=document.createElement('span');sep.className='sep';tb.appendChild(sep);
    [['水平','horizontal'],['垂直','vertical'],['重合','coincident'],['平行','parallel'],['正交','perpendicular'],['相切','tangent'],['距离','distance'],['半径','radius'],['角度','angle']].forEach(([l,id])=>tb.appendChild(btn(l,'',()=>constraint(id))));
    document.body.appendChild(tb);
    renderState();
  }
  function show(active){
    install(); const d=$('fcSketcherDock'),t=$('fcSketcherToolbar'); if(d)d.style.display=active?'block':'none'; if(t)t.style.display=active?'block':'none';
    if(active) command('select');
  }
  window.PBAFreeCADSketcherWorkbench={show,install,command,constraint,toggle,state:S};
  document.addEventListener('pba-workbench-change',e=>show(e.detail&&e.detail.name==='Sketcher'));
})();
