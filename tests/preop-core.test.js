/* Pre-op smoke checks. Run: node --test tests/preop-core.test.js */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const core=require('../preop-core.js');
const root=path.join(__dirname,'..');
test('UI and core scripts have valid JavaScript syntax',()=>{
  for(const file of ['preop-ui.js','preop-core.js']){
    assert.doesNotThrow(()=>new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file}));
  }
});
test('only one active preop UI script is referenced',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
  assert.match(html,/<script src="preop-ui\.js"><\/script>/);
  assert.doesNotMatch(html,/preop-v2\.js/);
  assert.match(sw,/'\.\/preop-ui\.js'/);
});
test('operation-relative dates safely cross years and produce Thai Buddhist years',()=>{
  assert.equal(core.shiftDate('2026-12-30',7),'2027-01-06');
  assert.equal(core.thaiDate('2027-01-06'),'06/01/2570');
});
test('hospital enoxaparin stock maps 60 mg to 0.6 mL',()=>{
  const d=core.enoxaparin(60);
  assert.equal(d.mg,60);
  assert.equal(d.exactMl,0.6);
  assert.equal(d.ampoules,1);
});
const basis={
  anticoagulant:'warfarin',indication:'af',procedure:'Cataract surgery',
  bleedingRisk:'minimal',operationDate:'2026-10-30',neuraxial:'no',weeklyDose:'21'
};
test('minimal risk warfarin example is not assigned therapeutic bridging automatically',()=>{
  const p=core.plan({...basis});
  assert.equal(p.action,'continue');
  assert.equal(p.bridging,false);
});
test('apixaban high bleeding risk sample generates a 2-day pre-op hold draft',()=>{
  const p=core.plan({...basis,anticoagulant:'apixaban',bleedingRisk:'high',apixDose:'5',crCl:'65'});
  assert.equal(p.action,'hold');
  assert.equal(p.holdDays,2);
  assert.equal(p.bridging,false);
});
test('apixaban with CrCl below 30 requires individual hold review',()=>{
  const p=core.plan({...basis,anticoagulant:'apixaban',bleedingRisk:'high',apixDose:'5',crCl:'23'});
  assert.equal(p.draft,true);
  assert.match(p.blockers.join(' '),/Severe renal impairment/);
});
test('mechanical heart valve on apixaban is blocked',()=>{
  const p=core.plan({...basis,anticoagulant:'apixaban',indication:'mechanical',apixDose:'5',crCl:'60'});
  assert.equal(p.draft,true);
  assert.match(p.blockers.join(' '),/mechanical-valve/);
});
test('no patient data storage API is used by preop modules',()=>{
  for(const file of ['preop-ui.js','preop-core.js']){
    const src=fs.readFileSync(path.join(root,file),'utf8');
    assert.doesNotMatch(src,/\b(?:localStorage|sessionStorage|indexedDB)\b/);
  }
});
