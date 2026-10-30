/* Pre-op Planner v2 - elective OPD, no patient persistence.
   Clinical draft: all rules require local guideline validation before routine care. */
(function () {
  'use strict';
  const core=window.PreopCore, $=id=>document.getElementById(id);
  const root=$('preopModule');
  if(!core||!root)return;
  const LABEL={af:'AF',mechanical:'Mechanical heart valve',vte:'VTE',warfarin:'Warfarin',apixaban:'Apixaban',minimal:'Minimal',lowmod:'Low-Moderate',high:'High'};
  const PROC=[
    ['Cataract surgery','minimal','Ophthalmology'],['Retinal laser photocoagulation','minimal','Ophthalmology'],
    ['Vitreoretinal surgery','lowmod','Ophthalmology'],['Trabeculectomy','lowmod','Ophthalmology'],
    ['Orbital surgery','high','Ophthalmology'],
    ['Dental extraction 1-3 teeth','minimal','Dental'],['Dental cleaning','minimal','Dental'],
    ['Dental extraction >3 teeth / complex','lowmod','Dental'],['Dental implant surgery','lowmod','Dental'],
    ['Cholecystectomy','lowmod','General surgery'],['Appendectomy','lowmod','General surgery'],
    ['Inguinal / umbilical hernia repair','lowmod','General surgery'],
    ['Thyroidectomy','high','General surgery'],['Major intra-abdominal organ resection','high','General surgery'],
    ['Knee arthroscopy','lowmod','Orthopedics'],['Carpal tunnel surgery','lowmod','Orthopedics'],
    ['Total hip arthroplasty','high','Orthopedics'],['Total knee arthroplasty','high','Orthopedics'],
    ['Spinal surgery','high','Orthopedics'],
    ['Cystoscopy without mucosal incision','minimal','Urology'],['Ureteral stent exchange (uncomplicated)','lowmod','Urology'],
    ['TURP','high','Urology'],['Kidney biopsy','high','Urology'],
    ['Paracentesis','minimal','Interventional'],['Thoracentesis','minimal','Interventional'],
    ['US-guided thyroid FNA','minimal','Interventional'],['Lumbar puncture','high','Interventional'],
    ['EGD diagnostic with/without mucosal biopsy','minimal','Endoscopy'],
    ['Colonoscopy diagnostic with/without mucosal biopsy','minimal','Endoscopy'],
    ['Endoscopic polypectomy <1 cm','lowmod','Endoscopy'],
    ['Endoscopic polypectomy >=1 cm','high','Endoscopy'],
    ['Endoscopic mucosal/submucosal resection','high','Endoscopy'],
    ['ERCP without sphincterotomy','lowmod','Endoscopy'],['ERCP with sphincterotomy','high','Endoscopy'],
    ['Bronchoscopy without biopsy (BAL)','minimal','Endoscopy'],
    ['Bronchoscopy with transbronchial biopsy','high','Endoscopy'],
    ['Punch skin biopsy','minimal','Dermatology'],['Wide skin excision','high','Dermatology'],
    ['Superficial wound suture','minimal','General surgery']
  ];
  const guide='https://www.jthjournal.org/article/S1538-7836%2826%2900055-3/fulltext';
  const str=v=>String(v===null||v===undefined?'':v);
  const esc=v=>str(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const val=id=>str($(id)?.value).trim(), checked=id=>!!$(id)?.checked;
  const num=id=>val(id)===''?NaN:Number(val(id));
  const dateAt=(date,offset)=>date?core.thaiDate(core.shiftDate(date,offset)):'—';
  let revision=0,activePlan=null,rows=[],mappedProcedure=false,rendering=false;
  // A dedicated top-level print host prevents hidden screens / app layout
  // from creating blank PDF pages in Chrome's print pagination.
  const printHost=document.createElement('section');
  printHost.id='prePrintExport';
  printHost.className='pre-print-sheet';
  printHost.setAttribute('aria-label','Final anticoagulant plan for printing');
  document.body.append(printHost);
  window.addEventListener('afterprint',()=>{printHost.innerHTML='';});
  function printPlan(p,v,draft){
    const html=printHtml(p,v,draft);
    printHost.innerHTML=html;
    $('prePrintSurface').innerHTML=html;
    $('prePrintSurface').classList.toggle('pre-draft',draft);
    window.print();
  }

  // Keep the existing module, but group inputs and the plan into two screens.
  const inputScreen=document.createElement('section');inputScreen.id='preInputScreen';inputScreen.className='pre-screen';
  const resultScreen=document.createElement('section');resultScreen.id='preResultScreen';resultScreen.className='pre-screen hidden';
  const first=root.querySelector('.pre-form-grid');
  root.insertBefore(inputScreen,first);
  const output=$('preOutput'), print=$('prePrintSurface');
  let current=first;
  while(current && current!==output){const next=current.nextElementSibling;inputScreen.append(current);current=next;}
  root.append(resultScreen);
  resultScreen.append(output,print);

  // Only the new indication-specific clinical-risk form is displayed.
  // Surgery clock time is optional; leave it visible for convenient entry.
  $('preLastApix')?.closest('.field')?.classList.add('pre-conditional-time');

  const risk=document.createElement('section');risk.className='pre-subsection';risk.id='preClinicalRisk';
  risk.innerHTML='<h3>Thrombotic risk (ตาม Indication)</h3>'+
  '<div id="preAFExtra" class="hidden"><div class="pre-form-grid"><div class="field"><label for="preScore">CHA2DS2-VASc score (กรอกเองได้)</label><input type="number" id="preScore" min="0" max="9" step="1" placeholder="0-9"><details><summary>คำนวณ CHA2DS2-VASc</summary><div id="preScoreChoices">'+
  '<label><input type="checkbox" data-points="1"> Heart failure</label><label><input type="checkbox" data-points="1"> Hypertension</label><label><input type="checkbox" data-points="1"> Diabetes</label><label><input type="checkbox" data-points="2"> Prior stroke/TIA</label><label><input type="checkbox" data-points="1"> Vascular disease</label></div>'+
  '<label><input type="checkbox" data-points="1"> Female sex</label><button type="button" id="preScoreCalc">ใช้คะแนนที่คำนวณจากอายุและโรคร่วม</button></details></div>'+
  '<div class="field"><label for="preAFStroke">Stroke/TIA/Embolism ล่าสุด</label><select id="preAFStroke"><option value="">เลือก</option><option value="none">ไม่มีประวัติ</option><option value="unknown">ไม่ทราบ</option><option value="recent">ภายใน 3 เดือนก่อนผ่าตัด</option><option value="remote">เกิน 3 เดือน</option></select></div>'+
  '<div class="field"><label for="preRheumaticMS">Rheumatic mitral stenosis?</label><select id="preRheumaticMS"><option value="">เลือก</option><option value="no">No</option><option value="yes">Yes</option><option value="unknown">Unknown</option></select></div><div class="field"><label for="preAFClot">เคยเกิด thrombosis ระหว่างหยุด anticoagulant?</label><select id="preAFClot"><option value="">เลือก</option><option value="no">ไม่เคย</option><option value="yes">เคย</option><option value="unknown">ไม่ทราบ</option></select></div></div></div>'+
  '<div id="preValveExtra" class="hidden"><p>Mechanical valve position (เลือกได้หลายตำแหน่ง)</p><div class="pre-checkrow">'+
  '<label><input type="checkbox" name="preValveAt" value="aortic"> Aortic</label><label><input type="checkbox" name="preValveAt" value="mitral"> Mitral</label><label><input type="checkbox" name="preValveAt" value="tricuspid"> Tricuspid</label><label><input type="checkbox" name="preValveAt" value="unknown"> Unknown</label></div>'+
  '<div class="field"><label for="preValveGeneration">Valve generation (AVR)</label><select id="preValveGeneration"><option value="unknown">Unknown / ไม่ทราบ (ไม่บังคับ)</option><option value="modern">Modern bileaflet</option><option value="old">Caged-ball / older tilting-disc</option></select></div><div class="field"><label for="preValveStroke">Stroke/TIA</label><select id="preValveStroke"><option value="">เลือก</option><option value="none">ไม่มี</option><option value="recent">ภายใน 3 เดือน</option><option value="remote">มากกว่า 3 เดือน</option><option value="unknown">ไม่ทราบ</option></select></div><label>Additional prothrombotic factors — ESC 2025 (optional)</label><div class="pre-checkrow">'+
  '<label><input type="checkbox" name="preValveFactor" value="recent"> Major thrombotic event ภายใน 12 เดือน</label>'+
  '<label><input type="checkbox" name="preValveFactor" value="lvef"> LVEF &lt;35%</label>'+
  '<label><input type="checkbox" name="preValveFactor" value="ms"> AF with significant MS</label>'+
  '<label><input type="checkbox" name="preValveFactor" value="hyper"> Hypercoagulable state</label>'+
  '<span class="muted">Optional: ไม่ติ๊กไม่ได้แปลว่าไม่มีปัจจัย</span></div></div>'+
  '<div id="preVTEExtra" class="hidden"><div class="pre-form-grid">'+
  '<div class="field"><label for="preVTETime">Time since last VTE</label><select id="preVTETime"><option value="">เลือก</option><option value="lt1">ภายใน 1 เดือน</option><option value="lt3">1 ถึงน้อยกว่า 3 เดือน</option><option value="3to12">3-12 เดือน</option><option value="gt12">มากกว่า 12 เดือน</option><option value="unknown">ไม่ทราบ</option></select></div>'+
  '<div class="field"><label for="preVTEType">Type of VTE</label><select id="preVTEType"><option value="">เลือก</option><option value="dvt">DVT</option><option value="pe">PE</option><option value="both">DVT + PE</option><option value="unknown">ไม่ทราบ</option></select></div>'+
  '<div class="field"><label for="preVTERecur">Recurrent VTE</label><select id="preVTERecur"><option value="">เลือก</option><option value="no">First VTE</option><option value="yes">Recurrent VTE</option><option value="unknown">ไม่ทราบ</option></select></div>'+
  '<div class="field"><label for="preVTEThromb">Known thrombophilia</label><select id="preVTEThromb"><option value="">เลือก</option><option value="none">ไม่มีประวัติที่ทราบ</option><option value="aps">APS</option><option value="severe">Other severe thrombophilia</option><option value="nonsevere">Non-severe thrombophilia</option><option value="unknown">มี แต่ไม่ทราบชนิด</option></select>'+
  '<details><summary>Thrombophilia / Thrombotic risk</summary><table><tr><th>Condition</th><th>Risk feature</th></tr><tr><td>APS, antithrombin/protein C/S deficiency, homozygous/multiple thrombophilia</td><td>High</td></tr><tr><td>Heterozygous FVL / Prothrombin G20210A</td><td>Moderate</td></tr></table><small>CHEST 2022 risk table; does not independently mandate bridging.</small></details></div>'+
  '<div class="field"><label for="preVTECancer">Cancer history</label><select id="preVTECancer"><option value="">เลือก</option><option value="none">ไม่มี Active cancer หรือประวัติภายใน 5 ปี</option><option value="high">Active pancreatic / primary brain / gastric / esophageal cancer / MPN</option><option value="other">Other active cancer</option><option value="history">Cancer history ภายใน 5 ปี (ไม่ active)</option><option value="unknown">ไม่ทราบ</option></select></div>'+
  '<div class="field"><label for="preVTEClot">Previous VTE during anticoagulant interruption</label><select id="preVTEClot"><option value="">เลือก</option><option value="no">ไม่เคย</option><option value="yes">เคย</option><option value="unknown">ไม่ทราบ</option></select></div></div></div>'+
  '<div id="preThromboticResult" class="pre-guideline-summary" aria-live="polite">Risk assessment pending</div>';
  $('preBridgeFields').insertAdjacentElement('beforebegin',risk);
  const guideline=document.createElement('div');
  guideline.id='preRiskGuideline';guideline.className='pre-guideline-summary';
  risk.append(guideline);
  // Put the risk classification AFTER all clinical input and factor choices.
  const riskResult=$('preThromboticResult');
  riskResult.classList.add('pre-thrombotic-result');
  $('preBridgeFields').insertAdjacentElement('afterend',riskResult);
  riskResult.setAttribute('role','status');
  function updateGuidelineSummary(){
    const ind=val('preIndication');
    const ref='https://journal.chestnet.org/article/S0012-3692%2822%2901359-9/abstract';
    const valveRef='https://academic.oup.com/eurheartj/article/46/44/4635/8234488';
    const el=$('preRiskGuideline');
    if(ind==='af')el.innerHTML='<strong>AF risk — AHA/ACC 2024; bridging — CHEST 2022</strong><p>No routine heparin bridging (strong recommendation). Recent stroke/TIA &lt;3 mo หรือ prior thrombosis during interruption: individual review; score อย่างเดียวไม่ใช่คำสั่งให้ bridge.</p><a target="_blank" rel="noopener noreferrer" href="'+ref+'">CHEST 2022</a>';
    else if(ind==='mechanical')el.innerHTML='<strong>Mechanical valve — ESC/EACTS 2025</strong><p>Mitral/tricuspid MHV, older valve, LVEF &lt;35%, recent thromboembolism หรือ thrombophilia เพิ่ม thrombotic risk; Major high-bleeding-risk surgery อาจต้อง bridging ตาม risk. ยืนยันตำแหน่ง valve และแผนรายบุคคล.</p><a target="_blank" rel="noopener noreferrer" href="'+valveRef+'">ESC VHD 2025</a>';
    else if(ind==='vte')el.innerHTML='<strong>VTE — CHEST 2022</strong><p>โดยทั่วไป suggest against routine bridging; VTE &lt;3 mo, severe thrombophilia หรือ selected active cancer ให้พิจารณา individual risk review.</p><a target="_blank" rel="noopener noreferrer" href="'+ref+'">CHEST 2022</a>';
    else el.innerHTML='<strong>เลือก Indication ก่อน</strong><p>จะแสดงสรุป guideline สำหรับประเมิน Thrombotic risk</p>';
  }
  $('preIndication').addEventListener('change',updateGuidelineSummary);
  updateGuidelineSummary();
  const asraReview=document.createElement('div');
  asraReview.id='preAsraReview';asraReview.className='pre-guideline-summary hidden';
  asraReview.innerHTML='<strong>Neuraxial / deep plexus — ASRA 2025</strong>'+
    '<p>Warfarin: hold 5 days และ INR normalized (local lab) ก่อน needle placement. Therapeutic LMWH: last dose ≥24 h. Apixaban: high-dose ≥72 h, low-dose ≥36 h (ต้องแยก dose category ตาม indication/renal function). ตรวจ catheter timing เพิ่มเติม.</p>'+
    '<p><strong>ส่งต่อวิสัญญี:</strong> ตรวจ exact last dose, INR (ถ้า Warfarin), neuraxial interval และ catheter plan ก่อนทำ block โดยทีมวิสัญญี ไม่มีช่องติ๊กยืนยันใน Warfarin Clinic</p>'+
    '<a href="https://rapm.bmj.com/content/early/2025/09/16/rapm-2024-105766" target="_blank" rel="noopener noreferrer">ASRA 2025</a>';
  $('preNeuraxial').closest('.field').insertAdjacentElement('afterend',asraReview);
  const showAsra=()=>asraReview.classList.toggle('hidden',val('preNeuraxial')!=='yes');
  $('preNeuraxial').addEventListener('change',showAsra);
  showAsra();
  inputScreen.querySelector('.pre-actions')?.insertAdjacentHTML('beforeend','<span class="muted">สร้าง Draft ก่อน แล้วตรวจและยืนยันบนหน้าถัดไป</span>');

  const procedureField=$('preProcedure').closest('.field');
  $('preProcedure').setAttribute('list','preProcedureList');
  $('preProcedure').setAttribute('autocomplete','off');
  const datalist=document.createElement('datalist');datalist.id='preProcedureList';
  datalist.innerHTML=PROC.map(p=>'<option value="'+esc(p[0])+'"></option>').join('');
  procedureField.append(datalist);
  const procedureHelp=document.createElement('div');procedureHelp.className='pre-reference-actions';
  procedureHelp.innerHTML='<button type="button" id="preRiskPopupOpen">View ISTH 2026 Risk Table</button><small>Search ได้; ถ้าไม่พบต้องจัดเป็น Unclassified ก่อน review</small>';
  $('preBleed').closest('.field').append(procedureHelp);
  // Always-visible clinical quick-reference table, fed by the same list as procedure search.
  const inlineRisk=document.createElement('section');
  inlineRisk.id='preRiskInline';inlineRisk.className='pre-risk-inline';
  inlineRisk.innerHTML='<div class="pre-risk-inline-head"><strong>Procedure Bleeding Risk - ISTH SSC 2026</strong>'+
    '<a href="'+guide+'" target="_blank" rel="noopener noreferrer">Source Tables 1-11</a></div>'+
    '<div class="pre-risk-inline-filters"><input id="preRiskInlineSearch" type="search" placeholder="ค้นหา procedure ในตาราง...">'+
    '<select id="preRiskGroup" aria-label="ประเภทหัตถการ"><option value="">All specialties</option>'+
    [...new Set(PROC.map(p=>p[2]))].sort().map(g=>'<option value="'+esc(g)+'">'+esc(g)+'</option>').join('')+'</select></div>'+
    '<div class="pre-table-wrap pre-risk-scroll"><table><thead><tr><th>Procedure (กดเพื่อเลือก)</th><th>Bleeding risk</th><th>Specialty</th></tr></thead>'+
    '<tbody id="preRiskInlineBody"></tbody></table></div>'+
    '<small>ตารางสรุปหัตถการที่พบบ่อยจาก ISTH SSC 2026 ไม่ใช่การคัดลอกทั้ง 11 ตาราง; ตรวจรายละเอียดหัตถการจริงและ neuraxial anesthesia เพิ่มเติมเสมอ</small>';
  $('preBleed').closest('.field').insertAdjacentElement('afterend',inlineRisk);
  function paintInlineRisk(){
    const q=val('preRiskInlineSearch').toLowerCase(),group=val('preRiskGroup');
    const arr=PROC.filter(p=>(!group||p[2]===group)&&(p[0]+' '+p[2]).toLowerCase().includes(q));
    $('preRiskInlineBody').innerHTML=arr.map(p=>'<tr><td><button type="button" data-inline-procedure="'+esc(p[0])+'">'+esc(p[0])+'</button></td>'+
      '<td>'+esc(LABEL[p[1]])+'</td><td>'+esc(p[2])+'</td></tr>').join('')||
      '<tr><td colspan="3">ไม่พบรายการ: ใช้ Other + Physician review</td></tr>';
  }
  $('preRiskInlineSearch').oninput=paintInlineRisk;
  $('preRiskGroup').onchange=paintInlineRisk;
  $('preRiskInlineBody').onclick=e=>{
    const b=e.target.closest('[data-inline-procedure]');if(!b)return;
    $('preProcedure').value=b.dataset.inlineProcedure;chooseProcedure();
  };
  paintInlineRisk();
  const otherCheck=document.createElement('label');
  otherCheck.id='preOtherReviewWrap';otherCheck.className='check hidden';
  otherCheck.innerHTML='<input type="checkbox" id="preOtherVerified"> ไม่พบรายการ ISTH: แพทย์ตรวจสอบ procedure และยืนยัน bleeding risk ที่เลือกเองแล้ว';
  $('preBleed').closest('.field').append(otherCheck);
  const dialog=document.createElement('dialog');dialog.id='preRiskPopup';
  dialog.innerHTML='<div class="pre-dialog-head"><h3>ISTH SSC 2026 - Procedural bleeding risk</h3><button type="button" id="preRiskPopupClose">ปิด</button></div>'+
  '<input id="preRiskFilter" type="search" placeholder="ค้นหา procedure ในตารางตัวอย่าง..." aria-label="ค้นหา procedure">'+
  '<div id="preRiskTableBody"></div><small>รายการตรวจสอบแล้วบางส่วน (ไม่ใช่ตารางฉบับเต็ม) · <a href="'+guide+'" target="_blank" rel="noopener noreferrer">อ่านต้นฉบับ ISTH 2026 Tables 1-11</a></small>';
  root.append(dialog);
  const paintRisk=()=>{const q=val('preRiskFilter').toLowerCase(),arr=PROC.filter(p=>(p[0]+' '+p[2]).toLowerCase().includes(q));$('preRiskTableBody').innerHTML='<div class="pre-table-wrap"><table><thead><tr><th>Procedure</th><th>Risk</th><th>Group</th></tr></thead><tbody>'+
    arr.map(p=>'<tr><td><button type="button" data-select-proc="'+esc(p[0])+'">'+esc(p[0])+'</button></td><td>'+esc(LABEL[p[1]])+'</td><td>'+esc(p[2])+'</td></tr>').join('')+'</tbody></table></div>';};
  $('preRiskPopupOpen').onclick=()=>{paintRisk();dialog.showModal();};
  $('preRiskPopupClose').onclick=()=>dialog.close();
  $('preRiskFilter').oninput=paintRisk;
  $('preRiskTableBody').onclick=e=>{const b=e.target.closest('[data-select-proc]');if(!b)return;$('preProcedure').value=b.dataset.selectProc;chooseProcedure();dialog.close();};
  function chooseProcedure(){
    const found=PROC.find(p=>p[0].toLowerCase()===val('preProcedure').toLowerCase());
    mappedProcedure=!!found;
    $('preBleed').value=found?found[1]:'';
    $('preBleed').disabled=!!found;
    $('preOtherVerified').checked=false;
    $('preOtherReviewWrap').classList.toggle('hidden',!!found);
    changed();
  }
  $('preProcedure').addEventListener('change',chooseProcedure);
  $('preProcedure').addEventListener('input',()=>{mappedProcedure=false;$('preBleed').disabled=false;$('preBleed').value='';$('preOtherVerified').checked=false;$('preOtherReviewWrap').classList.remove('hidden');changed();});

  const note=document.createElement('section');note.className='pre-subsection';note.innerHTML='<h3>Copy OPD Note</h3><p class="muted">ภาษาไทย + medical terms ภาษาอังกฤษ · Plain text สำหรับ HOSxP · ไม่บันทึกข้อมูลผู้ป่วย</p><textarea id="preOPDNote" rows="8" readonly></textarea><div class="pre-actions"><button id="preCopyNote" type="button" class="primary">Copy OPD Note</button><span id="preCopyStatus" aria-live="polite"></span></div>';
  resultScreen.append(note);
  const back=document.createElement('button');back.type='button';back.id='preBack';back.textContent='กลับไปแก้ไขข้อมูล';
  resultScreen.insertBefore(back,output);
  const draft=document.createElement('button');draft.type='button';draft.id='preDraftPrint';draft.textContent='Print Draft A4';
  $('prePrint').insertAdjacentElement('beforebegin',draft);
  $('prePreview').textContent='Generate Plan / Preview A4';
  $('prePrint').textContent='Confirm & Print Final A4';
  $('preNotes').textContent='';

  // Hybrid current Warfarin regimen: weekly total or optional 7-day mg schedule.
  const dailyWidget=document.createElement('details');dailyWidget.className='pre-subsection';
  dailyWidget.innerHTML='<summary>ตาราง Warfarin 7 วัน (Optional)</summary><p class="muted">กรอกเป็น mg/day จ-อา; ใส่ 0 สำหรับวันเว้นยา หากกรอกครบจะคำนวณ Weekly dose ให้อัตโนมัติ</p>'+
    '<div class="pre-daily-grid">'+['จ','อ','พ','พฤ','ศ','ส','อา'].map((d,i)=>'<label>'+d+'<input type="number" id="preDaily'+i+'" min="0" step="0.1" placeholder="mg"></label>').join('')+'</div>'+
    '<small id="preDailyTotal"></small>';
  $('preWarfarinFields').append(dailyWidget);
  function dailyValues(){
    const values=Array.from({length:7},(_,i)=>val('preDaily'+i));
    if(!values.some(Boolean))return null;
    if(!values.every(x=>x!==''&&Number.isFinite(Number(x))&&Number(x)>=0))return 'incomplete';
    return values.map(Number);
  }
  function dailyFor(day,op){
    const values=dailyValues();
    if(!Array.isArray(values)||!op)return null;
    try {const date=core.shiftDate(op,day),weekday=(core.iso(date).getUTCDay()+6)%7;return values[weekday];}
    catch{return null;}
  }
  dailyWidget.addEventListener('input',()=>{
    const values=dailyValues();
    if(Array.isArray(values)){
      const total=values.reduce((a,b)=>a+b,0);
      $('preWeekly').value=String(Number(total.toFixed(2)));
      $('preDailyTotal').textContent='รวม '+total.toFixed(1)+' mg/week';
    }else $('preDailyTotal').textContent=values==='incomplete'?'กรอกให้ครบ 7 วัน (ระบุ 0 ได้)':'';
  });
  // Enoxaparin dose: suggest from actual body weight, allow clinician adjustment BEFORE generating calendar.
  const lmwhDoseWidget=document.createElement('div');
  lmwhDoseWidget.className='pre-lmwh-dose';
  lmwhDoseWidget.innerHTML='<div class="pre-form-grid">'+
    '<div class="field"><label for="preLmwhDose">Enoxaparin mg/dose (ปรับได้)</label>'+
    '<input type="number" id="preLmwhDose" min="0.01" step="0.1" placeholder="คำนวณจากน้ำหนัก">'+
    '<small>เริ่มต้น 1 mg/kg/dose SC q12h; ความเข้มข้น 100 mg/mL</small></div>'+
    '<div class="field"><label>ปริมาตรฉีดตามขนาดยาที่เลือก</label><strong id="preLmwhVolume">กรอกน้ำหนักเพื่อคำนวณ</strong>'+
    '<button type="button" id="preLmwhResetDose">Reset: 1 mg/kg</button></div></div>';
  $('preBridgeFields').append(lmwhDoseWidget);
  let lmwhDoseEdited=false;
  function refreshLmwhDose(){
    if(!lmwhDoseEdited){
      const w=num('preWeight'),mgKg=num('preLmwhMgKg');
      $('preLmwhDose').value=Number.isFinite(w)&&w>0&&Number.isFinite(mgKg)&&mgKg>0?String(Number((w*mgKg).toFixed(2))):'';
    }
    const mg=num('preLmwhDose');
    const d=Number.isFinite(mg)&&mg>0?core.enoxaparin(mg,1):null;
    $('preLmwhVolume').textContent=d?mg+' mg = '+d.volume+' mL SC/dose'+(d.multiAmpoule?' (มากกว่า 1 ampoule)':''):'รอข้อมูลขนาดยา';
  }
  $('preLmwhDose').addEventListener('input',()=>{lmwhDoseEdited=true;refreshLmwhDose();});
  $('preLmwhResetDose').onclick=()=>{lmwhDoseEdited=false;refreshLmwhDose();changed();};
  $('preWeight').addEventListener('input',refreshLmwhDose);
  $('preLmwhMgKg').addEventListener('input',()=>{lmwhDoseEdited=false;refreshLmwhDose();});
  refreshLmwhDose();
  // AF bridging suggestion is read-only guideline guidance, not an automatic order.
  const afAdvice=document.createElement('div');
  afAdvice.className='pre-guideline-advice';afAdvice.id='preAFBridgeAdvice';
  afAdvice.innerHTML='<strong>Guideline suggest: No routine bridging</strong><p class="muted">CHEST 2022 recommends against heparin bridging in AF.</p>';
  $('preAFExtra').append(afAdvice);
  const afOverride=document.createElement('div');afOverride.className='pre-subsection hidden';afOverride.id='preAFBridgeOverride';
  afOverride.innerHTML='<label for="preAFBridgeRationale">AF bridging override - เหตุผลสำหรับ individual decision</label>'+
    '<textarea id="preAFBridgeRationale" rows="2" placeholder="ระบุเหตุผลและแนวทางที่แพทย์ยืนยัน เนื่องจาก CHEST 2022 ไม่แนะนำ routine bridging"></textarea>';
  $('preBridgeFields').append(afOverride);
  function refreshAfAdvice(){
    const selection=core.afBridgeRecommendation({
      recentStroke:val('preAFStroke')==='recent'?'yes':'no',
      priorPeriopClot:val('preAFClot')==='yes'?'yes':'no'
    });
    $('preAFBridgeAdvice').innerHTML=selection.recommendation==='individual-review'
      ?'<strong>Guideline suggest: Individual physician review (ไม่ auto-bridge)</strong><p class="muted">CHEST 2022 แนะนำไม่ให้ routine bridging สำหรับ AF; recent embolism หรือ prior clot on interruption ต้องประเมินเฉพาะราย</p>'
      :'<strong>Guideline suggest: ไม่ทำ routine bridging</strong><p class="muted">CHEST 2022: Strong recommendation against heparin bridging for AF (คะแนน CHA2DS2-VA อย่างเดียวไม่ใช่เหตุผลให้ bridging)</p>';
  }
  $('preAFStroke').addEventListener('change',refreshAfAdvice);
  $('preAFClot').addEventListener('change',refreshAfAdvice);
  refreshAfAdvice();
  $('preApixDose').insertAdjacentHTML('beforeend','<option value="other">Other (Physician review)</option>');
  const apixOther=document.createElement('div');apixOther.className='field hidden';apixOther.id='preApixOtherWrap';
  apixOther.innerHTML='<label for="preApixOther">Other Apixaban regimen (ระบุเพื่อทบทวน)</label><input id="preApixOther" placeholder="ขนาดยาและความถี่ เช่น 5 mg OD"><small>Non-standard dose: Draft only จนกว่าจะตรวจ clinical rules</small>';
  $('preApixDose').closest('.field').insertAdjacentElement('afterend',apixOther);


  const selectedValues=name=>[...root.querySelectorAll('input[name="'+name+'"]:checked')].map(x=>x.value);
  function targetInr(){
    return val('preTargetInr')==='other'?val('preTargetInrCustom').replace(/\s+/g,''):val('preTargetInr');
  }
  function validTargetInr(){
    const t=targetInr(),m=t.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
    return !!m&&Number(m[1])>0&&Number(m[2])>Number(m[1])&&Number(m[2])<=5;
  }
  // Other INR target must be a clinically reviewed numeric range, not arbitrary text.
  const targetWrap=$('preTargetInrCustomWrap');
  function thromboticAssessment(){
    const ind=val('preIndication');
    return core.assessThromboticRisk({
      indication:ind,cha2ds2Vasc:num('preScore'),
      strokeTiming:ind==='mechanical'?val('preValveStroke'):val('preAFStroke'),
      rheumaticMS:val('preRheumaticMS'),
      valvePositions:selectedValues('preValveAt'),valveGeneration:val('preValveGeneration'),
      valveFactors:selectedValues('preValveFactor'),vteTiming:val('preVTETime'),
      vteRecurrent:val('preVTERecur'),vteThrombophilia:val('preVTEThromb'),
      vteCancer:val('preVTECancer'),priorPeriopClot:ind==='vte'?val('preVTEClot'):val('preAFClot')
    });
  }
  function showThrombotic(){
    const a=thromboticAssessment(),el=$('preThromboticResult');
    if(!el)return;
    const level=a.level==='review'?'NEEDS REVIEW':a.level.toUpperCase();
    const reasons=a.reasons.length?a.reasons.map(x=>'<li>'+esc(x)+'</li>').join(''):'<li>กรอกข้อมูล indication เพื่อประเมิน</li>';
    el.innerHTML='<div class="pre-thrombotic-heading"><span>Thrombotic risk assessment</span>'+
      '<strong class="pre-risk-level pre-risk-'+esc(a.level)+'">'+esc(level)+'</strong></div>'+
      '<div class="pre-risk-reasons"><b>Supporting reasons</b><ul>'+reasons+'</ul></div>'+
      (a.notices.length?'<p class="pre-risk-notices">'+esc(a.notices.join('; '))+'</p>':'')+
      '<small>แสดงเหตุผลประกอบ ไม่ใช่คำสั่งให้ Bridging อัตโนมัติ</small>';
  }
  $('preTargetInr').addEventListener('change',()=>{
    targetWrap.classList.toggle('hidden',val('preTargetInr')!=='other');
  });
  function input(){
    const age=val('preAge'),sex=val('preSex'),wt=val('preWeight'),scr=val('preCr');
    const calc=core.crclCG(age,sex,wt,scr);
    const crCl=val('preCrCl')||(Number.isFinite(calc)?calc.toFixed(1):'');
    const indication=val('preIndication'),vs=selectedValues('preValveAt'),vf=selectedValues('preValveFactor'),vt=val('preVTETime');
    const recent=indication==='af'?val('preAFStroke')==='recent':indication==='vte'?(vt==='lt1'||vt==='lt3'):vf.includes('recent');
    const clot=indication==='af'?val('preAFClot'):indication==='vte'?val('preVTEClot'):'';
    const thromb=indication==='vte'?[ 'aps','severe' ].includes(val('preVTEThromb')):vf.includes('hyper');
    return {
      anticoagulant:val('preDrug'),indication,procedure:val('preProcedure'),
      bleedingRisk:val('preBleed'), // Procedure bleeding risk is independent of anesthesia technique.
      operationDate:val('preDate'),operationTime:val('preTime'),crCl,weightKg:wt,
      weeklyDose:val('preWeekly'),apixDose:val('preApixDose'),neuraxial:val('preNeuraxial'),
      valvePosition:vs.includes('mitral')?'mitral':vs.includes('tricuspid')?'tricuspid':vs.includes('aortic')?'aortic':'',
      valveRiskFactors:vf.some(x=>x!=='unknown')?'yes':'no',recentStroke:recent?'yes':'no',
      recentVTE:indication==='vte'&&recent?'yes':'no',severeThrombophilia:thromb?'yes':'no',
      priorPeriopClot:clot==='yes'?'yes':'no',
      bridgeChoice:val('preBridge'),
      lmwhMgPerKg:val('preLmwhMgKg'),lmwhMgPerDose:val('preLmwhDose'),lastDoseDateTime:val('preLastApix'),renalHoldDays:val('preRenalHold')
    };
  }
  function extraBlockers(p){
    const b=[],ind=p.indication;
    if(!mappedProcedure && !checked('preOtherVerified'))b.push('Other procedure: แพทย์ต้องยืนยัน bleeding risk ที่ประเมินเองก่อน Final.');
    if(ind==='af'){
      const score=num('preScore');
      if(!Number.isInteger(score)||score<0||score>9)b.push('ระบุ CHA2DS2-VASc score (กรอกเองหรือกดคำนวณ)');
      if(!val('preAFStroke')||!val('preAFClot')||!val('preRheumaticMS'))b.push('กรอกประวัติ Stroke/TIA, rheumatic MS และ perioperative thrombosis');
    }
    if(ind==='mechanical'){
      if(!selectedValues('preValveAt').length)b.push('ระบุตำแหน่ง Mechanical valve');
      if(!val('preValveStroke'))b.push('Mechanical valve: ต้องระบุ Stroke/TIA');
    }
    if(ind==='vte'){
      for(const [id,title] of [['preVTETime','VTE timing'],['preVTEType','DVT / PE'],['preVTERecur','Recurrent VTE'],['preVTEThromb','Thrombophilia'],['preVTECancer','Cancer history'],['preVTEClot','Previous perioperative VTE']])
        if(!val(id))b.push('กรอก '+title);
      // Recent VTE is a risk flag, not a missing Time since last VTE field.
      // Show postponement/review advice in the risk summary, not as a blocking input error.
    }
    // Unknown aortic generation is allowed; mark risk as Review rather than falsely Low.
    if(ind&&thromboticAssessment().level==='review' && !(ind==='mechanical' && selectedValues('preValveAt').includes('aortic') && ['unknown',''].includes(val('preValveGeneration')) && val('preValveStroke') && selectedValues('preValveAt').length))
      b.push('Thrombotic risk needs review / information incomplete');
    if(p.anticoagulant==='warfarin'&&(!Number.isFinite(num('preWeekly'))||num('preWeekly')<=0))b.push('Warfarin: ระบุ Weekly dose');
    if(p.anticoagulant==='warfarin'&&!validTargetInr())b.push('Target INR: เลือก 2-3, 2.5-3.5 หรือกรอกช่วงตัวเลขที่ถูกต้อง');
    if(p.anticoagulant==='warfarin'&&dailyValues()==='incomplete')b.push('Warfarin regimen รายวัน: ต้องกรอกครบทั้ง 7 วัน หรือเว้นว่างทั้งหมด');
    if(p.anticoagulant==='apixaban'&&val('preApixDose')==='other')b.push('Other Apixaban regimen: ต้องตรวจแผนและขนาดยากับแพทย์ก่อนใช้เป็น Final');
    if(p.anticoagulant==='warfarin'&&p.bridgeChoice==='yes'&&p.indication==='af'&&!val('preAFBridgeRationale')){
      b.push('AF: CHEST 2022 ไม่แนะนำ routine bridging; ถ้าเลือก bridging ต้องระบุเหตุผลเฉพาะรายก่อน Final');
    }
    return b;
  }
  // Visual checklist: red controls identify fields that need input/review before Final.
  const REVIEW_FIELDS=['preDrug','preIndication','preProcedure','preBleed','preOtherVerified','preDate',
    'preScore','preAFStroke','preAFClot','preRheumaticMS','preValveAt','preValveGeneration','preValveStroke','preVTETime',
    'preVTEType','preVTERecur','preVTEThromb','preVTECancer','preVTEClot',
    'preWeekly','preTargetInr','preTargetInrCustom','preApixDose','preCrCl','preWeight',
    'preLmwhDose','preAFBridgeRationale','preRenalHold'];
  function reviewControl(id){
    return $(id) || (id==='preValveAt'?root.querySelector('input[name="preValveAt"]'):null);
  }
  function issueTarget(message){
    const m=message.toLowerCase();
    if(m.includes('select warfarin'))return 'preDrug';
    if(m.includes('primary indication')||m.includes('apixaban + mechanical'))return 'preIndication';
    if(m.includes('procedure name'))return 'preProcedure';
    if(m.includes('bleeding risk')||m.includes('other procedure'))return m.includes('other procedure')?'preOtherVerified':'preBleed';
    if(m.includes('operation date')||m.includes('invalid operation'))return 'preDate';
    if(m.includes('cha2ds2-vasc'))return 'preScore';
    if(m.includes('stroke/tia')&&m.includes('perioperative'))return 'preAFStroke';
    if(m.includes('aortic mhv'))return 'preValveGeneration';
    if(m.includes('mechanical valve:'))return 'preValveStroke';
    if(m.includes('mechanical valve'))return 'preValveAt';
    if(m.includes('vte timing'))return 'preVTETime';
    if(m.includes('dvt / pe'))return 'preVTEType';
    if(m.includes('recurrent vte'))return 'preVTERecur';
    if(m.includes('thrombophilia'))return 'preVTEThromb';
    if(m.includes('cancer history'))return 'preVTECancer';
    if(m.includes('previous perioperative vte'))return 'preVTEClot';
    if(m.includes('target inr'))return val('preTargetInr')==='other'?'preTargetInrCustom':'preTargetInr';
    if(m.includes('weekly dose')||m.includes('warfarin regimen'))return 'preWeekly';
    if(m.includes('apixaban dose')||m.includes('apixaban regimen'))return 'preApixDose';
    if(m.includes('crcl')||m.includes('renal impairment'))return 'preCrCl';
    if(m.includes('body weight'))return 'preWeight';
    if(m.includes('lmwh dose'))return 'preLmwhDose';
    if(m.includes('af: chest'))return 'preAFBridgeRationale';
    return null;
  }
  function highlightReviewFields(p,blockers){
    REVIEW_FIELDS.forEach(id=>{
      const el=reviewControl(id);if(!el)return;
      const wrap=el.closest('.field, .check, .pre-checkrow')||el.parentElement;
      wrap?.classList.remove('pre-needs-attention');
      el.removeAttribute('aria-invalid');
      wrap?.querySelectorAll('.pre-input-error-hint').forEach(x=>x.remove());
    });
    const required=new Set(blockers.map(issueTarget).filter(Boolean));
    if(p.indication==='af'&&(!val('preAFStroke')||!val('preAFClot')||!val('preRheumaticMS'))){
      if(!val('preAFStroke'))required.add('preAFStroke');
      if(!val('preAFClot'))required.add('preAFClot');
      if(!val('preRheumaticMS'))required.add('preRheumaticMS');
    }
    if(p.anticoagulant==='warfarin'){
      if(!Number.isFinite(num('preWeekly'))||num('preWeekly')<=0)required.add('preWeekly');
      if(!validTargetInr())required.add(val('preTargetInr')==='other'?'preTargetInrCustom':'preTargetInr');
    }
    if(p.anticoagulant==='warfarin'&&p.bridgeChoice==='yes'&&!val('preLmwhDose'))required.add('preLmwhDose');
    for(const id of required){
      const el=reviewControl(id);if(!el)continue;
      const wrap=el.closest('.field, .check, .pre-checkrow')||el.parentElement;
      wrap?.classList.add('pre-needs-attention');
      el.setAttribute('aria-invalid','true');
      if(wrap&&!wrap.querySelector('.pre-input-error-hint')){
        const hint=document.createElement('small');hint.className='pre-input-error-hint';
        hint.textContent='! ต้องกรอกหรือทบทวนก่อน Final';
        wrap.append(hint);
      }
    }
    return required;
  }
  function switchFields(){
    const drug=val('preDrug'),ind=val('preIndication'),bridge=val('preBridge')==='yes';
    updateGuidelineSummary();showThrombotic();
    showAsra();
    $('preWarfarinFields').classList.toggle('hidden',drug!=='warfarin');
    targetWrap.classList.toggle('hidden',val('preTargetInr')!=='other');
    $('preApixFields').classList.toggle('hidden',drug!=='apixaban');
    $('preBridgeFields').classList.toggle('hidden',drug!=='warfarin'||!bridge);
    $('preAFBridgeOverride').classList.toggle('hidden',!(drug==='warfarin'&&ind==='af'&&bridge));
    $('preApixOtherWrap').classList.toggle('hidden',val('preApixDose')!=='other');
    $('preAFExtra').classList.toggle('hidden',ind!=='af');
    $('preValveExtra').classList.toggle('hidden',ind!=='mechanical');
    $('preVTEExtra').classList.toggle('hidden',ind!=='vte');
    $('preRenalHoldWrap').classList.toggle('hidden',drug!=='apixaban'||!(Number(input().crCl)<30));
    root.querySelectorAll('.pre-conditional-time').forEach(e=>e.classList.toggle('hidden',val('preNeuraxial')!=='yes'));
    const bridgeDecision=$('preBridge').closest('.field');
    if(bridgeDecision)bridgeDecision.classList.toggle('hidden',drug!=='warfarin');
    const apixBridgeInfo=$('preApixBridgeInfo');
    if(apixBridgeInfo)apixBridgeInfo.classList.toggle('hidden',drug!=='apixaban');
    updateRiskReference();
  }
  function hasSafeLmwh(p,v){
    const renal=Number(p.crCl);
    return p.anticoagulant==='warfarin' && v.action==='hold' &&
      p.bridgeChoice==='yes' &&
      Number.isFinite(renal) && renal>=30 && !!v.dose &&
      Number.isFinite(v.dose.mg) && v.dose.mg>0;
  }
  function bridgeFootnote(p,v){
    if(p.anticoagulant!=='warfarin'||p.bridgeChoice!=='yes') return '';
    if(!hasSafeLmwh(p,v))return 'LMWH bridging ยังไม่พร้อมออกคำสั่ง: ต้องทบทวน renal function, dose และ physician confirmation ก่อน';
    return 'Bridging note: เริ่ม Enoxaparin เมื่อ INR ต่ำกว่า therapeutic range ตามการประเมินของแพทย์ (ไม่จำเป็นต้องตรวจ INR ทุกวันโดยอัตโนมัติ)';
  }
  // Agreed A4 footnote: only Start Enoxaparin and Neuraxial bullets.
  // Last-dose/Day -1 instruction belongs exclusively in the medication calendar.
  function bridgingFootnoteHtml(p,v){
    if(!hasSafeLmwh(p,v))return '';
    const items=[
      'Start Enoxaparin: เริ่มเมื่อ INR ต่ำกว่า therapeutic range ตามการประเมินของแพทย์ ไม่จำเป็นต้องตรวจ INR ทุกวันโดยอัตโนมัติ',
      'Neuraxial: หากมี Spinal/Epidural หรือ Deep plexus block ให้ทีมวิสัญญีตรวจสอบ ASRA timing และ catheter precautions เพิ่มเติม'
    ];
    return '<div class="pre-bridging-print"><strong>Bridging note:</strong><ul>'+
      items.map(item=>'<li>'+esc(item)+'</li>').join('')+'</ul></div>';
  }
  function afRecommendationText(p){
    if(p.indication!=='af'||p.anticoagulant!=='warfarin')return '';
    const rule=core.afBridgeRecommendation({
      recentStroke:val('preAFStroke')==='recent'?'yes':'no',
      priorPeriopClot:val('preAFClot')==='yes'?'yes':'no'
    });
    return rule.recommendation==='individual-review'
      ? 'AF bridging: CHEST 2022 ไม่แนะนำ routine bridging; มี thrombotic exception ต้องประเมินเฉพาะราย ไม่เริ่ม LMWH อัตโนมัติ'
      : 'AF bridging: CHEST 2022 strong recommendation ไม่ทำ routine heparin bridging';
  }
  function makeRows(p,v){
    const result=[];
    const eligibleLmwh=hasSafeLmwh(p,v),expectedLmwh=p.anticoagulant==='warfarin'&&p.bridgeChoice==='yes';
    const doseText=eligibleLmwh?'Enoxaparin '+v.dose.volume+' mL SC ('+Number(v.dose.mg.toFixed(1))+' mg)':'';
    for(let day=-7;day<=7;day++){
      let drug='',manage='';
      const holding=v.action==='hold'&&Number.isInteger(v.holdDays)&&day>=-v.holdDays&&day<=0;
      if(day<0){
        if(p.anticoagulant==='warfarin'){
          const dose=dailyFor(day,p.operationDate);
          const current=Number.isFinite(dose)?(dose===0?'0 mg':dose+' mg'):(p.weeklyDose||'-')+' mg/wk';
          drug=holding?'Hold Warfarin':'Warfarin '+current;
        } else {
          drug=holding?'Hold Apixaban':'Apixaban '+(p.apixDose||'-')+' mg BID';
        }
      }
      if(day===0){
        drug='PROCEDURE';
        manage=p.anticoagulant==='apixaban'&&v.action==='continue'
          ?'หัตถการ Minimal risk: Apixaban '+(p.apixDose||'-')+' mg BID อาจให้ต่อเนื่องได้ หรือพิจารณางดเฉพาะ dose เช้าในวันหัตถการตามแพทย์ผู้ทำหัตถการ'
          :'ผ่าตัด / ประเมิน hemostasis ก่อน restart';
      }
      if(day>0){
        drug=p.anticoagulant==='warfarin'
          ?'Warfarin '+(Number.isFinite(dailyFor(day,p.operationDate))
            ?dailyFor(day,p.operationDate)+' mg'
            :(p.weeklyDose||'-')+' mg/wk')+(v.action==='hold'&&day>1?' (หลังยืนยัน restart)':'')
          :(v.action==='continue'
            ?'Apixaban '+(p.apixDose||'-')+' mg BID'
            :'');
        if(p.anticoagulant==='warfarin'&&v.action==='hold'&&day===1)
          manage='พิจารณา restart Warfarin '+(Number.isFinite(dailyFor(day,p.operationDate))
            ?dailyFor(day,p.operationDate)+' mg'
            :(p.weeklyDose||'-')+' mg/wk')+' เมื่อไม่มี bleeding/hemostasis ดี และแพทย์ยืนยัน';
        if(p.anticoagulant==='warfarin'&&v.action==='hold'&&day===5)
          manage='นัด INR 4 วันหลัง restart Warfarin จริง (Target INR '+targetInr()+')';
        if(p.anticoagulant==='apixaban'&&v.action==='hold'&&((p.bleedingRisk==='high'&&day===2)||(p.bleedingRisk!=='high'&&day===1)))
          manage='Suggest restart Apixaban '+val('preApixDose')+' mg BID if stable/no bleeding/hemostasis adequate and physician approves';
        if(p.anticoagulant==='apixaban'&&v.action==='hold'&&p.bleedingRisk==='high'&&day===3)
          manage='Alternative restart date if bleeding risk requires delay; surgical team confirms';
        if(p.anticoagulant==='apixaban'&&day===1&&p.bleedingRisk==='high')
          manage='Consider postoperative VTE prophylaxis if indicated (not therapeutic bridging); treating team decides';
        if(p.anticoagulant==='apixaban'&&v.action==='hold'&&!manage){
          // Keep maintenance dose visible on later days, but never imply an unconditional restart.
          const plannedRestart=p.bleedingRisk==='high'?2:1;
          if(day>plannedRestart)drug='Apixaban '+(p.apixDose||'-')+' mg BID (if restart confirmed)';
        }
      }
      if(expectedLmwh){
        if(day===-3||day===-2){
          manage=eligibleLmwh?doseText+' q12h':'Bridging selected: dose/renal/confirmation pending - NO LMWH ORDER';
        }
        if(day===-1){
          manage=eligibleLmwh
            ? 'หยุด Enoxaparin อย่างน้อย 24 hr ก่อนผ่าตัด'
            :'Bridging requires physician plan: do not administer LMWH pending review';
        }
        if(day>0&&(day===1||day===2||day===3)){
          // Avoid repeatedly printing full-dose therapeutic LMWH as an unconditional postop order.
          if(day===(p.bleedingRisk==='high'?2:1))
            manage+=(manage?' | ':'')+'พิจารณา restart LMWH หลังผ่าตัด '+(p.bleedingRisk==='high'?'48-72 hr':'>=24 hr')+' เมื่อไม่มี bleeding/hemostasis ดี และแพทย์ยืนยัน';
        }
        if(day===5&&p.anticoagulant==='warfarin'&&eligibleLmwh)
          manage+='; หยุด LMWH เมื่อ INR therapeutic และแพทย์ยืนยัน';
      }
      if(day===-1){
        const requirement=core.preopInrRequirement({
          anticoagulant:p.anticoagulant,action:v.action,neuraxial:p.neuraxial
        });
        if(requirement){
          const advice=requirement.kind==='neuraxial'
            ?'ตรวจ INR ให้เป็นปกติตาม lab ก่อน neuraxial'
            :'ตรวจ INR ก่อนผ่าตัด (โดยทั่วไป target <1.5 ตามหัตถการ)';
          // Put separate Day -1 instructions on their own lines, including in A4.
          manage+=(manage?'\n':'')+advice;
        }
      }
      result.push({day,date:dateAt(p.operationDate,day),drug,manage});
    }
    return result;
  }
  function plan(){
    const p=input(),v=core.plan(p),extra=extraBlockers(p);
    return {p,v,blockers:[...v.blockers,...extra]};
  }
  // Shared clinical rationale for A4 and HOSxP. Do not invent a physician approval statement.
  // Thrombotic risk factors support the decision but never automatically select bridging.
  function bridgingRationale(p,a){
    const entered=val('preAFBridgeRationale').trim();
    if(p.anticoagulant==='apixaban')return 'DOAC: ไม่แนะนำ routine therapeutic LMWH bridging';
    if(entered && p.indication==='af' && p.bridgeChoice==='yes')return entered;
    if(p.bridgeChoice==='yes')return a.reasons.join(', ') || 'ต้องระบุเหตุผลในการ bridging';
    if(p.indication==='af')return 'AF: ไม่แนะนำ routine bridging (CHEST 2022)';
    if(p.indication==='vte')return 'VTE: ไม่แนะนำ routine bridging เป็นหลัก (CHEST 2022)';
    if(a.level==='low')return 'Low thrombotic risk';
    return 'ต้องระบุเหตุผล No bridging เฉพาะราย';
  }
  const noteText=(p,v,blockers)=>{
    const a=thromboticAssessment(),sd=day=>p.operationDate?core.shiftDate(p.operationDate,day):'';
    const dt=x=>x?x.slice(8,10)+'/'+x.slice(5,7)+'/'+String(+x.slice(0,4)+543).slice(-2):'-';
    const risk=a.level==='review'?'Review':a.level[0].toUpperCase()+a.level.slice(1);
    const drug=LABEL[p.anticoagulant]||'-';
    const dosage=p.anticoagulant==='warfarin'?(p.weeklyDose||'-')+' mg/wk, target INR '+targetInr():(p.apixDose||'-')+' mg BID';
    const out=['Pre-op: '+(LABEL[p.indication]||'-')+' on '+drug+' '+dosage+', '+(p.procedure||'-')+' '+dt(p.operationDate)+' (Bleeding risk: '+(LABEL[p.bleedingRisk]||'-')+')',
      'Thrombotic risk: '+risk+' ('+(a.reasons.join(', ')||'รอข้อมูล')+')'];
    if(p.anticoagulant==='warfarin'){
      out.push('Plan: '+(v.action==='hold'&&Number.isInteger(v.holdDays)?'หยุด Warfarin '+dt(sd(-v.holdDays))+'-'+dt(sd(-1)):v.action==='continue'?'Continue Warfarin':'รอ physician review'));
      out.push('Bridging: '+(p.bridgeChoice==='yes'?'Yes':'No')+' ('+bridgingRationale(p,a)+')');
      if(p.bridgeChoice==='yes')out.push((hasSafeLmwh(p,v)?'Enoxaparin '+Number(v.dose.mg.toFixed(1))+' mg SC q12h':'Enoxaparin dose pending')+' วันที่ '+dt(sd(-3))+'-'+dt(sd(-2))+', hold 24 hr ก่อนผ่าตัด');
      out.push('Post-op: พิจารณา restart Warfarin เมื่อไม่มี bleeding/hemostasis ดี, นัด INR หลังเริ่มยา 4 วัน');
    }else{
      out.push('Plan: '+(v.action==='hold'?'หยุด Apixaban ตั้งแต่ '+dt(sd(-v.holdDays)):'พิจารณา continue')+', no routine bridging');
      out.push('Post-op: พิจารณา restart Apixaban เมื่อไม่มี bleeding/hemostasis ดี และแพทย์ยืนยัน');
    }
    if(blockers.length)out.push('DRAFT - รอทบทวน: '+blockers.join('; '));
    return out.join('\n');
  };
  function isMergedPostOp(p,r){
    // Post-op Warfarin and Apixaban use one full-width instruction cell.
    return (p.anticoagulant==='apixaban'||p.anticoagulant==='warfarin') && r.day>0;
  }
  function editableRow(r,i,p){
    const day='<td>'+r.day+'</td><td>'+esc(r.date)+'</td>';
    if(isMergedPostOp(p,r)){
      const col=r.manage?'manage':'drug';
      // One wide editable cell; the complete clinician-facing sentence is preserved.
      return '<tr>'+day+'<td colspan="2" class="pre-merged-postop"><textarea data-row="'+i+'" data-col="'+col+'" rows="2">'+esc(r[col])+'</textarea></td></tr>';
    }
    return '<tr>'+day+
      '<td><textarea data-row="'+i+'" data-col="drug" rows="2">'+esc(r.drug)+'</textarea></td>'+
      '<td><textarea data-row="'+i+'" data-col="manage" rows="2">'+esc(r.manage)+'</textarea></td></tr>';
  }
  function printableRow(r,p){
    const day='<td>'+r.day+'</td><td>'+esc(r.date)+'</td>';
    if(isMergedPostOp(p,r)){
      return '<tr>'+day+'<td colspan="2" class="pre-merged-postop">'+esc(r.manage||r.drug)+'</td></tr>';
    }
    return '<tr>'+day+'<td>'+esc(r.drug)+'</td><td>'+esc(r.manage).replace(/\n/g,'<br>')+'</td></tr>';
  }
  function buildTable(){
    $('preGrid').classList.remove('hidden');
    $('preGrid').innerHTML='<h3>Medication Calendar: Day -7 to +7 (แก้ข้อความในตารางได้)</h3><div class="pre-table-wrap"><table class="pre-edit-grid"><thead><tr><th>Day</th><th>Date (B.E.)</th><th>Anticoagulant</th><th>Management / Suggestion</th></tr></thead><tbody>'+
      rows.map((r,i)=>editableRow(r,i,activePlan.p)).join('')+'</tbody></table></div>'+
      (activePlan?bridgingFootnoteHtml(activePlan.p,activePlan.v):'');
  }
  const printHtml=(p,v,blocked)=>{
    const a=thromboticAssessment();
    const riskLabel=a.level==='review'?'Needs review':a.level[0].toUpperCase()+a.level.slice(1);
    const reasons=a.reasons.join(', ') || 'ต้องทบทวนข้อมูล';
    const indicationName=LABEL[p.indication]||'-';
    const valveName=p.indication==='mechanical'?' ('+selectedValues('preValveAt').map(x=>x[0].toUpperCase()+x.slice(1)).join(' + ')+')':'';
    const anticoagName=p.anticoagulant==='warfarin'
      ?'Warfarin '+(p.weeklyDose||'-')+' mg/wk (Target INR '+targetInr()+')'
      :'Apixaban '+(p.apixDose||'-')+' mg BID';
    const bridgingIsYes=p.anticoagulant==='warfarin' && p.bridgeChoice==='yes';
    const isWarfarin=p.anticoagulant==='warfarin';
    const bridgeReason=bridgingRationale(p,a);
    const hdr='<h2 class="pre-print-heading">แผนการจัดการยาต้านการแข็งตัวของเลือดก่อนผ่าตัด</h2>'+
      '<div class="pre-print-subheading">PERI-OPERATIVE ANTICOAGULANT MANAGEMENT</div>'+
      '<div class="pre-print-patient">'+
      '<div class="pre-header-row pre-header-patient"><strong>ชื่อผู้ป่วย:</strong> '+esc(val('preName')||'........................................................')+
      ' <span class="pre-header-age"><strong>อายุ:</strong> '+esc(val('preAge')||'____')+' ปี</span></div>'+
      '<div class="pre-header-row pre-header-procedure"><strong>Operation:</strong> '+esc(p.procedure||'-')+
        ' <span class="pre-header-date"><strong>วันที่:</strong> '+esc(p.operationDate?core.thaiDate(p.operationDate):'-')+'</span></div>'+
      '<div class="pre-header-row"><strong>Indication:</strong> '+esc(indicationName+valveName)+
      ' <span class="pre-header-separator">|</span> <strong>Anticoagulant:</strong> '+esc(anticoagName)+'</div>'+
      '<div class="pre-header-row"><strong>Bleeding risk:</strong> '+esc(LABEL[p.bleedingRisk]||'Unclassified')+
      ' <span class="pre-header-separator">|</span> <strong>Thrombotic risk:</strong> '+esc(riskLabel+' ('+reasons+')')+'</div>'+
      '<div class="pre-header-row pre-header-bridge"><strong>Bridging:</strong> '+
      esc(bridgingIsYes?'Yes':'No')+' — '+esc(bridgeReason)+'</div>'+
      '<div class="pre-header-row pre-header-renal"><strong>BW:</strong> '+esc(p.weightKg||'-')+' kg'+
      ' <span class="pre-header-separator">|</span> <strong>Cr:</strong> '+esc(val('preCr')||'-')+' mg/dL'+
      ' <span class="pre-header-separator">|</span> <strong>CrCl:</strong> '+esc(p.crCl||'-')+' mL/min</div>'+
      '</div>';
    const tbl='<table class="pre-print-grid"><thead><tr><th>Day</th><th>วันที่</th><th>ยา</th><th>แผนการรักษา / คำแนะนำ</th></tr></thead><tbody>'+
      rows.map(r=>printableRow(r,p)).join('')+'</tbody></table>';
    const safetyNotes=[];
    if(p.anticoagulant==='warfarin'&&v.action==='hold'&&p.neuraxial==='yes')
      safetyNotes.push('<strong>INR / Neuraxial:</strong> วิสัญญียืนยัน INR ปกติตาม local lab ก่อน block');
    if(a.level==='review') safetyNotes.push('<strong>Risk review:</strong> ข้อมูล thrombotic risk ยังไม่ครบ; ต้องให้แพทย์ทบทวนก่อนใช้แผน');
    if(p.indication==='vte'&&['lt1','lt3'].includes(val('preVTETime')))
      safetyNotes.push('<strong>Recent VTE:</strong> ประเมินความจำเป็นของ elective surgery และการเลื่อนผ่าตัด');
    if(isWarfarin&&bridgingIsYes&&p.indication==='mechanical')
      safetyNotes.push('<strong>Mechanical valve:</strong> พิจารณา INR ก่อนเริ่ม LMWH ตาม ESC/EACTS 2025');
    const warningHtml=(blocked?'<div class="pre-print-warning">DRAFT — รอ physician review / ไม่ใช่คำสั่งให้ยา</div>':'')+
      v.warnings.filter(x=>x.startsWith('ANESTHESIA ALERT:')).map(x=>'<p class="pre-print-warning">'+esc(x)+'</p>').join('');
    const notes='<div class="pre-print-notes">'+bridgingFootnoteHtml(p,v)+safetyNotes.map(x=>'<p class="pre-print-note">'+x+'</p>').join('')+
      '<p class="pre-print-note"><strong>Post-op:</strong> Restart anticoagulant เฉพาะเมื่อ hemostasis ดี ไม่มี active bleeding และแพทย์ผู้ดูแลยืนยัน</p>'+
      '</div>';
    const footer='<footer class="pre-print-footer">'+
      '<div class="pre-signature-block">'+
      '<div class="pre-signature-line">ลงชื่อ ........................................................</div>'+
      '<div class="pre-signature-name">('+esc(val('prePhysician')||'........................................................')+')</div>'+
      '<div class="pre-signature-date">วันที่ ............ / ............ / ............</div>'+
      '</div>'+
      '<small class="pre-reference-line">Clinical reference: AHA/ACC 2024; ESC/EACTS 2025; CHEST 2022; ISTH SSC 2026; ASRA 2025 · Clinical review required</small></footer>';
    return hdr+tbl+warningHtml+notes+footer;
  };
  function renderPlan(){
    const {p,v,blockers}=plan();
    activePlan={p,v,blockers};rows=makeRows(p,v);
    $('preStatus').textContent=blockers.length?'DRAFT - รอ Physician Review':'พร้อมให้แพทย์ยืนยัน Final';
    $('preStatus').className='pre-status'+(blockers.length?' blocked':'');
    highlightReviewFields(p,blockers);
    $('preSafety').classList.toggle('pre-blocking',blockers.length>0);
    $('preSafety').innerHTML=blockers.length
      ?'<h3>! ต้องแก้ไขก่อน Final ('+blockers.length+' รายการ)</h3><p class="pre-safety-guide">ช่องที่ต้องกรอก/ทบทวนมีกรอบสีแดงในหน้า Assessment กด "ไปกรอก" เพื่อแก้ไขได้ทันที</p><ul>'+
        blockers.map(x=>'<li><span>'+esc(x)+'</span>'+
          (issueTarget(x)?'<button type="button" class="pre-goto-field" data-fix-input="'+esc(issueTarget(x))+'">ไปกรอก</button>':'')+
          '</li>').join('')+'</ul>'
      :'<p>ไม่มีข้อมูลที่บังคับทบทวนเพิ่มเติม</p>';
    if(v.warnings.length)$('preSafety').innerHTML+='<div class="pre-clinical-reminders"><h3>Clinical reminders (ไม่ใช่ช่องที่กรอกค้าง)</h3><ul>'+v.warnings.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></div>';
    const riskSummary=thromboticAssessment();
    $('prePlan').innerHTML='<p><strong>Thrombotic risk:</strong> '+esc(riskSummary.level)+' ('+esc(riskSummary.reasons.join(', ')||'review')+')</p><p><strong>Guideline suggestion:</strong> '+esc(v.action==='continue'?'Continue':v.action==='hold'?'Interrupt / hold '+v.holdDays+' days':'Physician review')+
      '; Bridging selected: '+esc(v.bridging?'Yes (physician-selected)':'No')+'</p>'+
      (afRecommendationText(p)?'<p class="pre-guideline-advice">'+esc(afRecommendationText(p))+'</p>':'')+
      (bridgeFootnote(p,v)?'<p class="pre-lmwh-footnote">'+esc(bridgeFootnote(p,v))+'</p>':'');
    $('preSources').textContent='References: ISTH SSC 2026; '+v.sources.join(' / ');
    $('preNotes').textContent=p.neuraxial!=='no'
      ?'Anesthesia handoff: Neuraxial / epidural and catheter safety to be assessed by anesthesiologist. Warfarin Clinic plan does not authorize needle placement.'
      :'';
    buildTable();
    $('preOPDNote').value=noteText(p,v,blockers);
    refreshRendered();
    $('prePrintSurface').classList.add('pre-draft');
    $('prePrint').disabled=blockers.length>0;
  }
  function refreshRendered(){
    if(!activePlan)return;
    const {p,v,blockers}=activePlan;
    // Keep OPD note short; A4 calendar carries detailed daily management.
    $('preOPDNote').value=noteText(p,v,blockers);
    $('prePrintSurface').innerHTML=printHtml(p,v,true);
    $('prePrintSurface').classList.add('pre-draft');
  }
  function changed(){revision++;activePlan=null;switchFields();$('prePrint').disabled=true;}
  inputScreen.addEventListener('input',e=>{if(e.target.id!=='preProcedure')changed();});
  inputScreen.addEventListener('change',e=>{if(e.target.id!=='preProcedure')changed();});
  $('preCrCalc').onclick=()=>{const c=core.crclCG(val('preAge'),val('preSex'),val('preWeight'),val('preCr'));
    if(!Number.isFinite(c)){alert('กรอก Age / Sex / Actual weight / Serum creatinine ให้ครบ');return;}
    $('preCrCl').value=c.toFixed(1);changed();};
  $('preScoreCalc').onclick=()=>{
    const age=num('preAge');if(!Number.isFinite(age)||age<18){alert('กรอก Age ก่อน');return;}
    let sc=age>=75?2:age>=65?1:0;
    root.querySelectorAll('#preScoreChoices input:checked').forEach(c=>sc+=Number(c.dataset.points));
    $('preScore').value=sc;changed();
  };
  $('prePreview').onclick=()=>{
    renderPlan();inputScreen.classList.add('hidden');resultScreen.classList.remove('hidden');
    root.scrollIntoView({behavior:'smooth',block:'start'});
  };
  $('preBack').onclick=()=>{resultScreen.classList.add('hidden');inputScreen.classList.remove('hidden');root.scrollIntoView({behavior:'smooth',block:'start'});};
  $('preSafety').addEventListener('click',e=>{
    const b=e.target.closest('button[data-fix-input]');if(!b)return;
    resultScreen.classList.add('hidden');inputScreen.classList.remove('hidden');
    const target=reviewControl(b.dataset.fixInput);
    if(target){
      const details=target.closest('details');if(details)details.open=true;
      target.scrollIntoView({behavior:'smooth',block:'center'});
      target.focus({preventScroll:true});
    }
  });
  $('preGrid').addEventListener('input',e=>{
    const t=e.target,idx=Number(t.dataset.row),col=t.dataset.col;
    if(!Number.isInteger(idx)||!rows[idx]||!['drug','manage'].includes(col))return;
    rows[idx][col]=t.value;revision++;
    refreshRendered();
  });
  $('preDraftPrint').onclick=()=>{
    if(!activePlan)return;
    printPlan(activePlan.p,activePlan.v,true);
  };
  // Clicking this button is the clinician's explicit final confirmation.
  // Incomplete/unsafe plans still cannot use Final Print.
  $('prePrint').onclick=()=>{
    if(!activePlan || activePlan.blockers.length)return;
    $('preStatus').textContent='Final A4 - physician reviewed';
    printPlan(activePlan.p,activePlan.v,false);
  };
  $('preCopyNote').onclick=async()=>{
    const text=$('preOPDNote').value;
    if(!text)return;
    try{await navigator.clipboard.writeText(text);$('preCopyStatus').textContent='คัดลอกแล้ว';}
    catch{$('preOPDNote').focus();$('preOPDNote').select();$('preCopyStatus').textContent='เลือกข้อความแล้ว กด Ctrl+C';}
  };
  $('preNew').onclick=()=>{
    if(!window.confirm('ล้างข้อมูลเคสนี้ทั้งหมดและเริ่มรายใหม่?'))return;
    inputScreen.querySelectorAll('input,select,textarea').forEach(e=>{
      if(e.type==='checkbox')e.checked=false;
      else if(e.tagName==='SELECT')e.selectedIndex=0;
      else e.value='';
    });
    $('preLmwhMgKg').value='1';lmwhDoseEdited=false;refreshLmwhDose();$('preDailyTotal').textContent='';mappedProcedure=false;$('preBleed').disabled=false;$('preOtherVerified').checked=false;$('preOtherReviewWrap').classList.add('hidden');
    rows=[];activePlan=null;revision++;
    highlightReviewFields({},[]);
    $('prePrintSurface').innerHTML='';printHost.innerHTML='';$('preOPDNote').value='';$('preCopyStatus').textContent='';$('prePrint').disabled=true;
    resultScreen.classList.add('hidden');inputScreen.classList.remove('hidden');switchFields();
    root.scrollIntoView({behavior:'smooth',block:'start'});
  };
  $('preDrug').addEventListener('change',()=>{if(val('preDrug')==='apixaban'&&val('preIndication')==='mechanical'){
    alert('Mechanical heart valve ไม่รองรับ DOAC: โปรดทบทวน indication และ anticoagulant');
    $('preIndication').value='';
  }});
  $('preIndication').addEventListener('change',()=>{if(val('preDrug')==='apixaban'&&val('preIndication')==='mechanical'){
    alert('Mechanical heart valve ไม่รองรับ DOAC. กรุณาเลือก Warfarin หรือเปลี่ยน indication ตามข้อมูลจริง');
    $('preIndication').value='';
  }});

  // UI-only reflow. Reparent the original input nodes (and listeners), without
  // cloning, replacing, renaming fields or changing the clinical decision engine.
  function assessmentSection(number,title,subtitle){
    const section=document.createElement('section');
    section.className='pre-ui-section';
    section.innerHTML='<div class="pre-ui-section-heading">'+
      '<span class="pre-ui-section-number">'+number+'</span>'+
      '<div><h3>'+title+'</h3><p>'+subtitle+'</p></div></div>';
    return section;
  }
  function assessmentGrid(){
    const div=document.createElement('div');
    div.className='pre-form-grid pre-ui-fields';
    return div;
  }
  function moveExistingField(id,destination){
    const field=$(id)?.closest('.field');
    if(!field)throw new Error('Pre-op layout missing input: '+id);
    destination.append(field);
  }
  function restructureMechanicalValve(){
    const valve=$('preValveExtra');
    const factorHeading=[...valve.children].find(x=>x.tagName==='LABEL'&&x.textContent.includes('Additional prothrombotic'));
    if(!factorHeading)throw new Error('Mechanical valve factors heading missing');
    const primary=document.createElement('div');
    primary.className='pre-ui-risk-box';
    primary.innerHTML='<div class="pre-ui-box-title"><strong>A. Primary Risk Criteria</strong>'+
      '<small>Valve position / generation / Stroke-TIA</small></div>';
    while(valve.firstChild && valve.firstChild!==factorHeading)primary.append(valve.firstChild);
    const extra=document.createElement('div');
    extra.className='pre-ui-risk-box pre-ui-risk-additional';
    extra.innerHTML='<div class="pre-ui-box-title"><strong>B. Additional Prothrombotic Factors</strong>'+
      '<small>ESC/EACTS 2025 · Optional · เลือกได้หลายข้อ · ใช้เป็น Supporting reasons</small></div>';
    while(valve.firstChild)extra.append(valve.firstChild);
    valve.append(primary,extra);
    const primaryHelp=document.createElement('p');
    primaryHelp.className='pre-ui-explainer';
    primaryHelp.textContent='High-risk criteria (app): Any mechanical MV/TV, older-generation valve หรือ recent stroke/TIA <3 เดือน';
    primary.append(primaryHelp);
    const factorsHelp={recent:'Cardioembolic stroke / DVT / PE',lvef:'LV dysfunction',ms:'AF ร่วมกับ significant mitral stenosis',hyper:'Inherited / acquired'};
    extra.querySelectorAll('input[name="preValveFactor"]').forEach(control=>{
      const desc=factorsHelp[control.value];
      if(!desc)return;
      const hint=document.createElement('small');
      hint.className='pre-ui-factor-description';
      hint.textContent=desc;
      control.closest('label').append(hint);
    });
    const note=document.createElement('p');
    note.className='pre-ui-explainer';
    note.textContent='การไม่ติ๊ก ไม่ได้ยืนยันว่าไม่มีปัจจัย และการติ๊กไม่ได้เป็นคำสั่งให้ Bridging อัตโนมัติ';
    extra.append(note);
  }
  const RISK_REFERENCE_TABLES={
    af:{
      source:'AHA/ACC 2024, Table 14',
      url:'https://www.jacc.org/doi/10.1016/j.jacc.2024.06.013',
      rows:[
        ['Low','CHA2DS2-VASc 1-4 และไม่มี prior stroke/TIA'],
        ['Moderate','CHA2DS2-VASc 5-6 ไม่มี high-risk feature'],
        ['High','CHA2DS2-VASc >=7; score 5-6 + recent stroke/TIA; rheumatic valvular AF']
      ],
      caveat:'Recent stroke/TIA เป็น high-risk flag ให้ทบทวนเพิ่มเติม (ไม่ใช่คำสั่งให้ Bridging)'
    },
    mechanical:{
      source:'ESC/EACTS 2025 + 3-tier app classification',
      url:'https://academic.oup.com/eurheartj/article/46/44/4635/8234488',
      rows:[
        ['Low','Modern bileaflet mechanical AVR ไม่มี known additional factors'],
        ['Moderate','Modern AVR + additional prothrombotic factors (requires review)'],
        ['High','Any mechanical MV/TV, caged-ball / older-generation valve, recent stroke/TIA <3 เดือน']
      ],
      caveat:'ESC/EACTS ไม่ได้แบ่งเป็น Low / Moderate / High สามกลุ่มตรงตัว; ระดับนี้เป็นกติกาแสดงผลของแอป'
    },
    vte:{
      source:'CHEST 2022 (corrigendum 2023) / AHA-ACC 2024',
      url:'https://journal.chestnet.org/article/S0012-3692%2822%2901359-9/abstract',
      rows:[
        ['Low','VTE >12 เดือน ไม่มี additional risk factors'],
        ['Moderate','VTE 3-12 เดือน, recurrent VTE, non-severe thrombophilia, other active cancer'],
        ['High','VTE <3 เดือน, severe thrombophilia / APS, selected high VTE-risk active cancer']
      ],
      caveat:'Recent VTE <1 เดือนควรทบทวนความจำเป็นในการเลื่อน elective surgery'
    }
  };
  function updateRiskReference(){
    const el=$('preRiskTable');
    if(!el)return;
    const data=RISK_REFERENCE_TABLES[val('preIndication')];
    const wrapper=$('preRiskReference');
    if(wrapper)wrapper.classList.toggle('hidden',!data);
    if(!data){el.innerHTML='';return;}
    el.innerHTML='<table class="pre-ui-risk-table"><thead><tr><th>Risk</th><th>Criteria</th></tr></thead><tbody>'+
      data.rows.map(([level,criterion])=>'<tr><td><strong class="pre-ui-tier pre-ui-tier-'+level.toLowerCase()+'">'+esc(level)+'</strong></td><td>'+esc(criterion)+'</td></tr>').join('')+
      '</tbody></table><p class="pre-ui-reference-caveat">'+esc(data.caveat)+'</p>'+
      '<a href="'+data.url+'" target="_blank" rel="noopener noreferrer">Reference: '+esc(data.source)+'</a>';
  }
  function buildAssessmentLayout(){
    const layout=document.createElement('div');
    layout.id='preAssessmentLayout';
    layout.className='pre-ui-layout';
    inputScreen.prepend(layout);

    const procedure=assessmentSection('01','Procedure & Patient','Operation, bleeding risk และข้อมูลสำหรับ renal assessment');
    layout.append(procedure); // Keep destination in document while moving existing inputs.
    const procFields=assessmentGrid();
    ['preProcedure','preDate','preTime','preBleed'].forEach(id=>moveExistingField(id,procFields));
    procedure.append(procFields);
    const bleedingReference=document.createElement('details');
    bleedingReference.className='pre-ui-reference';
    bleedingReference.id='preProcedureReference';
    bleedingReference.innerHTML='<summary>ดู Procedure Bleeding Risk Table · ISTH 2026 (ค้นหาและเลือกได้)</summary>';
    bleedingReference.append($('preRiskInline'));
    procedure.append(bleedingReference);
    const patientHeading=document.createElement('h4');
    patientHeading.className='pre-ui-subheading';
    patientHeading.textContent='Patient & Renal Assessment';
    procedure.append(patientHeading);
    const patientFields=assessmentGrid();
    ['preName','preAge','preSex','preWeight','preCr','preCrCl','preNeuraxial'].forEach(id=>moveExistingField(id,patientFields));
    procedure.append(patientFields,$('preAsraReview'));
    const printDetails=[...inputScreen.children].find(x=>x.tagName==='DETAILS'&&x.textContent.includes('Print details'));
    if(printDetails){
      printDetails.classList.add('pre-ui-reference');
      procedure.append(printDetails);
    }

    const anticoag=assessmentSection('02','Anticoagulant','เลือกยาที่ใช้อยู่และข้อมูลขนาดยา');
    layout.append(anticoag);
    const anticoagFields=assessmentGrid();
    ['preDrug','preIndication'].forEach(id=>moveExistingField(id,anticoagFields));
    anticoag.append(anticoagFields,$('preWarfarinFields'),$('preApixFields'));

    const riskSection=assessmentSection('03','Thrombotic Risk Assessment','คำถามเปลี่ยนตาม indication โดยไม่ต้องจำระดับ risk เอง');
    layout.append(riskSection);
    riskSection.append($('preClinicalRisk'));
    restructureMechanicalValve();

    const bridging=assessmentSection('04','Bridging Plan','ตัดสินใจแยกจาก thrombotic risk · ไม่สั่ง bridging อัตโนมัติ');
    layout.append(bridging);
    const bridgeDecision=assessmentGrid();
    moveExistingField('preBridge',bridgeDecision);
    bridging.append(bridgeDecision,$('preBridgeFields'));
    const apixBridgeInfo=document.createElement('p');
    apixBridgeInfo.id='preApixBridgeInfo';
    apixBridgeInfo.className='pre-ui-explainer hidden';
    apixBridgeInfo.textContent='Apixaban: ไม่แนะนำ routine therapeutic LMWH bridging';
    bridging.append(apixBridgeInfo);

    const summary=assessmentSection('05','Risk Summary & Reference','แสดงระดับความเสี่ยงและเหตุผลก่อน Generate Plan');
    layout.append(summary);
    summary.append($('preThromboticResult'));
    const refDetails=document.createElement('details');
    refDetails.id='preRiskReference';
    refDetails.className='pre-ui-reference';
    refDetails.innerHTML='<summary>ดูเกณฑ์ Low / Moderate / High ตาม Indication</summary>'+
      '<div id="preRiskTable" class="pre-ui-table-wrap"></div>';
    summary.append(refDetails);
    const guidelineDetails=document.createElement('details');
    guidelineDetails.className='pre-ui-reference pre-ui-guideline-details';
    guidelineDetails.innerHTML='<summary>Guideline consideration · Bridging review</summary>';
    guidelineDetails.append($('preRiskGuideline'));
    summary.append(guidelineDetails);
    const actions=inputScreen.querySelector('.pre-actions');
    if(actions){actions.classList.add('pre-ui-final-actions');summary.append(actions);}
    // Section cards are already attached to the live document above.
    // The old source grid is empty after fields are moved; never leave a blank gap.
    if(first && !first.children.length)first.remove();
    updateRiskReference();
  }
  buildAssessmentLayout();

  switchFields();
})();