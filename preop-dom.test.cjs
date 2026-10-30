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
