(function(){'use strict';
function el(tag,cls){var n=document.createElement(tag);if(cls)n.className=cls;return n;}
function makeItem(label,node,wide){var w=el('div','ribbon-item'+(wide?' wide':''));var l=el('span','ribbon-label');l.textContent=label;w.appendChild(l);w.appendChild(node);return w;}
function inputClone(id,topId,type){var src=document.getElementById(id),n=document.createElement('input');n.id=topId;n.type=type||'text';n.className='ribbon-input';if(src){n.value=src.value;n.checked=!!src.checked;}function sync(){if(!src)return;if(n.type==='checkbox')src.checked=n.checked;else src.value=n.value;src.dispatchEvent(new Event('input',{bubbles:true}));src.dispatchEvent(new Event('change',{bubbles:true}));}n.addEventListener('input',sync);n.addEventListener('change',sync);return n;}
function colorClone(id,topId){var n=inputClone(id,topId,'color');n.className='ribbon-color';return n;}
function buttonClone(text,action,cls){var b=document.createElement('button');b.type='button';b.textContent=text;if(cls)b.className=cls;b.onclick=action;return b;}
function activateBubble(){var b=document.querySelector('.tool[data-tool="bubble"]');if(b)b.click();}
function rebuild(){
  if(document.getElementById('orderedRibbon'))return;
  var old=document.querySelector('.ribbon');if(!old)return;
  var r=el('div','ribbon ordered-ribbon');r.id='orderedRibbon';
  var open=document.getElementById('openBtn'),save=document.getElementById('save'),print=document.getElementById('print'),undo=document.getElementById('undo'),clear=document.getElementById('clear');
  if(open)r.appendChild(open);if(save)r.appendChild(save);if(print)r.appendChild(print);
  r.appendChild(buttonClone('📍 点击添加',activateBubble,'bubble-add'));
  r.appendChild(makeItem('下一个序号',inputClone('seq','topSeq','number')));
  r.appendChild(makeItem('圆圈大小',inputClone('size','topSize','number')));
  r.appendChild(makeItem('外圈粗细',inputClone('border','topBorder','number')));
  r.appendChild(makeItem('字号',inputClone('font','topFont','number')));
  r.appendChild(makeItem('外圈色',colorClone('outer','topOuter')));
  var tr=document.createElement('input');tr.id='topFillTransparent';tr.type='checkbox';tr.checked=!!(document.getElementById('fillTransparent')||{}).checked;tr.className='ribbon-check';tr.addEventListener('change',function(){var s=document.getElementById('fillTransparent');if(s){s.checked=tr.checked;s.dispatchEvent(new Event('input',{bubbles:true}));}});
  r.appendChild(makeItem('透明背景',tr));
  r.appendChild(makeItem('填充色',colorClone('fillColor','topFill')));
  var op=document.createElement('input');op.id='topOpacity';op.type='range';op.min='0';op.max='100';op.value='100';op.className='ribbon-range';r.appendChild(makeItem('透明度',op));
  r.appendChild(makeItem('字体色',colorClone('fontColor','topFontColor')));
  if(undo)r.appendChild(undo);if(clear)r.appendChild(clear);
  old.replaceWith(r);
  var style=document.createElement('style');style.textContent='.ordered-ribbon{display:flex;align-items:center;gap:6px;padding:5px 10px;background:#fff;border-bottom:1px solid #dbe2ea;box-shadow:0 1px 2px #0001;overflow-x:auto;overflow-y:hidden;white-space:nowrap;scrollbar-width:thin}.ordered-ribbon>button{flex:0 0 auto;padding:6px 10px;font-size:12px}.ordered-ribbon .ribbon-item{display:flex;align-items:center;gap:4px;flex:0 0 auto;border-left:1px solid #e2e8f0;padding-left:7px}.ordered-ribbon .ribbon-label{font-size:11px;color:#64748b}.ordered-ribbon .ribbon-input{width:58px;height:28px;padding:4px 6px;border:1px solid #cbd5e1;border-radius:4px}.ordered-ribbon .ribbon-color{width:30px;height:28px;padding:1px;border:1px solid #cbd5e1;border-radius:4px}.ordered-ribbon .ribbon-check{width:16px;height:16px}.ordered-ribbon .ribbon-range{width:100px}.ordered-ribbon .bubble-add{background:#16a36a;color:#fff;border-color:#16a36a;font-weight:700}.ordered-ribbon .danger{color:#b42318!important}.ordered-ribbon::-webkit-scrollbar{height:7px}.ordered-ribbon::-webkit-scrollbar-thumb{background:#b8c4d4;border-radius:8px}';document.head.appendChild(style);
  if(document.querySelector('.panel .section')){var sec=document.querySelector('.panel .section');if(sec)sec.style.display='none';}
  op.addEventListener('input',function(){var fill=document.getElementById('fillColor');if(fill){fill.style.opacity=String(Math.max(0,Math.min(1,Number(op.value)/100)));}});
}
function install(){try{rebuild();}catch(e){console.error('ribbon-order',e);}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
setTimeout(install,500);setTimeout(install,1500);setTimeout(install,3000);
})();
