const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('./preop-core.js');
const risk=p=>C.assessThromboticRisk(p);
test('AF AHA/ACC high CHA2DS2-VASc >=7',()=>{const x=risk({indication:'af',cha2ds2Vasc:7,strokeTiming:'none',rheumaticMS:'no'});assert.equal(x.level,'high');assert.ok(x.reasons.some(s=>s.includes('>=7')));});
test('AF rheumatic MS high even with lower score',()=>assert.equal(risk({indication:'af',cha2ds2Vasc:3,strokeTiming:'none',rheumaticMS:'yes'}).level,'high'));
test('AF recent stroke no date required',()=>assert.equal(risk({indication:'af',cha2ds2Vasc:5,strokeTiming:'recent',rheumaticMS:'no'}).level,'high'));
test('AF score 5-6 moderate',()=>assert.equal(risk({indication:'af',cha2ds2Vasc:5,strokeTiming:'none',rheumaticMS:'no'}).level,'moderate'));
test('AF score 3 without stroke low',()=>assert.equal(risk({indication:'af',cha2ds2Vasc:3,strokeTiming:'none',rheumaticMS:'no'}).level,'low'));
test('AF missing MS history never low',()=>assert.equal(risk({indication:'af',cha2ds2Vasc:3,strokeTiming:'none',rheumaticMS:'unknown'}).level,'review'));
test('Mechanical mitral high with optional LVEF reason',()=>{const x=risk({indication:'mechanical',valvePositions:['mitral'],valveGeneration:'modern',strokeTiming:'none',valveFactors:['lvef']});assert.equal(x.level,'high');assert.ok(x.reasons.includes('LVEF <35% (additional factor)'));});
test('Caged-ball AVR high',()=>assert.equal(risk({indication:'mechanical',valvePositions:['aortic'],valveGeneration:'old',strokeTiming:'none',valveFactors:[]}).level,'high'));
test('Modern AVR with optional factor moderate',()=>assert.equal(risk({indication:'mechanical',valvePositions:['aortic'],valveGeneration:'modern',strokeTiming:'none',valveFactors:['hyper']}).level,'moderate'));
test('Modern AVR without selected factors low with optional warning',()=>{const x=risk({indication:'mechanical',valvePositions:['aortic'],valveGeneration:'modern',strokeTiming:'none',valveFactors:[]});assert.equal(x.level,'low');assert.ok(x.notices.some(s=>s.includes('optional')));});
test('Unknown valve generation not low',()=>assert.equal(risk({indication:'mechanical',valvePositions:['aortic'],strokeTiming:'none',valveFactors:[]}).level,'review'));
test('Valve recent stroke high without exact date',()=>assert.equal(risk({indication:'mechanical',valvePositions:['aortic'],valveGeneration:'modern',strokeTiming:'recent',valveFactors:[]}).level,'high'));
test('Recent PE high',()=>assert.equal(risk({indication:'vte',vteTiming:'lt3',vteRecurrent:'no',vteThrombophilia:'none',vteCancer:'none'}).level,'high'));
test('VTE >12m recurrent moderate',()=>assert.equal(risk({indication:'vte',vteTiming:'gt12',vteRecurrent:'yes',vteThrombophilia:'none',vteCancer:'none'}).level,'moderate'));
test('VTE >12m without risk factors low',()=>assert.equal(risk({indication:'vte',vteTiming:'gt12',vteRecurrent:'no',vteThrombophilia:'none',vteCancer:'none'}).level,'low'));

test('VTE date-category selection does not generate a missing-input blocker',()=>{
  const ui=require('node:fs').readFileSync(require('node:path').join(__dirname,'preop-ui.js'),'utf8');
  assert.match(ui,/\['preVTETime','VTE timing'\]/);
  assert.doesNotMatch(ui,/b\.push\('Recent VTE: elective surgery timing/);
});
test('unknown aortic valve generation can be selected without forced classification',()=>{
  const ui=require('node:fs').readFileSync(require('node:path').join(__dirname,'preop-ui.js'),'utf8');
  assert.match(ui,/value="unknown">Unknown \/ ไม่ทราบ \(ไม่บังคับ\)/);
  assert.doesNotMatch(ui,/b\.push\('Aortic MHV: ต้องระบุ valve generation/);
  const x=risk({indication:'mechanical',valvePositions:['aortic'],valveGeneration:'unknown',strokeTiming:'none',valveFactors:[]});
  assert.equal(x.level,'review');
});
test('official print header groups operation date and indication anticoagulant with bold labels',()=>{
  const ui=require('node:fs').readFileSync(require('node:path').join(__dirname,'preop-ui.js'),'utf8');
  assert.match(ui,/pre-header-procedure/);
  assert.match(ui,/pre-header-date/);
  assert.match(ui,/pre-header-bridge/);
  assert.match(ui,/<strong>Thrombotic risk:<\/strong>/);
});

test('Bridging documentation shows clinical reasons, never generic physician approved wording',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const ui=fs.readFileSync(path.join(__dirname,'preop-ui.js'),'utf8');
  assert.match(ui,/function bridgingRationale\(/);
  assert.match(ui,/a\.reasons\.join\(', '\)/);
  assert.match(ui,/out\.push\('Bridging: '[\s\S]*?bridgingRationale\(p,a\)/);
  assert.match(ui,/const bridgeReason=bridgingRationale\(p,a\)/);
  assert.doesNotMatch(ui,/แพทย์ยืนยันหลังประเมิน thrombotic\/bleeding risk/);
  assert.doesNotMatch(ui,/physician-reviewed individual decision/);
});
test('Print preview and paper output explicitly separate header groups',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const css=fs.readFileSync(path.join(__dirname,'styles.css'),'utf8');
  assert.match(css,/#prePrintExport \.pre-print-patient \.pre-header-row/);
  assert.match(css,/margin:0 0 2mm!important/);
  assert.match(css,/#prePrintExport \.pre-print-patient \.pre-header-procedure/);
});

test('Medication calendar uses documented weekly Warfarin dose if daily regimen is absent',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const ui=fs.readFileSync(path.join(__dirname,'preop-ui.js'),'utf8');
  assert.match(ui,/const current=Number\.isFinite\(dose\).*?\(p\.weeklyDose\|\|'-'\)\+' mg\/wk'/);
  assert.match(ui,/:\(p\.weeklyDose\|\|'-'\)\+' mg\/wk'\)\+\(v\.action/);
  assert.doesNotMatch(ui,/ขนาดเดิมตามตารางยา|ตามตารางยาเดิม|:'ขนาดเดิม'\)/);
});
test('Remove the long CHEST ASRA therapeutic LMWH guidance from the input page',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const ui=fs.readFileSync(path.join(__dirname,'preop-ui.js'),'utf8');
  assert.doesNotMatch(ui,/preBridgingGuidance|Therapeutic LMWH bridging — CHEST 2022 \/ ASRA 2025/);
});
test('A4 bridging footnote is compact and conditional on neuraxial (no repeated hold instruction)',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const ui=fs.readFileSync(path.join(__dirname,'preop-ui.js'),'utf8');
  assert.match(ui,/function bridgingFootnoteHtml\(p,v\)/);
  assert.match(ui,/pre-bridging-print pre-bridging-compact/);
  assert.match(ui,/เริ่ม Enoxaparin เมื่อ INR ต่ำกว่า therapeutic range/);
  assert.match(ui,/if\(p\.neuraxial==='yes'\)/);
  assert.match(ui,/ASRA timing และ catheter precautions/);
  assert.match(ui,/const noteBody=bridgingFootnoteHtml\(p,v\)/);
  assert.match(ui,/\(activePlan\?bridgingFootnoteHtml\(activePlan\.p,activePlan\.v\):''\)/);
  const block=ui.slice(ui.indexOf('function bridgingFootnoteHtml'),ui.indexOf('function afRecommendationText'));
  assert.equal((block.match(/lines\.push\(/g)||[]).length,1);
  assert.doesNotMatch(block,/Hold enoxaparin|Last dose|Day -1/);
});
test('A4 suppresses duplicate post-op & mechanical INR notes but keeps risk warnings',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const ui=fs.readFileSync(path.join(__dirname,'preop-ui.js'),'utf8');
  assert.match(ui,/const postopInCalendar=rows\.some\(/);
  assert.match(ui,/const postopNote=postopInCalendar\?''/);
  assert.doesNotMatch(ui,/safetyNotes\.push\('<strong>Mechanical valve:<\/strong>/);
  assert.match(ui,/safetyNotes\.push\('<strong>Risk review:<\/strong>/);
  assert.match(ui,/safetyNotes\.push\('<strong>Recent VTE:<\/strong>/);
});
test('A4 compact footnote uses 9pt while medication grid stays >=10pt',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const css=fs.readFileSync(path.join(__dirname,'styles.css'),'utf8');
  const marker=css.lastIndexOf('/* Print v4');
  assert.ok(marker>0,'Final compact-print override missing');
  const finalCss=css.slice(marker);
  assert.match(finalCss,/#prePrintExport \.pre-print-notes \.pre-bridging-compact/);
  assert.match(finalCss,/font-size:9pt!important/);
  assert.match(finalCss,/#prePrintExport \.pre-print-grid th/);
  assert.match(finalCss,/font-size:10\.5pt!important/);
  assert.match(finalCss,/margin: 14mm 14mm/);
});

test('Assessment UI preserves all original patient/procedure/drug inputs by moving existing nodes',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
  const ui=fs.readFileSync(path.join(__dirname,'preop-ui.js'),'utf8');
  const required=['preProcedure','preDate','preTime','preBleed','preName','preAge','preSex','preWeight','preCr','preCrCl','preNeuraxial','preDrug','preIndication','preBridge'];
  for(const id of required){
    assert.match(html,new RegExp('id="'+id+'"'), 'original HTML input missing '+id);
    assert.ok(ui.includes("'"+id+"'"),'new layout did not reference original field '+id);
  }
  assert.match(ui,/function moveExistingField\(id,destination\)/);
  assert.match(ui,/destination\.append\(field\)/);
  assert.match(ui,/buildAssessmentLayout\(\);/);
});
test('Assessment uses five ordered sections, collapsed procedure reference and indication-dependent risk table',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const ui=fs.readFileSync(path.join(__dirname,'preop-ui.js'),'utf8');
  for(const n of ['01','02','03','04','05'])assert.match(ui,new RegExp("assessmentSection\\('"+n+"'"));
  assert.match(ui,/preProcedureReference/);
  assert.match(ui,/bleedingReference\.append\(\$\('preRiskInline'\)\)/);
  assert.match(ui,/refDetails\.id='preRiskReference'/);
  assert.match(ui,/RISK_REFERENCE_TABLES\[val\('preIndication'\)\]/);
  assert.match(ui,/updateRiskReference\(\);/);
  assert.match(ui,/summary\.append\(bleedingSummary,\$\('preThromboticResult'\)\)/);
});
test('Mechanical valve primary criteria and optional ESC factors are visibly distinct, not automatic bridging',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const ui=fs.readFileSync(path.join(__dirname,'preop-ui.js'),'utf8');
  assert.match(ui,/A\. Primary Risk Criteria/);
  assert.match(ui,/B\. Additional Prothrombotic Factors/);
  assert.match(ui,/preValveFactor/);
  assert.match(ui,/การติ๊กไม่ได้เป็นคำสั่งให้ Bridging อัตโนมัติ/);
  for(const field of ['recent','lvef','ms','hyper'])assert.ok(ui.includes(field+":"),'factor definition '+field+' missing');
  assert.match(ui,/moveExistingField\('preBridge',bridgeDecision\)/);
  assert.match(ui,/preApixBridgeInfo/);
});

test('Risk summary occupies step 04 before step 05 bridging, with live procedural risk recap',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const ui=fs.readFileSync(path.join(__dirname,'preop-ui.js'),'utf8');
  const a=ui.indexOf("assessmentSection('04','Risk Summary & Reference'");
  const b=ui.indexOf("assessmentSection('05','Bridging Plan'");
  assert.ok(a>=0&&b>a,'risk recap must precede bridging selection');
  assert.match(ui,/summary\.append\(bleedingSummary,\$\('preThromboticResult'\)\)/);
  assert.match(ui,/function updateBleedingRiskSummary\(\)/);
  assert.match(ui,/updateBleedingRiskSummary\(\);refreshAfBridgeReasons\(\)/);
  assert.match(ui,/bridging\.append\(actions\)/);
  assert.doesNotMatch(ui,/summary\.append\(actions\)/);
});
