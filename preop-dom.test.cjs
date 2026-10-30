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
  assert.match(sections.map(s=>s.textContent).join(' / '),/Procedure & Patient[\s\S]+Anticoagulant[\s\S]+Thrombotic Risk[\s\S]+Risk Summary[\s\S]+Bridging Plan/);
  for(const id of ['preProcedure','preDate','preBleed','preName','preWeight','preDrug','preIndication','preBridge','preThromboticResult','prePreview']){
    assert.ok(doc.getElementById(id),'control '+id+' must exist');
    assert.ok(doc.getElementById(id).closest('#preAssessmentLayout'),'control '+id+' must appear in main assessment layout');
  }
  assert.equal(doc.getElementById('preAssessmentLayout').parentElement.id,'preInputScreen');
  dom.window.close();
});
test('Full DOM: step 04 shows both selected risks before step 05 bridging',()=>{
  const dom=openPreop(),d=dom.window.document;
  const sections=[...d.querySelectorAll('#preAssessmentLayout > .pre-ui-section')];
  assert.equal(sections.length,5);
  assert.match(sections[3].textContent,/04\s*Risk Summary & Reference/);
  assert.match(sections[4].textContent,/05\s*Bridging Plan/);
  assert.ok(sections[3].contains(d.getElementById('preBleedingRiskResult')));
  assert.ok(sections[3].contains(d.getElementById('preThromboticResult')));
  assert.ok(sections[4].contains(d.getElementById('preBridge')));
  assert.ok(sections[4].contains(d.getElementById('prePreview')));
  const set=(id,value)=>{
    const el=d.getElementById(id);
    el.value=value;
    el.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
  };
  set('preDrug','warfarin');
  set('preIndication','af');
  set('preProcedure','Thyroidectomy');
  set('preScore','7');
  set('preAFStroke','none');
  set('preRheumaticMS','no');
  set('preAFClot','no');
  const bleeding=d.getElementById('preBleedingRiskResult').textContent;
  const thrombotic=d.getElementById('preThromboticResult').textContent;
  assert.match(bleeding,/High/);
  assert.match(bleeding,/Thyroidectomy/);
  assert.match(thrombotic,/HIGH/);
  assert.match(thrombotic,/CHA2DS2-VASc 7/);
  set('preProcedure','Cataract surgery');
  assert.match(d.getElementById('preBleedingRiskResult').textContent,/Minimal/);
  assert.match(d.getElementById('preBleedingRiskResult').textContent,/Cataract surgery/);
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

test('AF reason checkbox immediately confirms receipt and maintains selection across unrelated edits',()=>{
  const dom=openPreop(),d=dom.window.document;
  const set=(id,v)=>{const el=d.getElementById(id);el.value=v;el.dispatchEvent(new dom.window.Event('input',{bubbles:true}));};
  set('preDrug','warfarin');set('preIndication','af');set('preScore','7');
  set('preAFStroke','recent');set('preRheumaticMS','yes');set('preBridge','yes');
  const cb=[...d.querySelectorAll('#preAFBridgeReasonList input')].find(x=>x.value.includes('Recent stroke/TIA'));
  assert.ok(cb);cb.click();
  assert.equal(cb.checked,true);
  assert.match(d.getElementById('preAFBridgeSelectedStatus').textContent,/เลือก Supporting reasons แล้ว 1 ข้อ/);
  set('preWeight','67');
  assert.match(d.getElementById('preAFBridgeSelectedStatus').textContent,/1 ข้อ/);
  set('preAFStroke','none');
  assert.match(d.getElementById('preAFBridgeSelectedStatus').textContent,/ยังไม่ได้เลือก/);
  dom.window.close();
});
test('Enoxaparin mg/dose is acknowledged, does not reset when unrelated field changes and reset button works',()=>{
  const dom=openPreop(),d=dom.window.document;
  const set=(id,v)=>{const el=d.getElementById(id);el.value=v;el.dispatchEvent(new dom.window.Event('input',{bubbles:true}));};
  set('preDrug','warfarin');set('preIndication','af');set('preBridge','yes');
  set('preWeight','63');set('preCrCl','70');
  assert.equal(d.getElementById('preLmwhDose').value,'63');
  set('preLmwhDose','58');
  assert.match(d.getElementById('preLmwhDoseStatus').textContent,/รับค่า 58 mg\/dose/);
  assert.equal(d.getElementById('preLmwhDoseStatus').dataset.state,'ready');
  set('preDate','2026-11-12');
  assert.equal(d.getElementById('preLmwhDose').value,'58');
  d.getElementById('preLmwhResetDose').click();
  assert.equal(d.getElementById('preLmwhDose').value,'63');
  set('preCrCl','20');
  assert.equal(d.getElementById('preLmwhDoseStatus').dataset.state,'blocked');
  assert.match(d.getElementById('preLmwhDoseStatus').textContent,/CrCl 20.0/);
  dom.window.close();
});
test('Selected bridging with non-interrupted Warfarin reports choice and scheduling block instead of No',()=>{
  const dom=openPreop(),d=dom.window.document;
  const set=(id,v)=>{const el=d.getElementById(id);el.value=v;el.dispatchEvent(new dom.window.Event('change',{bubbles:true}));};
  set('preDrug','warfarin');set('preIndication','af');
  set('preProcedure','Cataract surgery');set('preDate','2026-11-12');
  set('preWeight','70');set('preCrCl','80');set('preScore','7');
  set('preAFStroke','recent');set('preRheumaticMS','yes');set('preAFClot','no');
  set('preWeekly','21');set('preTargetInr','2-3');set('preNeuraxial','no');set('preBridge','yes');
  const cb=d.querySelector('#preAFBridgeReasonList input');cb.click();
  d.getElementById('prePreview').click();
  assert.match(d.getElementById('prePlan').textContent,/Bridging decision: Yes selected — not schedulable/);
  assert.match(d.getElementById('preSafety').textContent,/Bridging cannot be scheduled/);
  assert.equal(d.getElementById('prePrint').disabled,true);
  dom.window.close();
});
test('Valve and VTE checkbox/select state stays recognized during unrelated changes',()=>{
  const dom=openPreop(),d=dom.window.document;
  const set=(id,v)=>{const el=d.getElementById(id);el.value=v;el.dispatchEvent(new dom.window.Event('input',{bubbles:true}));};
  set('preDrug','warfarin');set('preIndication','mechanical');
  const mitral=d.querySelector('input[name="preValveAt"][value="mitral"]');
  const lvef=d.querySelector('input[name="preValveFactor"][value="lvef"]');
  mitral.click();lvef.click();set('preWeight','72');
  assert.equal(mitral.checked,true);assert.equal(lvef.checked,true);
  assert.match(d.getElementById('preThromboticResult').textContent,/Mechanical mitral valve/);
  assert.match(d.getElementById('preThromboticResult').textContent,/LVEF <35%/);
  set('preIndication','vte');set('preVTETime','lt3');set('preVTEThromb','aps');
  assert.match(d.getElementById('preThromboticResult').textContent,/Recent VTE/);
  assert.match(d.getElementById('preThromboticResult').textContent,/Antiphospholipid syndrome/);
  dom.window.close();
});

test('Risk summary acknowledges AF entries, differentiates missing inputs, and never claims selection was lost',()=>{
  const dom=openPreop(),d=dom.window.document;
  const set=(id,v)=>{const el=d.getElementById(id);el.value=v;el.dispatchEvent(new dom.window.Event('input',{bubbles:true}));};
  set('preIndication','af');set('preScore','5');set('preAFStroke','recent');
  let status=d.getElementById('preThromboticResult').textContent;
  assert.match(status,/รับข้อมูลแล้ว 2\/4 ช่อง/);
  assert.match(status,/ยังไม่ระบุ: Rheumatic MS, Prior thrombosis during interruption/);
  set('preRheumaticMS','yes');set('preAFClot','unknown');
  status=d.getElementById('preThromboticResult').textContent;
  assert.match(status,/รับข้อมูลแล้ว 4\/4 ช่อง/);
  assert.match(status,/ครบทุกช่องที่ต้องเลือก/);
  dom.window.close();
});
test('Free-text AF rationale is acknowledged even without a selected checkbox',()=>{
  const dom=openPreop(),d=dom.window.document;
  const set=(id,v)=>{const el=d.getElementById(id);el.value=v;el.dispatchEvent(new dom.window.Event('input',{bubbles:true}));};
  set('preDrug','warfarin');set('preIndication','af');set('preBridge','yes');
  set('preAFBridgeRationale','Physician-specific rationale noted');
  assert.match(d.getElementById('preAFBridgeSelectedStatus').textContent,/รับเหตุผลเพิ่มเติมแล้ว/);
  dom.window.close();
});

test('Optional HN appears after name; absent operation date leaves all 15 A4 date cells blank and Draft-only print',()=>{
  const dom=openPreop(),d=dom.window.document;
  const put=(id,value)=>{
    const e=d.getElementById(id);
    e.value=value;
    e.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
  };
  assert.ok(d.getElementById('preHN'));
  assert.match(d.querySelector('label[for="preDate"]').textContent,/Optional/);
  assert.ok(d.getElementById('preHN').closest('#preAssessmentLayout'));
  put('preDrug','warfarin');put('preIndication','af');
  put('preProcedure','Thyroidectomy');put('preAge','67');
  put('preWeight','58');put('preCrCl','49');put('preWeekly','22');
  put('preTargetInr','2-3');put('preScore','7');
  put('preAFStroke','none');put('preRheumaticMS','yes');put('preAFClot','no');
  put('preHN','01234567');
  d.getElementById('prePreview').click();
  const preview=d.getElementById('prePrintSurface');
  assert.match(preview.querySelector('.pre-header-patient').textContent,/ชื่อผู้ป่วย:.*HN: 01234567.*อายุ:/);
  assert.equal(preview.querySelector('.pre-header-date').textContent.trim(),'วันที่:');
  assert.match(preview.querySelector('.pre-a4-undated-notice').textContent,/กรอกวันผ่าตัดและวันที่ทุกแถว/);
  const cells=[...preview.querySelectorAll('.pre-print-grid tbody .pre-a4-date')];
  assert.equal(cells.length,15);
  for(const cell of cells)assert.equal(cell.textContent,'');
  assert.equal(d.getElementById('prePrint').disabled,true,'no undated Final plan');
  assert.ok(d.getElementById('preDraftPrint'));
  assert.match(d.getElementById('preSafety').textContent,/Operation date missing/);
  dom.window.close();
});
test('Known operation date calculates calendar as before while optional HN may be omitted',()=>{
  const dom=openPreop(),d=dom.window.document;
  const put=(id,value)=>{
    const e=d.getElementById(id);e.value=value;
    e.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
  };
  put('preDrug','warfarin');put('preIndication','af');
  put('preProcedure','Thyroidectomy');put('preDate','2026-11-04');
  put('preAge','67');put('preWeight','58');put('preCrCl','49');
  put('preWeekly','22');put('preTargetInr','2-3');
  put('preScore','7');put('preAFStroke','none');put('preRheumaticMS','yes');put('preAFClot','no');
  d.getElementById('prePreview').click();
  const preview=d.getElementById('prePrintSurface');
  assert.equal(preview.querySelector('.pre-header-date').textContent.trim(),'วันที่: 04/11/2569');
  assert.match(preview.querySelector('.pre-header-patient').textContent,/HN: \.+/);
  assert.equal(preview.querySelector('.pre-a4-undated-notice'),null);
  const dateCells=[...preview.querySelectorAll('.pre-print-grid tbody .pre-a4-date')].map(e=>e.textContent);
  assert.equal(dateCells.length,15);
  assert.equal(dateCells[0],'28/10/2569');
  assert.equal(dateCells[7],'04/11/2569');
  assert.equal(dateCells[14],'11/11/2569');
  dom.window.close();
});
