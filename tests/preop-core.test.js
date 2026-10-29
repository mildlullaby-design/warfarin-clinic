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
  assert.match(ui,/Hold enoxaparin at least 24 h before surgery/);
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


test('operation time is optional and missing high-dose apixaban neuraxial time stays a review warning',()=>{
 const p=core.plan({...basis,anticoagulant:'apixaban',indication:'af',bleedingRisk:'high',
   apixDose:'5',crCl:'75',neuraxial:'yes',operationTime:'',lastDoseDateTime:''});
 assert.doesNotMatch(p.blockers.join(' '),/operation time and exact last-dose datetime required/);
 assert.match(p.warnings.join(' '),/exact time not entered/);
});
test('missing input feedback has visible red flags and fix-navigation',()=>{
 const ui=fs.readFileSync(path.join(root,'preop-ui.js'),'utf8');
 const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
 assert.match(ui,/highlightReviewFields/);
 assert.match(ui,/data-fix-input/);
 assert.match(ui,/aria-invalid/);
 assert.match(css,/pre-needs-attention/);
 assert.match(css,/pre-input-error-hint/);
});
test('print uses Sarabun and A4 margins',()=>{
 const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(css,/font-family:"Sarabun"/);
 assert.match(css,/@page\{size:A4 portrait;margin:15mm 14mm\}/);
 assert.match(html,/family=Sarabun/);
});
test('the AF CHEST bridge suggestion stays on screen, not printed',()=>{
 const ui=fs.readFileSync(path.join(root,'preop-ui.js'),'utf8');
 const start=ui.indexOf('const printHtml=');
 const end=ui.indexOf('function renderPlan()',start);
 assert.equal(start>=0,true);
 assert.equal(end>start,true);
 assert.doesNotMatch(ui.slice(start,end),/afRecommendationText/);
});
test('daily Warfarin is never inferred from a weekly total',()=>{
 const ui=fs.readFileSync(path.join(root,'preop-ui.js'),'utf8');
 assert.doesNotMatch(ui,/mg\/week \(ตามตารางยาเดิม\)/);
 assert.match(ui,/dailyFor\(day,p\.operationDate\)/);
 assert.doesNotMatch(ui,/Usual .*regimen/);
});


test('Target INR selection supports presets and editable custom range',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const ui=fs.readFileSync(path.join(root,'preop-ui.js'),'utf8');
  assert.match(html,/option value="2-3"/);
  assert.match(html,/option value="2.5-3.5"/);
  assert.match(html,/id="preTargetInrCustom"/);
  assert.match(ui,/function validTargetInr/);
  assert.match(ui,/targetInr\(\)/);
});
test('Calendar removes usual-dose parentheses and has short Day+5 INR text',()=>{
  const ui=fs.readFileSync(path.join(root,'preop-ui.js'),'utf8');
  assert.doesNotMatch(ui,/Hold Warfarin \(current/);
  assert.doesNotMatch(ui,/mg\/week \(ตามตารางยาเดิม\)/);
  assert.match(ui,/Suggested INR check 4 วันหลัง restart Warfarin, Target INR/);
  assert.match(ui,/Stop LMWH only once INR therapeutic/);
  assert.doesNotMatch(ui,/ทีมวิสัญญียืนยันก่อน needle placement \(INR/);
});
test('Clinic can finalize medication review without anesthesia ASRA checkbox',()=>{
  const ui=fs.readFileSync(path.join(root,'preop-ui.js'),'utf8');
  const coreText=fs.readFileSync(path.join(root,'preop-core.js'),'utf8');
  assert.doesNotMatch(ui,/preAsraConfirmed/);
  assert.doesNotMatch(coreText,/neuraxialConfirmed/);
  assert.match(ui,/ส่งต่อวิสัญญี/);
  assert.doesNotMatch(ui,/const anestheticHandoff=/);
});
test('Clinical review and bridge checkboxes include indication-specific primary guidelines',()=>{
  const ui=fs.readFileSync(path.join(root,'preop-ui.js'),'utf8');
  assert.match(ui,/preRiskGuideline/);
  assert.match(ui,/preBridgingGuidance/);
  assert.match(ui,/CHEST 2022/);
  assert.match(ui,/ESC\/EACTS 2025/);
  assert.match(ui,/ASRA 2025/);
});


test('Neuraxial LMWH bridge remains a clinic Final plan with anesthesia handoff',()=>{
  const p=core.plan({
    anticoagulant:'warfarin',indication:'af',procedure:'Total knee arthroplasty',
    bleedingRisk:'high',operationDate:'2026-11-30',crCl:'70',weightKg:'65',
    weeklyDose:'21',bridgeChoice:'yes',bridgeConfirmed:true,lmwhMgPerDose:'65',
    neuraxial:'yes',riskReviewed:true
  });
  assert.doesNotMatch(p.blockers.join(' '),/ASRA LMWH/);
  assert.match(p.warnings.join(' '),/Handoff to anesthesia/);
});
test('Neuraxial unknown is a handoff note, not a blocking clinical signoff',()=>{
  const ui=fs.readFileSync(path.join(root,'preop-ui.js'),'utf8');
  assert.doesNotMatch(ui,/Neuraxial ASRA review: กรุณายืนยัน/);
  assert.match(ui,/Anesthesia technique not established/);
  assert.match(ui,/Clinical reminders \(ไม่ใช่ช่องที่กรอกค้าง\)/);
});
test('Apixaban 2.5mg with planned neuraxial does not auto-continue minimal-risk surgery',()=>{
  const p=core.plan({anticoagulant:'apixaban',indication:'af',procedure:'Minor procedure',
    bleedingRisk:'minimal',operationDate:'2026-11-30',crCl:'65',apixDose:'2.5',neuraxial:'yes'});
  assert.equal(p.action,'hold');
  assert.equal(p.holdDays,3);
  assert.doesNotMatch(p.blockers.join(' '),/ASRA Apixaban dose category/);
  assert.match(p.warnings.join(' '),/anesthesiologist/);
});
test('Insufficient known high-dose apixaban interval emits a printed anesthesia alert',()=>{
  const p=core.plan({anticoagulant:'apixaban',indication:'af',procedure:'Major surgery',
    bleedingRisk:'high',operationDate:'2026-11-30',operationTime:'08:00',
    lastDoseDateTime:'2026-11-28T20:00',crCl:'65',apixDose:'5',neuraxial:'yes'});
  assert.match(p.warnings.join(' '),/ANESTHESIA ALERT/);
  assert.doesNotMatch(p.blockers.join(' '),/ASRA high-dose Apixaban/);
  const ui=fs.readFileSync(path.join(root,'preop-ui.js'),'utf8');
  assert.match(ui,/anesthesiaAlerts\.map/);
});
test('Anesthesia risk does not silently rewrite procedural bleeding risk',()=>{
  const ui=fs.readFileSync(path.join(root,'preop-ui.js'),'utf8');
  assert.match(ui,/bleedingRisk:val\('preBleed'\)/);
  assert.doesNotMatch(ui,/bleedingRisk:val\('preNeuraxial'\)==='yes'\?'high'/);
});
test('Warfarin calendar gives short restart-relative INR follow-up with no old conditional string',()=>{
  const ui=fs.readFileSync(path.join(root,'preop-ui.js'),'utf8');
  assert.match(ui,/Suggested INR check 4 วันหลัง restart Warfarin, Target INR/);
  assert.match(ui,/Stop LMWH only once INR therapeutic/);
  assert.doesNotMatch(ui,/Suggested INR check \(4 วันหลัง planned restart Day \+1\)/);
  assert.doesNotMatch(ui,/ทีมวิสัญญียืนยันก่อน needle placement \(INR/);
});


test('Apixaban minimal-risk calendar names the current dose before and after surgery',()=>{
  const ui=fs.readFileSync(path.join(root,'preop-ui.js'),'utf8');
  const start=ui.indexOf('  function hasSafeLmwh('),end=ui.indexOf('  function plan(){',start);
  assert.equal(start>=0 && end>start,true);
  const makeRows=new Function('core','LABEL','dateAt','dailyFor','val','targetInr',
    ui.slice(start,end)+'return makeRows;')(
      core,{warfarin:'Warfarin',apixaban:'Apixaban'},()=>'',()=>null,
      id=>id==='preApixDose'?'5':'',()=>''
    );
  const p={anticoagulant:'apixaban',indication:'af',procedure:'Cataract surgery',
    bleedingRisk:'minimal',operationDate:'2026-11-30',apixDose:'5',crCl:'70',neuraxial:'no'};
  const rows=makeRows(p,core.plan(p));
  assert.equal(rows.length,15);
  assert.equal(rows.find(r=>r.day===-1).drug,'Apixaban 5 mg BID');
  assert.equal(rows.find(r=>r.day===1).drug,'Apixaban 5 mg BID');
  assert.match(rows.find(r=>r.day===0).manage,/อาจให้ต่อเนื่องได้/);
  assert.doesNotMatch(rows.map(r=>r.drug).join(' '),/Post-op: treating team to confirm|Continue Apixaban/);
});
test('Apixaban postoperative dates are merged on screen and in print with complete original sentences',()=>{
  const ui=fs.readFileSync(path.join(root,'preop-ui.js'),'utf8');
  const a=ui.indexOf('  function isMergedPostOp('),b=ui.indexOf('  const printHtml=',a);
  assert.equal(a>=0 && b>a,true);
  const renderer=new Function('esc',ui.slice(a,b)+'return {editableRow,printableRow};')(
    s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
  );
  const p={anticoagulant:'apixaban'};
  const r={day:2,date:'02/12/2569',drug:'',manage:'Suggest restart Apixaban 5 mg BID if stable/no bleeding/hemostasis adequate and physician approves'};
  const edit=renderer.editableRow(r,9,p),printed=renderer.printableRow(r,p);
  assert.match(edit,/colspan="2"/);
  assert.match(edit,/data-col="manage"/);
  assert.match(printed,/colspan="2"/);
  assert.match(printed,/if stable\/no bleeding\/hemostasis adequate and physician approves/);
  assert.doesNotMatch(printed,/Post-op: treating team to confirm/);
  assert.match(ui,/if restart confirmed/);
});

test('Warfarin post-op rows use one editable merged cell with the full clinical wording',()=>{
  const ui=fs.readFileSync(path.join(root,'preop-ui.js'),'utf8');
  const i=ui.indexOf('  function hasSafeLmwh('),j=ui.indexOf('  function plan(){',i);
  const k=ui.indexOf('  function isMergedPostOp('),l=ui.indexOf('  const printHtml=',k);
  assert.equal(i>=0&&j>i&&k>=0&&l>k,true);
  const makeRows=new Function('core','LABEL','dateAt','dailyFor','val','targetInr',
    ui.slice(i,j)+'return makeRows;')(
      core,{warfarin:'Warfarin',apixaban:'Apixaban'},
      (date,day)=>core.thaiDate(core.shiftDate(date,day)),()=>null,
      id=>id==='preTargetInr'?'2-3':'',()=>'2-3'
    );
  const render=new Function('esc',ui.slice(k,l)+'return {editableRow,printableRow};')(s=>String(s));
  const p={anticoagulant:'warfarin',indication:'af',procedure:'Total knee arthroplasty',
    operationDate:'2026-11-30',bleedingRisk:'high',weeklyDose:'12',neuraxial:'no',
    crCl:'65',weightKg:'50',bridgeChoice:'yes',bridgeConfirmed:true,lmwhMgPerDose:'50'};
  const plan=core.plan(p),rows=makeRows(p,plan);
  assert.equal(rows.length,15);
  const dayMinus3=rows.find(r=>r.day===-3);
  assert.equal(dayMinus3.manage,'Enoxaparin 0.50 mL SC (50 mg) q12h');
  const restart=rows.find(r=>r.day===1);
  assert.equal(restart.manage,'Suggest restart Warfarin 12 mg/week if stable, no bleeding, hemostasis adequate');
  assert.doesNotMatch(restart.drug,/conditional restart/);
  const dayPlus2=rows.find(r=>r.day===2);
  assert.match(dayPlus2.drug,/Warfarin 12 mg\/week \(if restart confirmed\)/);
  const edit=render.editableRow(restart,8,p),paper=render.printableRow(restart,p);
  assert.match(edit,/colspan="2"/);
  assert.match(paper,/colspan="2"/);
  assert.match(edit,/data-col="manage"/);
  assert.match(paper,/Suggest restart Warfarin 12 mg\/week if stable, no bleeding, hemostasis adequate/);
  const inr=render.printableRow(rows.find(r=>r.day===5),p);
  assert.match(inr,/Suggested INR check 4 วันหลัง restart Warfarin/);
  assert.match(inr,/Stop LMWH only once INR therapeutic/);
});
test('A4 uses larger margins, Sarabun 16 pt, renal inputs, and right-aligned signed name/date',()=>{
  const ui=fs.readFileSync(path.join(root,'preop-ui.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
  assert.match(ui,/ · Cr: /);
  assert.match(ui,/ · BW: /);
  assert.match(ui,/ · CrCl: /);
  assert.equal(ui.indexOf("' · Cr: '")<ui.indexOf("' · BW: '"),true);
  assert.equal(ui.indexOf("' · BW: '")<ui.indexOf("' · CrCl: '"),true);
  assert.match(ui,/pre-signature-line/);
  assert.match(ui,/pre-signature-name/);
  assert.match(ui,/pre-signature-date/);
  assert.match(css,/@page\{size:A4 portrait;margin:20mm\}/);
  assert.match(css,/#prePrintSurface,\#prePrintSurface \*\{/);
  assert.match(css,/font-size:16pt!important/);
  assert.match(css,/pre-signature-block\{/);
  assert.match(css,/margin-left:auto/);
});
test('A4 Bridging note shows one Start Enoxaparin bullet without duplicate title or anesthesia note',()=>{
  const ui=fs.readFileSync(path.join(root,'preop-ui.js'),'utf8');
  const start=ui.indexOf('  const printHtml=');
  const end=ui.indexOf('  function renderPlan()',start);
  const print=ui.slice(start,end);
  assert.match(ui,/return 'Bridging note: Start Enoxaparin/);
  assert.match(print,/pre-bridging-print/);
  assert.match(print,/<ul><li>/);
  assert.match(print,/replace\(\/\^Bridging note:\\s\*\/i/);
  assert.doesNotMatch(print,/anestheticHandoff/);
  assert.doesNotMatch(print,/ANESTHESIA HANDOFF:/);
  assert.doesNotMatch(ui,/Last therapeutic dose อย่างน้อย 24 ชั่วโมง/);
  assert.doesNotMatch(ui,/\(planned bridging schedule\)/);
});

test('A4 INR label is short and separate from the normal-range neuraxial target',()=>{
  const ui=fs.readFileSync(path.join(root,'preop-ui.js'),'utf8');
  const start=ui.indexOf('  const printHtml=');
  const end=ui.indexOf('  function renderPlan()',start);
  const print=ui.slice(start,end);
  assert.match(print,/INR ก่อนผ่าตัด:/);
  assert.doesNotMatch(print,/Pre-op INR goal:/);
  assert.match(print,/อยู่ในช่วงปกติของห้องปฏิบัติการ/);
  assert.match(print,/หากไม่ถึงเกณฑ์ ให้ปรึกษาทีมผ่าตัด/);
  const ordinary=core.preopInrRequirement({anticoagulant:'warfarin',action:'hold',neuraxial:'no'});
  const neuro=core.preopInrRequirement({anticoagulant:'warfarin',action:'hold',neuraxial:'yes'});
  assert.equal(ordinary.kind,'surgery');
  assert.equal(neuro.kind,'neuraxial');
});
