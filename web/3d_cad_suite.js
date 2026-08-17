(() => {
  'use strict';
  if (window.__cad3dSuiteLoaded) return;
  window.__cad3dSuiteLoaded = true;

  const $ = id => document.getElementById(id);
  let THREE = null, scene, camera, renderer, controls, raycaster, pointer;
  let modelRoot = null, pickPoints = [], lastHit = null, fileName = '';
  const MM = 1000; // viewer unit is meters for imported CAD; measurements are reported in mm

  function addButton() {
    if ($('open3dBtn')) return;
    const group = document.createElement('div'); group.className = 'rgroup';
    const b = document.createElement('button'); b.id = 'open3dBtn'; b.textContent = '🧊 3D CAD';
    b.title = 'STEP / STP / IGES / IGS / STL / OBJ';
    b.onclick = openPanel; group.appendChild(b);
    document.querySelector('.ribbon')?.appendChild(group);
  }

  function openPanel() {
    let p = $('cad3dPanel');
    if (!p) {
      p = document.createElement('div'); p.id='cad3dPanel';
      p.style.cssText='position:fixed;right:18px;top:92px;width:360px;height:650px;background:#fff;border:1px solid #cbd5e1;border-radius:10px;box-shadow:0 12px 35px #0004;z-index:9999;display:flex;flex-direction:column;overflow:hidden';
      p.innerHTML=`<div style="padding:10px 12px;background:#0f1d32;color:#fff;font-weight:700">🧊 3D CAD 工作台 <button id="cad3dClose" style="float:right;color:#111">×</button></div>
      <div style="padding:10px;border-bottom:1px solid #e5e7eb;display:grid;gap:7px">
        <input id="cad3dFile" type="file" accept=".step,.stp,.iges,.igs,.stl,.obj" />
        <div style="display:flex;gap:5px"><button id="cadFit">适合窗口</button><button id="cadReset">重置视图</button><button id="cadClear">清除测量</button></div>
      </div>
      <div id="cad3dViewport" style="height:350px;background:#eef2f7;position:relative"></div>
      <div style="padding:10px;overflow:auto;flex:1"><b>3D 尺寸测量</b>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px">
          <button data-m="bbox">📦 包围盒</button><button data-m="dist">↔ 点到点</button>
          <button data-m="length">📏 长度</button><button data-m="angle">∠ 三点角度</button>
          <button data-m="arc">⌒ 三点弧度</button><button data-m="point">📍 点坐标</button>
        </div>
        <div id="cad3dStatus" style="margin-top:10px;font-size:12px;color:#475569">请选择模型文件。</div>
        <div id="cad3dResult" style="margin-top:8px;padding:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;white-space:pre-wrap;font-family:Consolas,monospace;font-size:12px">—</div>
        <div style="margin-top:8px;font-size:11px;color:#64748b">支持：STEP/STP、IGES/IGS、STL、OBJ。测量单位：mm、°。点击模型拾取测量点。</div>
      </div>`;
      document.body.appendChild(p);
      $('cad3dClose').onclick=()=>p.remove();
      $('cad3dFile').onchange=e=>loadFile(e.target.files?.[0]);
      $('cadFit').onclick=fitCamera; $('cadReset').onclick=resetCamera; $('cadClear').onclick=clearMeasure;
      p.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>startMeasure(b.dataset.m));
    }
    p.style.display='flex'; ensureViewer();
  }

  async function loadScript(src) { return new Promise((resolve,reject)=>{ const s=document.createElement('script'); s.src=src; s.onload=resolve; s.onerror=()=>reject(new Error('无法加载 '+src)); document.head.appendChild(s); }); }

  async function ensureViewer() {
    if (renderer) return;
    $('cad3dStatus').textContent='正在加载 3D 引擎…';
    try {
      await loadScript('./vendor/three.min.js');
      THREE = window.THREE;
      await loadScript('./vendor/OrbitControls.js');
      await loadScript('./vendor/STLLoader.js');
      await loadScript('./vendor/OBJLoader.js');
      raycaster = new THREE.Raycaster(); pointer = new THREE.Vector2();
      const box=$('cad3dViewport');
      scene=new THREE.Scene(); scene.background=new THREE.Color(0xf1f5f9);
      camera=new THREE.PerspectiveCamera(45,box.clientWidth/box.clientHeight,0.000001,1000000); camera.position.set(2,2,2);
      renderer=new THREE.WebGLRenderer({antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(box.clientWidth,box.clientHeight); box.appendChild(renderer.domElement);
      controls=new THREE.OrbitControls(camera,renderer.domElement); controls.enableDamping=true;
      scene.add(new THREE.HemisphereLight(0xffffff,0x64748b,2)); const dl=new THREE.DirectionalLight(0xffffff,2); dl.position.set(5,8,5); scene.add(dl);
      renderer.domElement.addEventListener('pointerdown',pickPoint);
      const resize=()=>{const w=box.clientWidth,h=box.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h)}; new ResizeObserver(resize).observe(box);
      (function loop(){requestAnimationFrame(loop);controls.update();renderer.render(scene,camera)})();
      $('cad3dStatus').textContent='3D 引擎就绪。';
    } catch(e) { $('cad3dStatus').textContent='3D 引擎加载失败：'+e.message; }
  }

  async function loadFile(file) {
    if (!file) return; fileName=file.name; await ensureViewer(); clearModel();
    const ext=file.name.split('.').pop().toLowerCase(); const buf=await file.arrayBuffer();
    try {
      if(ext==='stl') loadSTL(buf); else if(ext==='obj') loadOBJ(new TextDecoder().decode(buf));
      else if(ext==='step'||ext==='stp'||ext==='iges'||ext==='igs') await loadOCCT(buf,ext);
      else throw new Error('不支持的 3D 格式');
      $('cad3dStatus').textContent='已加载：'+file.name; fitCamera();
    } catch(e){ $('cad3dStatus').textContent='加载失败：'+e.message; }
  }
  function material(){return new THREE.MeshStandardMaterial({color:0x7aa7e8,metalness:.15,roughness:.6,side:THREE.DoubleSide})}
  function loadSTL(buf){const loader=new THREE.STLLoader(); const g=loader.parse(buf); const m=new THREE.Mesh(g,material()); modelRoot=new THREE.Group();modelRoot.add(m);scene.add(modelRoot)}
  function loadOBJ(text){const loader=new THREE.OBJLoader(); modelRoot=loader.parse(text); modelRoot.traverse(o=>{if(o.isMesh)o.material=material()});scene.add(modelRoot)}
  async function loadOCCT(buf,ext){
    if(!window.occtimportjs) await loadScript('./vendor/occt-import-js.js');
    if(!window.occtimportjs) throw new Error('STEP/IGES 引擎未打包');
    const occt=await window.occtimportjs({locateFile:(f)=>'./vendor/'+f});
    const result=occt.ReadStepFile(new Uint8Array(buf), null);
    modelRoot=new THREE.Group();
    for(const r of (result.meshes||[])){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(r.attributes.position.array,3));if(r.attributes.normal)g.setAttribute('normal',new THREE.Float32BufferAttribute(r.attributes.normal.array,3));if(r.index)g.setIndex(r.index.array);g.computeBoundingSphere();modelRoot.add(new THREE.Mesh(g,material()));}
    scene.add(modelRoot);
  }
  function clearModel(){if(modelRoot){scene.remove(modelRoot);modelRoot.traverse(o=>{o.geometry?.dispose?.();o.material?.dispose?.()});}modelRoot=null;clearMeasure()}
  function bounds(){if(!modelRoot)return null;const b=new THREE.Box3().setFromObject(modelRoot);const s=b.getSize(new THREE.Vector3());return {b,s}}
  function fitCamera(){const z=bounds();if(!z||!renderer)return;const c=z.b.getCenter(new THREE.Vector3()),d=z.s.length();controls.target.copy(c);camera.position.copy(c).add(new THREE.Vector3(d,d,d));camera.near=Math.max(d/100000,1e-6);camera.far=Math.max(d*100,100);camera.updateProjectionMatrix();controls.update()}
  function resetCamera(){camera.position.set(2,2,2);controls.target.set(0,0,0);controls.update()}
  function pickPoint(ev){if(!modelRoot||!raycaster)return;const r=renderer.domElement.getBoundingClientRect();pointer.x=((ev.clientX-r.left)/r.width)*2-1;pointer.y=-((ev.clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObject(modelRoot,true);if(!hits.length)return;lastHit=hits[0].point.clone(); if(pickPoints.length<3)pickPoints.push(lastHit); updateResult();}
  function clearMeasure(){pickPoints=[];lastHit=null;if($('cad3dResult'))$('cad3dResult').textContent='—'}
  function fmt(v){return Number(v).toFixed(3)}
  function updateResult(){if(!$('cad3dResult')||!lastHit)return;$('cad3dResult').textContent=`拾取点 ${pickPoints.length}: X=${fmt(lastHit.x*MM)} mm, Y=${fmt(lastHit.y*MM)} mm, Z=${fmt(lastHit.z*MM)} mm`}
  function startMeasure(type){if(!modelRoot){alert('请先导入 3D 图纸');return}const z=bounds();if(type==='bbox'){const s=z.s; $('cad3dResult').textContent=`包围尺寸\n长 X = ${fmt(s.x*MM)} mm\n宽 Y = ${fmt(s.y*MM)} mm\n高 Z = ${fmt(s.z*MM)} mm`;return}pickPoints=[];lastHit=null;$('cad3dStatus').textContent={dist:'点击两个点',length:'点击两个点',angle:'依次点击三个点',arc:'依次点击三个点',point:'点击一个点'}[type];
    const need=type==='angle'||type==='arc'?3:2;
    const check=()=>{if(pickPoints.length<need)return;const a=pickPoints[0],b=pickPoints[1],c=pickPoints[2];let text='';if(type==='dist'||type==='length')text=`长度 = ${fmt(a.distanceTo(b)*MM)} mm`;if(type==='angle'){const v1=a.clone().sub(b),v2=c.clone().sub(b);text=`角度 = ${fmt(THREE.MathUtils.radToDeg(v1.angleTo(v2)))} °`;}if(type==='arc'){const ab=a.distanceTo(b),bc=b.distanceTo(c),ac=a.distanceTo(c);const area=Math.abs((b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x))/2;const R=(ab*bc*ac)/(4*Math.max(area,1e-12));const ang=2*Math.asin(Math.min(1,ac/(2*R)));text=`三点弧度\n半径 = ${fmt(R*MM)} mm\n圆心角 = ${fmt(THREE.MathUtils.radToDeg(ang))} °\n弧长 = ${fmt(R*ang*MM)} mm`;}$('cad3dResult').textContent=text;};
    const old=pickPoint; pickPoint=function(ev){old(ev);if(pickPoints.length>=need){check();pickPoint=old;}};
  }
  addButton(); window.open3DCad=openPanel;
})();
