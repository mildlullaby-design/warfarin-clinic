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


test('CHEST 2022 AF bridge guidance defaults to no routine bridging',()=>{
  assert.equal(core.afBridgeRecommendation({}).recommendation,'against-routine-bridging');
  assert.match(core.afBridgeRecommendation({}).reason,/CHEST 2022/);
});
test('AF recent stroke remains individual review rather than automatic bridging',()=>{
  const rec=core.afBridgeRecommendation({recentStroke:'yes'});
  assert.equal(rec.recommendation,'individual-review');
  const p=core.plan({...basis,bleedingRisk:'high',recentStroke:'yes',bridgeChoice:'no',riskReviewed:true});
  assert.equal(p.bridging,false);
});
test('LMWH physician-selected dose is used for exact mg/mL conversion',()=>{
  const p=core.plan({
    ...basis,bleedingRisk:'high',weightKg:73,crCl:65,
    bridgeChoice:'yes',bridgeConfirmed:true,riskReviewed:true,lmwhMgPerDose:'65'
  });
  assert.equal(p.dose.mg,65);
  assert.equal(p.dose.exactMl,0.65);
  assert.equal(p.dose.volume,'0.65');
});
test('LMWH dose rejects invalid manual override, rather than silently reverting',()=>{
  const p=core.plan({
    ...basis,bleedingRisk:'high',weightKg:73,crCl:65,
    bridgeChoice:'yes',bridgeConfirmed:true,riskReviewed:true,lmwhMgPerDose:'-20'
  });
  assert.equal(p.dose,null);
  assert.match(p.blockers.join(' '),/LMWH dose/);
});
test('table code includes day minus one INR check and avoids repetitive INR injection condition',()=>{
  const ui=fs.readFileSync(path.join(root,'preop-ui.js'),'utf8');
  assert.match(ui,/if\(day===-1\)/);
  assert.match(ui,/LAST therapeutic dose Day -1 AM ONLY/);
  assert.match(ui,/bridgeFootnote/);
  assert.doesNotMatch(ui,/ONLY if INR subtherapeutic and start confirmed/);
});
test('procedure reference is visible inline and supports group filter',()=>{
  const ui=fs.readFileSync(path.join(root,'preop-ui.js'),'utf8');
  assert.match(ui,/preRiskInline/);
  assert.match(ui,/preRiskInlineBody/);
  assert.match(ui,/preRiskGroup/);
  assert.match(ui,/Endoscopic polypectomy >=1 cm/);
});

test('surgical INR threshold remains below 1.5',()=>{
 const t=core.preopInrRequirement({anticoagulant:'warfarin',action:'hold',neuraxial:'no'});
 assert.equal(t.threshold,1.5);
 assert.equal(t.label,'INR <1.5');
});
test('neuraxial INR must normalize to local laboratory range',()=>{
 const t=core.preopInrRequirement({anticoagulant:'warfarin',action:'hold',neuraxial:'yes'});
 assert.equal(t.kind,'neuraxial');
 assert.equal(t.threshold,null);
});
test('no INR threshold when warfarin is continued or for apixaban',()=>{
 assert.equal(core.preopInrRequirement({anticoagulant:'warfarin',action:'continue'}),null);
 assert.equal(core.preopInrRequirement({anticoagulant:'apixaban',action:'hold'}),null);
});
