'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');

function openPreop(){
  const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
  const core=fs.readFileSync(path.join(__dirname,'preop-core.js'),'utf8');
  const ui=fs.readFileSync(path.join(__dirname,'preop-ui.js'),'utf8');
  const dom=new JSDOM(html,{url:'https://example.invalid/',runScripts:'outside-only',pretendToBeVisual:true});
  const {window}=dom;
  window.alert=()=>{};window.confirm=()=>true;
  window.HTMLElement.prototype.scrollIntoView=function(){};
  window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  window.HTMLDialogElement.prototype.close=function(){this.open=false;};
  window.eval(core);
  window.eval(ui);
  return dom;
}
test('Full DOM: assessment initializes five visible section cards (no missing fields)',()=>{
  const dom=openPreop();
  const doc=dom.window.document;
  const sections=[...doc.querySelectorAll('#preInputScreen #preAssessmentLayout > .pre-ui-section')];
  assert.equal(sections.length,5,'new layout should contain 5 section cards');
  assert.match(sections.map(s=>s.textContent).join(' / '),/Procedure & Patient[\s\S]+Anticoagulant[\s\S]+Thrombotic Risk[\s\S]+Bridging Plan[\s\S]+Risk Summary/);
  for(const id of ['preProcedure','preDate','preBleed','preName','preWeight','preDrug','preIndication','preBridge','preThromboticResult','prePreview']){
    assert.ok(doc.getElementById(id),'control '+id+' must exist');
    assert.ok(doc.getElementById(id).closest('#preAssessmentLayout'),'control '+id+' must appear in main assessment layout');
  }
  assert.equal(doc.getElementById('preAssessmentLayout').parentElement.id,'preInputScreen');
  dom.window.close();
});
test('Full DOM: switching indications retains inputs and risk table',()=>{
  const dom=openPreop(); const doc=dom.window.document, event=new dom.window.Event('change',{bubbles:true});
  doc.getElementById('preDrug').value='warfarin';doc.getElementById('preDrug').dispatchEvent(event);
  doc.getElementById('preIndication').value='mechanical';doc.getElementById('preIndication').dispatchEvent(event);
  assert.equal(doc.querySelector('#preRiskTable .pre-ui-risk-table tbody').children.length,3);
  assert.ok(!doc.getElementById('preValveExtra').classList.contains('hidden'));
  assert.ok(doc.querySelectorAll('#preValveExtra .pre-ui-risk-box').length===2);
  doc.getElementById('preIndication').value='vte';doc.getElementById('preIndication').dispatchEvent(event);
  assert.ok(!doc.getElementById('preVTEExtra').classList.contains('hidden'));
  assert.ok(doc.getElementById('preValveExtra').classList.contains('hidden'));
  dom.window.close();
});

test('AF bridging checkbox reasons follow existing thrombotic assessment without auto-selection',()=>{
  const dom=openPreop();
  const d=dom.window.document, fire=(id,value)=>{const x=d.getElementById(id);x.value=value;x.dispatchEvent(new dom.window.Event('change',{bubbles:true}));};
  fire('preDrug','warfarin');
  fire('preIndication','af');
  fire('preScore','7');
  fire('preAFStroke','recent');
  fire('preRheumaticMS','yes');
  fire('preAFClot','yes');
  fire('preBridge','yes');
  const list=d.querySelectorAll('#preAFBridgeReasonList input[name="preAFBridgeReason"]');
  const labels=[...list].map(x=>x.value);
  assert.equal(list.length,4);
  assert.ok(labels.some(x=>x.includes('CHA2DS2-VASc 7')));
  assert.ok(labels.some(x=>x.includes('Recent stroke/TIA')));
  assert.ok(labels.some(x=>x.includes('Rheumatic mitral stenosis')));
  assert.ok(labels.some(x=>x.includes('Prior thrombosis during')));
  assert.equal([...list].filter(x=>x.checked).length,0,'AF bridging reasons must never auto-tick');
  assert.ok(!d.getElementById('preAFBridgeOverride').classList.contains('hidden'));
  dom.window.close();
});
test('Selected AF reasons populate bridging line in A4 and HOSxP OPD Note, without manual typing',()=>{
  const dom=openPreop();
  const d=dom.window.document;
  const fire=(id,value,kind='change')=>{
    const x=d.getElementById(id);x.value=value;
    x.dispatchEvent(new dom.window.Event(kind,{bubbles:true}));
  };
  fire('preDrug','warfarin');fire('preIndication','af');
  fire('preProcedure','Total knee arthroplasty','change');
  fire('preDate','2026-11-12');
  fire('preAge','65');fire('preWeight','70');fire('preCrCl','70');
  fire('preWeekly','20');fire('preTargetInr','2-3');
  fire('preScore','7');fire('preAFStroke','recent');fire('preRheumaticMS','yes');fire('preAFClot','no');
  fire('preBridge','yes');
  const options=[...d.querySelectorAll('#preAFBridgeReasonList input')];
  const recent=options.find(x=>x.value.includes('Recent stroke/TIA'));
  const rheumatic=options.find(x=>x.value.includes('Rheumatic mitral stenosis'));
  assert.ok(recent&&rheumatic);
  recent.click();rheumatic.click();
  assert.equal(d.getElementById('preAFBridgeRationale').value,'','checkbox alone should suffice');
  d.getElementById('prePreview').click();
  const note=d.getElementById('preOPDNote').value;
  assert.match(note,/Bridging: Yes \(.*Rheumatic mitral stenosis.*Recent stroke\/TIA.*\)/);
  assert.ok(!note.includes('physician-reviewed individual decision'));
  const print=d.getElementById('prePrintSurface').textContent;
  assert.match(print,/Bridging:\s*Yes\s*—\s*Rheumatic mitral stenosis.*Recent stroke\/TIA/);
  dom.window.close();
});
test('AF risk data edits remove stale selected bridging checkbox reasons',()=>{
  const dom=openPreop();
  const d=dom.window.document;
  const fire=(id,value)=>{const x=d.getElementById(id);x.value=value;x.dispatchEvent(new dom.window.Event('change',{bubbles:true}));};
  fire('preDrug','warfarin');fire('preIndication','af');
  fire('preScore','7');fire('preAFStroke','none');fire('preRheumaticMS','yes');fire('preAFClot','no');
  fire('preBridge','yes');
  const item=[...d.querySelectorAll('#preAFBridgeReasonList input')].find(x=>x.value.includes('Rheumatic'));
  assert.ok(item);item.click();
  fire('preRheumaticMS','no');
  assert.ok(![...d.querySelectorAll('#preAFBridgeReasonList input')].some(x=>x.value.includes('Rheumatic')));
  dom.window.close();
});
test('CHA2DS2-VASc score alone cannot satisfy AF bridge rationale',()=>{
  const dom=openPreop();
  const d=dom.window.document;
  const fire=(id,value)=>{const x=d.getElementById(id);x.value=value;x.dispatchEvent(new dom.window.Event('change',{bubbles:true}));};
  fire('preDrug','warfarin');fire('preIndication','af');fire('preScore','7');
  fire('preAFStroke','none');fire('preRheumaticMS','no');fire('preAFClot','no');
  fire('preBridge','yes');
  const score=d.querySelector('#preAFBridgeReasonList input[name="preAFBridgeReason"]');
  assert.ok(score);score.click();
  d.getElementById('prePreview').click();
  assert.match(d.getElementById('preSafety').textContent,/CHA2DS2-VASc อย่างเดียวไม่เพียงพอ/);
  dom.window.close();
});

test('Complete AF bridging workflow: selected reason and actual Enoxaparin mg/dose allow Final A4',()=>{
  const dom=openPreop(),d=dom.window.document;
  function set(id,v){const x=d.getElementById(id);x.value=v;x.dispatchEvent(new dom.window.Event('input',{bubbles:true}));x.dispatchEvent(new dom.window.Event('change',{bubbles:true}));}
  set('preDrug','warfarin');set('preIndication','af');
  set('preProcedure','Total knee arthroplasty');set('preDate','2026-11-12');
  set('preAge','65');set('preSex','male');set('preWeight','70');set('preCr','1');
  set('preWeekly','20');set('preTargetInr','2-3');set('preNeuraxial','no');
  set('preScore','7');set('preAFStroke','recent');set('preRheumaticMS','yes');set('preAFClot','no');
  set('preBridge','yes');
  const option=[...d.querySelectorAll('#preAFBridgeReasonList input')].find(x=>x.value.includes('Recent stroke/TIA'));
  assert.ok(option);option.click();assert.equal(option.checked,true);
  set('preLmwhDose','70');
  assert.equal(d.getElementById('preLmwhDose').value,'70');
  assert.match(d.getElementById('preLmwhVolume').textContent,/70 mg/);
  d.getElementById('prePreview').click();
  assert.equal(d.getElementById('prePrint').disabled,false,'valid AF bridging selection must allow finalization, blockers: '+d.getElementById('preSafety').textContent);
  assert.match(d.getElementById('preOPDNote').value,/Bridging: Yes \(Recent stroke\/TIA/);
  assert.match(d.getElementById('preOPDNote').value,/Enoxaparin 70 mg/);
  dom.window.close();
});
test('AF reason check remains selected when other non-risk field changed',()=>{
  const dom=openPreop(),d=dom.window.document;
  const set=(id,v)=>{let e=d.getElementById(id);e.value=v;e.dispatchEvent(new dom.window.Event('input',{bubbles:true}));};
  set('preDrug','warfarin');set('preIndication','af');set('preScore','7');set('preAFStroke','recent');set('preRheumaticMS','yes');
  set('preBridge','yes');
  const cb=[...d.querySelectorAll('#preAFBridgeReasonList input')].find(x=>x.value.includes('Recent stroke'));
  assert.ok(cb);cb.click();assert.equal(cb.checked,true);
  set('preWeight','65');
  assert.equal([...d.querySelectorAll('#preAFBridgeReasonList input')].find(x=>x.value.includes('Recent stroke')).checked,true);
  dom.window.close();
});
test('Known VTE timing and optional mechanical unknown generation survive navigation',()=>{
  const dom=openPreop(),d=dom.window.document;
  function set(id,v){const x=d.getElementById(id);x.value=v;x.dispatchEvent(new dom.window.Event('change',{bubbles:true}));}
  set('preDrug','warfarin');set('preIndication','vte');set('preVTETime','lt3');set('preVTEType','pe');
  assert.equal(d.getElementById('preVTETime').value,'lt3');
  set('preIndication','mechanical');set('preValveGeneration','unknown');set('preValveStroke','none');
  assert.equal(d.getElementById('preValveGeneration').value,'unknown');
  dom.window.close();
});
