(() => {
  'use strict';
  if (window.__advanced3DLoaded) return;
  window.__advanced3DLoaded = true;

  const S = window.THREE;
  const state = { scene:null, camera:null, renderer:null, controls:null, root:null, measureGroup:null, unitScale:1, snap:null };

  function mm(v){ return Number(v) * state.unitScale; }
  function fmt(v){ return `${mm(v).toFixed(3)} mm`; }
  function allObjects(){ const a=[]; if(state.root) state.root.traverse(o=>{if(o.isMesh) a.push(o);}); return a; }
  function bounds(){ if(!state.root) return null; const b=new S.Box3().setFromObject(state.root); return {b,size:b.getSize(new S.Vector3()),center:b.getCenter(new S.Vector3())}; }
  function toast(msg){ if(window.showToast) window.showToast(msg); else alert(msg); }

  function addMeasurementLine(a,b,label){
    if(!state.measureGroup) return;
    const g=new S.BufferGeometry().setFromPoints([a,b]);
    const l=new S.Line(g,new S.LineBasicMaterial({color:0xffaa00}));
    state.measureGroup.add(l);
    const d=a.distanceTo(b);
    if(window.add3DMeasurementLabel) window.add3DMeasurementLabel((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2,label);
    return d;
  }

  function boundingBox(){
    const q=bounds(); if(!q) return;
    const h=new S.Box3Helper(q.b,0x44aaff); state.measureGroup.add(h);
    toast(`包围尺寸：${fmt(q.size.x)} × ${fmt(q.size.y)} × ${fmt(q.size.z)}`);
    return q.size;
  }

  function pointDistance(a,b){
    const d=a.distanceTo(b); addMeasurementLine(a,b,fmt(d)); return mm(d);
  }

  function angle3(a,b,c){
    const v1=a.clone().sub(b).normalize(), v2=c.clone().sub(b).normalize();
    const deg=S.MathUtils.radToDeg(Math.acos(S.MathUtils.clamp(v1.dot(v2),-1,1)));
    addMeasurementLine(b,a,`${deg.toFixed(3)}°`); addMeasurementLine(b,c,'');
    toast(`角度：${deg.toFixed(3)}°`); return deg;
  }

  function nearestPoint(raycaster){
    const hits=raycaster.intersectObjects(allObjects(),true);
    return hits.length ? hits[0].point.clone() : null;
  }

  function enableMeasure(tool){
    const canvas=state.renderer && state.renderer.domElement; if(!canvas) return toast('请先打开 3D 模型');
    state.snap={tool,points:[]};
    toast(`3D测量：${tool}。请在模型上依次点击取点。`);
  }

  function onPick(e){
    if(!state.snap || !state.camera || !state.renderer) return;
    const r=state.renderer.domElement.getBoundingClientRect();
    const n=new S.Vector2(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);
    const rc=new S.Raycaster(); rc.setFromCamera(n,state.camera);
    const p=nearestPoint(rc); if(!p) return toast('没有拾取到模型表面');
    state.snap.points.push(p);
    const t=state.snap.tool, ps=state.snap.points;
    if(t==='distance' && ps.length===2){pointDistance(ps[0],ps[1]);state.snap=null;}
    else if(t==='angle' && ps.length===3){angle3(ps[0],ps[1],ps[2]);state.snap=null;}
    else if(t==='point' && ps.length===1){toast(`点坐标：X ${fmt(p.x)} / Y ${fmt(p.y)} / Z ${fmt(p.z)}`);state.snap=null;}
  }

  function clearMeasurements(){ if(state.measureGroup) { while(state.measureGroup.children.length) state.measureGroup.remove(state.measureGroup.children[0]); } }

  window.attachAdvanced3D = function(ctx){
    Object.assign(state,ctx||{});
    if(!state.measureGroup && state.scene){ state.measureGroup=new S.Group(); state.scene.add(state.measureGroup); }
    if(state.renderer) state.renderer.domElement.addEventListener('click',onPick);
    return state;
  };
  window.set3DUnitScale = s => { state.unitScale=Number(s)||1; };
  window.measure3DBounds = boundingBox;
  window.measure3DDistance = () => enableMeasure('distance');
  window.measure3DAngle = () => enableMeasure('angle');
  window.measure3DPoint = () => enableMeasure('point');
  window.clear3DMeasurements = clearMeasurements;
  window.set3DWireframe = on => allObjects().forEach(m=>{if(m.material) m.material.wireframe=!!on;});
  window.set3DTransparent = on => allObjects().forEach(m=>{if(m.material){m.material.transparent=!!on;m.material.opacity=on?.35:1;m.material.depthWrite=!on;}});
  window.set3DExplode = factor => {
    const q=bounds(); if(!q) return;
    const c=q.center; allObjects().forEach(m=>{const p=m.getWorldPosition(new S.Vector3());const v=p.sub(c);m.position.add(v.multiplyScalar(Number(factor)||0));});
  };
  window.reset3DView = () => { if(state.controls && state.controls.reset) state.controls.reset(); };
  window.fit3DView = () => { const q=bounds(); if(!q||!state.camera||!state.controls) return; state.controls.target.copy(q.center); const r=Math.max(q.size.x,q.size.y,q.size.z)||1; state.camera.position.copy(q.center.clone().add(new S.Vector3(r*1.8,r*1.2,r*1.8))); state.controls.update(); };
})();