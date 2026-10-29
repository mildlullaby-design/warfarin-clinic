'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('./preop-core.js');
const base={anticoagulant:'warfarin',indication:'af',procedure:'General surgery',bleedingRisk:'lowmod',operationDate:'2026-11-12',crCl:70,neuraxial:'no'};
const ap={...base,anticoagulant:'apixaban',apixDose:'5'};
function p(x){return C.plan({...base,...x});}
test('date conversion Gregorian to Buddhist era',()=>{assert.equal(C.thaiDate('2026-11-12'),'12/11/2569');assert.equal(C.thaiDate(C.shiftDate('2026-11-12',-1)),'11/11/2569');assert.equal(C.thaiDate(C.shiftDate('2026-11-12',2)),'14/11/2569');});
test('invalid dates rejected',()=>assert.throws(()=>C.iso('2026-02-30')));
test('CKD Cockcroft-Gault arithmetic',()=>assert.ok(Math.abs(C.crclCG(60,'female',60,1.2)-47.22)<0.01));
test('C01 warfarin AF low/moderate, no bridge = prose + 5-day hold',()=>{const a=p({});assert.equal(a.layout,'concise-prose');assert.equal(a.holdDays,5);assert.equal(a.bridging,false);assert.equal(a.days.length,0);assert.ok(a.instructions.join(' ').includes('07/11/2569'));});
test('C02 recent stroke triggers physician review',()=>assert.ok(p({recentStroke:'yes'}).blockers.length>0));
test('C03 mechanical mitral major bridge = 14 day conditional grid',()=>{
 const a=p({indication:'mechanical',valvePosition:'mitral',bleedingRisk:'high',bridgeChoice:'yes',bridgeConfirmed:true,riskReviewed:true,weightKg:53,crCl:65,lmwhMgPerKg:1});
 assert.equal(a.bridging,true);assert.equal(a.layout,'bridging-grid');assert.equal(a.days.length,14);
 assert.equal(a.dose.mg,53);assert.equal(a.dose.volume,'0.53');assert.equal(a.dose.ampoules,1);
 assert.ok(a.instructions.join(' ').includes('INR'));
 assert.ok(a.instructions.join(' ').includes('48–72 h'));
});
test('C04 mechanical valve low/mod not automatic four-day hold',()=>assert.ok(p({indication:'mechanical'}).blockers.some(x=>x.includes('Mechanical valve'))));
test('C05 minimal warfarin continue',()=>{const a=p({bleedingRisk:'minimal',indication:'mechanical'});assert.equal(a.action,'continue');assert.equal(a.layout,'concise-prose')});
test('C06 recent VTE review',()=>assert.ok(p({indication:'vte',recentVTE:'yes'}).blockers.length>0));
test('C07 CrCl 22 blocks automatic therapeutic LMWH',()=>assert.ok(p({indication:'mechanical',bleedingRisk:'high',riskReviewed:true,bridgeChoice:'yes',bridgeConfirmed:true,weightKg:53,crCl:22}).blockers.some(x=>x.includes('CrCl <30'))));
test('C08 apixaban minimal continue, no grid',()=>{const a=C.plan({...ap,bleedingRisk:'minimal'});assert.equal(a.action,'continue');assert.equal(a.days.length,0)});
test('C09 apixaban high bleed, restart window',()=>{const a=C.plan({...ap,bleedingRisk:'high'});assert.equal(a.holdDays,2);assert.equal(a.layout,'concise-prose');assert.ok(a.instructions.join(' ').includes('14/11/2569'));assert.ok(a.instructions.join(' ').includes('15/11/2569'))});
test('C10 apixaban CrCl 22 requires reviewed extended hold',()=>assert.ok(C.plan({...ap,bleedingRisk:'high',crCl:22}).blockers.length>0));
test('C11 apixaban high dose neuraxial 72-hour verification',()=>{
 assert.ok(C.plan({...ap,bleedingRisk:'high',neuraxial:'yes',operationTime:'08:00',lastDoseDateTime:'2026-11-09T09:00'}).blockers.some(x=>x.includes('72 h')));
 const a=C.plan({...ap,bleedingRisk:'high',neuraxial:'yes',operationTime:'08:00',lastDoseDateTime:'2026-11-09T08:00'});
 assert.equal(a.blockers.length,0);assert.ok(a.instructions.join(' ').includes('ASRA timed'));
});
test('C12 apixaban 2.5mg dose category requires review',()=>assert.ok(C.plan({...ap,apixDose:'2.5',neuraxial:'yes',operationTime:'08:00',lastDoseDateTime:'2026-11-09T07:00'}).blockers.length>0));
test('C13 warfarin neuraxial holds five days and note normalized INR',()=>{const a=p({bleedingRisk:'minimal',neuraxial:'yes'});assert.equal(a.holdDays,5);assert.ok(a.warnings.join(' ').includes('normalized'));});
test('C14 therapeutic enox + neuraxial note',()=>{const a=p({bleedingRisk:'high',indication:'mechanical',riskReviewed:true,bridgeChoice:'yes',bridgeConfirmed:true,crCl:60,weightKg:53,neuraxial:'yes'});assert.ok(a.warnings.join(' ').includes('≥24 h'));});
test('C15 no operation date blocks Final',()=>{const a=p({operationDate:''});assert.equal(a.draft,true);assert.equal(a.operationDate,null);});
test('C16 dated prose without bridge',()=>{const a=C.plan({...ap,bleedingRisk:'high'});assert.ok(a.instructions.join(' ').includes('10/11/2569'));});
test('C17 73 mg dose needs two single-use ampoules',()=>{const a=C.enoxaparin(73,1);assert.equal(a.volume,'0.73');assert.equal(a.ampoules,2);});
test('C18 weekly-only does not invent daily regimen',()=>{const a=p({weeklyDose:20});assert.equal(a.days.length,0);assert.ok(a.instructions.join(' ').includes('Do not infer'));});
test('C19 final confirmation revision mismatch requires reconfirmation by UI',()=>{const a=p({});assert.equal(a.canFinalize,false);assert.equal(C.plan({...base,physicianConfirmed:true}).canFinalize,true)});
test('C21 unclassified procedure risk blocks final',()=>assert.ok(p({bleedingRisk:''}).blockers.length>0));
test('C22 unknown anesthesia uses note, not ASRA-72 automatic',()=>{const a=C.plan({...ap,bleedingRisk:'high',neuraxial:'unknown'});assert.equal(a.holdDays,2);assert.ok(a.warnings.join(' ').includes('ASRA'));});
test('no dose calculation on invalid weight',()=>assert.equal(C.enoxaparin('',1),null));
test('clock hour calculation includes dates and minutes',()=>assert.equal(C.clockHours('2026-11-09T08:00','2026-11-12','08:00'),72));

test('Apixaban dose missing never finalizes',()=>assert.ok(C.plan({...ap,apixDose:'',bleedingRisk:'high'}).blockers.length>0));
test('Known neuraxial + LMWH bridging cannot claim verified timing without timestamps',()=>assert.ok(p({indication:'mechanical',bleedingRisk:'high',bridgeChoice:'yes',bridgeConfirmed:true,riskReviewed:true,crCl:65,weightKg:53,neuraxial:'yes'}).blockers.some(x=>x.includes('ASRA LMWH'))));
