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
  let revision=0,confirmed=-1,activePlan=null,rows=[],mappedProcedure=false,rendering=false;

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
  $('preTime')?.closest('.field')?.classList.add('pre-conditional-time');
  $('preLastApix')?.closest('.field')?.classList.add('pre-conditional-time');

  const risk=document.createElement('section');risk.className='pre-subsection';risk.id='preClinicalRisk';
  risk.innerHTML='<h3>Thrombotic risk (ตาม Indication)</h3>'+
  '<div id="preAFExtra" class="hidden"><div class="pre-form-grid"><div class="field"><label for="preScore">CHA2DS2-VA score (กรอกเองได้)</label><input type="number" id="preScore" min="0" max="8" step="1" placeholder="0-8"><details><summary>คำนวณ CHA2DS2-VA</summary><div id="preScoreChoices">'+
  '<label><input type="checkbox" data-points="1"> Heart failure</label><label><input type="checkbox" data-points="1"> Hypertension</label><label><input type="checkbox" data-points="1"> Diabetes</label><label><input type="checkbox" data-points="2"> Prior stroke/TIA</label><label><input type="checkbox" data-points="1"> Vascular disease</label></div>'+
  '<button type="button" id="preScoreCalc">ใช้คะแนนที่คำนวณจากอายุและโรคร่วม</button></details></div>'+
  '<div class="field"><label for="preAFStroke">Stroke/TIA/Embolism ล่าสุด</label><select id="preAFStroke"><option value="">เลือก</option><option value="none">ไม่มีประวัติที่ทราบ / ไม่ทราบ</option><option value="recent">ภายใน 3 เดือนก่อนผ่าตัด</option><option value="remote">เกิน 3 เดือน</option></select></div>'+
  '<div class="field"><label for="preAFClot">เคยเกิด thrombosis ระหว่างหยุด anticoagulant?</label><select id="preAFClot"><option value="">เลือก</option><option value="no">ไม่เคย</option><option value="yes">เคย</option><option value="unknown">ไม่ทราบ</option></select></div></div></div>'+
  '<div id="preValveExtra" class="hidden"><p>Mechanical valve position (เลือกได้หลายตำแหน่ง)</p><div class="pre-checkrow">'+
  '<label><input type="checkbox" name="preValveAt" value="aortic"> Aortic</label><label><input type="checkbox" name="preValveAt" value="mitral"> Mitral</label><label><input type="checkbox" name="preValveAt" value="tricuspid"> Tricuspid</label><label><input type="checkbox" name="preValveAt" value="unknown"> Unknown</label></div>'+
  '<p class="muted">ไม่ต้องระบุชนิด/รุ่นของ valve; aortic valve ที่ไม่ทราบ generation ต้อง review</p><label>Additional thrombotic risk factors (เลือกได้หลายข้อ)</label><div class="pre-checkrow">'+
  '<label><input type="checkbox" name="preValveFactor" value="recent"> Major thrombotic event ภายใน 12 เดือน</label>'+
  '<label><input type="checkbox" name="preValveFactor" value="lvef"> LVEF &lt;35%</label>'+
  '<label><input type="checkbox" name="preValveFactor" value="ms"> AF with significant MS</label>'+
  '<label><input type="checkbox" name="preValveFactor" value="hyper"> Hypercoagulable state</label>'+
  '<label><input type="checkbox" name="preValveFactor" value="unknown"> ไม่ทราบ</label></div></div>'+
  '<div id="preVTEExtra" class="hidden"><div class="pre-form-grid">'+
  '<div class="field"><label for="preVTETime">Time since last VTE</label><select id="preVTETime"><option value="">เลือก</option><option value="lt1">ภายใน 1 เดือน</option><option value="lt3">1 ถึงน้อยกว่า 3 เดือน</option><option value="3to12">3-12 เดือน</option><option value="gt12">มากกว่า 12 เดือน</option><option value="unknown">ไม่ทราบ</option></select></div>'+
  '<div class="field"><label for="preVTEType">Type of VTE</label><select id="preVTEType"><option value="">เลือก</option><option value="dvt">DVT</option><option value="pe">PE</option><option value="both">DVT + PE</option><option value="unknown">ไม่ทราบ</option></select></div>'+
  '<div class="field"><label for="preVTERecur">Recurrent VTE</label><select id="preVTERecur"><option value="">เลือก</option><option value="no">First VTE</option><option value="yes">Recurrent VTE</option><option value="unknown">ไม่ทราบ</option></select></div>'+
  '<div class="field"><label for="preVTEThromb">Known thrombophilia</label><select id="preVTEThromb"><option value="">เลือก</option><option value="none">ไม่มีประวัติที่ทราบ</option><option value="aps">APS</option><option value="severe">Other severe thrombophilia</option><option value="nonsevere">Non-severe thrombophilia</option><option value="unknown">มี แต่ไม่ทราบชนิด</option></select>'+
  '<details><summary>Thrombophilia / Thrombotic risk</summary><table><tr><th>Condition</th><th>Risk feature</th></tr><tr><td>APS, antithrombin/protein C/S deficiency, homozygous/multiple thrombophilia</td><td>High</td></tr><tr><td>Heterozygous FVL / Prothrombin G20210A</td><td>Moderate</td></tr></table><small>CHEST 2022 risk table; does not independently mandate bridging.</small></details></div>'+
  '<div class="field"><label for="preVTECancer">Cancer history</label><select id="preVTECancer"><option value="">เลือก</option><option value="none">ไม่มี Active cancer หรือประวัติภายใน 5 ปี</option><option value="high">Active pancreatic / primary brain / gastric / esophageal cancer / MPN</option><option value="other">Other active cancer</option><option value="history">Cancer history ภายใน 5 ปี (ไม่ active)</option><option value="unknown">ไม่ทราบ</option></select></div>'+
  '<div class="field"><label for="preVTEClot">Previous VTE during anticoagulant interruption</label><select id="preVTEClot"><option value="">เลือก</option><option value="no">ไม่เคย</option><option value="yes">เคย</option><option value="unknown">ไม่ทราบ</option></select></div></div></div>'+
  '<label class="check"><input type="checkbox" id="preRiskV2Confirm"> Physician reviewed thrombotic risk / guideline recommendation</label>';
  $('preBridgeFields').insertAdjacentElement('beforebegin',risk);
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
  $('preConfirm').parentElement.lastChild.textContent=' แพทย์ยืนยันว่าได้ตรวจ risk, ขนาดยา, วันที่ และเงื่อนไขการเริ่มยาแล้ว';
  $('prePrint').textContent='Print Final A4 (Clinician Review)';
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
      bleedingRisk:val('preNeuraxial')==='yes'?'high':val('preBleed'),
      operationDate:val('preDate'),operationTime:val('preTime'),crCl,weightKg:wt,
      weeklyDose:val('preWeekly'),apixDose:val('preApixDose'),neuraxial:val('preNeuraxial'),
      valvePosition:vs.includes('mitral')?'mitral':vs.includes('tricuspid')?'tricuspid':vs.includes('aortic')?'aortic':'',
      valveRiskFactors:vf.some(x=>x!=='unknown')?'yes':'no',recentStroke:recent?'yes':'no',
      recentVTE:indication==='vte'&&recent?'yes':'no',severeThrombophilia:thromb?'yes':'no',
      priorPeriopClot:clot==='yes'?'yes':'no',riskReviewed:checked('preRiskV2Confirm'),
      bridgeChoice:val('preBridge'),bridgeConfirmed:checked('preBridgeConfirmed'),
      lmwhMgPerKg:val('preLmwhMgKg'),lmwhMgPerDose:val('preLmwhDose'),lastDoseDateTime:val('preLastApix'),renalHoldDays:val('preRenalHold'),
      physicianConfirmed:checked('preConfirm')&&confirmed===revision
    };
  }
  function extraBlockers(p){
    const b=[],ind=p.indication;
    if(!mappedProcedure && !checked('preOtherVerified'))b.push('Other procedure: แพทย์ต้องยืนยัน bleeding risk ที่ประเมินเองก่อน Final.');
    if(!checked('preRiskV2Confirm'))b.push('ยังไม่ได้ยืนยันการประเมิน Thrombotic risk');
    if(ind==='af'){
      const score=num('preScore');
      if(!Number.isInteger(score)||score<0||score>8)b.push('ระบุ CHA2DS2-VA score (กรอกเองหรือกดคำนวณ)');
      if(!val('preAFStroke')||!val('preAFClot'))b.push('กรอกประวัติ Stroke/TIA และ perioperative thrombosis');
    }
    if(ind==='mechanical'){
      if(!selectedValues('preValveAt').length)b.push('ระบุตำแหน่ง Mechanical valve');
      if(p.valvePosition==='aortic')b.push('Aortic MHV ไม่ทราบ valve generation: ต้องยืนยันแผน bridging แบบเฉพาะราย (ไม่ตีความเป็น low risk).');
    }
    if(ind==='vte'){
      for(const [id,title] of [['preVTETime','VTE timing'],['preVTEType','DVT / PE'],['preVTERecur','Recurrent VTE'],['preVTEThromb','Thrombophilia'],['preVTECancer','Cancer history'],['preVTEClot','Previous perioperative VTE']])
        if(!val(id))b.push('กรอก '+title);
      if(['lt1','lt3'].includes(val('preVTETime')))b.push('Recent VTE: elective surgery timing and interruption need individualized physician review.');
    }
    if(p.anticoagulant==='warfarin' && (!Number.isFinite(num('preWeekly'))||num('preWeekly')<=0||!val('preTargetInr')))b.push('Warfarin: ระบุ Weekly dose และ Target INR');
    if(p.anticoagulant==='warfarin'&&dailyValues()==='incomplete')b.push('Warfarin regimen รายวัน: ต้องกรอกครบทั้ง 7 วัน หรือเว้นว่างทั้งหมด');
    if(p.anticoagulant==='apixaban'&&val('preApixDose')==='other')b.push('Other Apixaban regimen: ต้องตรวจแผนและขนาดยากับแพทย์ก่อนใช้เป็น Final');
    if(p.anticoagulant==='warfarin'&&p.bridgeChoice==='yes'&&p.indication==='af'&&!val('preAFBridgeRationale')){
      b.push('AF: CHEST 2022 ไม่แนะนำ routine bridging; ถ้าเลือก bridging ต้องระบุเหตุผลเฉพาะรายก่อน Final');
    }
    if(p.neuraxial!=='no')b.push('Neuraxial/deep plexus: ต้องยืนยันแผนกับวิสัญญีและตรวจ ASRA timing ก่อน Final.');
    return b;
  }
  function switchFields(){
    const drug=val('preDrug'),ind=val('preIndication'),bridge=val('preBridge')==='yes';
    $('preWarfarinFields').classList.toggle('hidden',drug!=='warfarin');
    $('preApixFields').classList.toggle('hidden',drug!=='apixaban');
    $('preBridgeFields').classList.toggle('hidden',drug!=='warfarin'||!bridge);
    $('preAFBridgeOverride').classList.toggle('hidden',!(drug==='warfarin'&&ind==='af'&&bridge));
    $('preApixOtherWrap').classList.toggle('hidden',val('preApixDose')!=='other');
    $('preAFExtra').classList.toggle('hidden',ind!=='af');
    $('preValveExtra').classList.toggle('hidden',ind!=='mechanical');
    $('preVTEExtra').classList.toggle('hidden',ind!=='vte');
    $('preRenalHoldWrap').classList.toggle('hidden',drug!=='apixaban'||!(Number(input().crCl)<30));
    root.querySelectorAll('.pre-conditional-time').forEach(e=>e.classList.toggle('hidden',val('preNeuraxial')!=='yes'));
  }
  function hasSafeLmwh(p,v){
    const renal=Number(p.crCl);
    return p.anticoagulant==='warfarin' && v.action==='hold' &&
      p.bridgeChoice==='yes' && p.bridgeConfirmed === true &&
      Number.isFinite(renal) && renal>=30 && !!v.dose &&
      Number.isFinite(v.dose.mg) && v.dose.mg>0;
  }
  function bridgeFootnote(p,v){
    if(p.anticoagulant!=='warfarin'||p.bridgeChoice!=='yes') return '';
    if(!hasSafeLmwh(p,v))return 'LMWH bridging ยังไม่พร้อมออกคำสั่ง: ต้องทบทวน renal function, dose และ physician confirmation ก่อน';
    return 'Bridging note: เริ่ม therapeutic Enoxaparin หลัง INR ต่ำกว่า therapeutic range ตามผลตรวจที่แพทย์ประเมินก่อนเริ่ม (ไม่สั่งตรวจ INR ทุกวันโดยอัตโนมัติ). Last dose ประมาณ 24 ชั่วโมงก่อนหัตถการ; Day -1 AM เท่านั้น, งด PM. ยืนยันเวลาฉีดครั้งสุดท้ายกับเวลาเริ่มผ่าตัดจริง. ถ้า Neuraxial ต้องใช้ ASRA timing เพิ่มเติม';
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
        drug=v.action==='continue'?'Continue '+LABEL[p.anticoagulant]:(holding?'Hold '+LABEL[p.anticoagulant]:'Usual '+LABEL[p.anticoagulant]+' regimen');
        const dose=p.anticoagulant==='warfarin'&&!holding?dailyFor(day,p.operationDate):null;
        if(dose!==null)drug+=' ('+dose+' mg)';
      }
      if(day===0){
        drug='PROCEDURE';
        manage='ผ่าตัด / ประเมิน hemostasis ก่อน restart';
      }
      if(day>0){
        drug='Post-op: treating team to confirm';
        if(p.anticoagulant==='warfarin'&&v.action==='hold'&&day===1)
          manage='Suggest restart Warfarin '+(dailyFor(day,p.operationDate)===null?'usual maintenance dose':dailyFor(day,p.operationDate)+' mg')+' if stable, no bleeding, hemostasis adequate';
        if(p.anticoagulant==='warfarin'&&v.action==='hold'&&day===5)
          manage='Suggested INR check (4 วันหลัง planned restart Day +1); ถ้า restart จริงช้ากว่านี้ให้เลื่อน INR check. Target INR '+val('preTargetInr');
        if(p.anticoagulant==='apixaban'&&v.action==='hold'&&((p.bleedingRisk==='high'&&day===2)||(p.bleedingRisk!=='high'&&day===1)))
          manage='Suggest restart Apixaban '+val('preApixDose')+' mg BID if stable/no bleeding/hemostasis adequate and physician approves';
        if(p.anticoagulant==='apixaban'&&v.action==='hold'&&p.bleedingRisk==='high'&&day===3)
          manage='Alternative restart date if bleeding risk requires delay; surgical team confirms';
        if(p.anticoagulant==='apixaban'&&day===1&&p.bleedingRisk==='high')
          manage='Consider postoperative VTE prophylaxis if indicated (not therapeutic bridging); treating team decides';
      }
      if(expectedLmwh){
        if(day===-3||day===-2){
          manage=eligibleLmwh?doseText+' q12h (planned bridging schedule)':'Bridging selected: dose/renal/confirmation pending - NO LMWH ORDER';
        }
        if(day===-1){
          manage=eligibleLmwh
            ?doseText+' LAST DOSE Day -1 AM ONLY; STOP thereafter, OMIT PM dose. Ensure >=24 h before procedure'
            :'Bridging requires physician plan: do not administer LMWH pending review';
        }
        if(day>0&&(day===1||day===2||day===3)){
          // Avoid repeatedly printing full-dose therapeutic LMWH as an unconditional postop order.
          if(day===(p.bleedingRisk==='high'?2:1))
            manage+=(manage?' | ':'')+'LMWH restart only if indicated, >=24 h (low/mod) or 48-72 h (high), hemostasis adequate and treating team confirms';
        }
        if(day===5&&p.anticoagulant==='warfarin')
          manage+='; If LMWH was restarted, stop only once INR therapeutic and physician approves';
      }
      if(p.anticoagulant==='warfarin'&&v.action==='hold'&&day===-1&&p.bleedingRisk==='high')
        manage+=(manage?' | ':'')+'Check pre-op INR (aim at local procedural target; commonly <1.5 for major surgery). Review abnormal INR with surgeon';
      result.push({day,date:dateAt(p.operationDate,day),drug,manage});
    }
    return result;
  }
  function plan(){
    const p=input(),v=core.plan(p),extra=extraBlockers(p);
    return {p,v,blockers:[...v.blockers,...extra]};
  }
  const noteText=(p,v,blockers)=>{
    const lines=['วางแผน Pre-op anticoagulant'+(blockers.length?' (DRAFT - รอทบทวน)':''),
      'Indication: '+(LABEL[p.indication]||'-')+', ยา '+(LABEL[p.anticoagulant]||'-'),
      'Procedure: '+(p.procedure||'-')+'; วันผ่าตัด: '+(p.operationDate||'-'),
      'Bleeding risk: '+(LABEL[p.bleedingRisk]||'Unclassified')+'; Thrombotic risk: ประเมินตาม indication',
      'CrCl: '+(p.crCl||'-')+' mL/min',
      'แผนก่อนผ่าตัด: '+(v.action==='continue'?'continue ยาเดิม':v.action==='hold'?'หยุด '+LABEL[p.anticoagulant]+' ตั้งแต่ Day -'+v.holdDays:'รอ individualized plan')];
    if(p.anticoagulant==='warfarin'){
      if(p.indication==='af')lines.push(afRecommendationText(p));
      lines.push('Warfarin: '+(p.weeklyDose||'-')+' mg/week; Target INR: '+(val('preTargetInr')||'-')+'; Bridging: '+(v.bridging?'conditional LMWH (แพทย์ยืนยันแล้ว)':'ไม่มีแผน bridging'));
      lines.push('หลังผ่าตัด: พิจารณา restart Warfarin ขนาดเดิม เมื่อ hemostasis adequate, no bleeding และแพทย์ผู้ดูแลยืนยัน');
      lines.push('เสนอ INR check 4 วันหลัง restart Warfarin จริง; ปรับวันนัดหาก restart ล่าช้า');
    }else{
      lines.push('Apixaban: '+(p.apixDose||'-')+' mg BID; ไม่ให้ therapeutic bridging เป็น routine');
      lines.push('หลังผ่าตัด: พิจารณา restart Apixaban ตาม bleeding risk เมื่อ hemostasis adequate และแพทย์ผู้ดูแลยืนยัน');
    }
    if(bridgeFootnote(p,v))lines.push(bridgeFootnote(p,v));
    if(p.indication==='af'&&p.bridgeChoice==='yes'&&val('preAFBridgeRationale'))
      lines.push('Individual AF bridging rationale: '+val('preAFBridgeRationale'));
    if(blockers.length)lines.push('รอทบทวน: '+blockers.join('; '));
    return lines.join('\n').replace(/[→↑↓≥≤]/g,' ');
  };
  function buildTable(){
    $('preGrid').classList.remove('hidden');
    $('preGrid').innerHTML='<h3>Medication Calendar: Day -7 to +7 (แก้ข้อความในตารางได้)</h3><div class="pre-table-wrap"><table class="pre-edit-grid"><thead><tr><th>Day</th><th>Date (B.E.)</th><th>Anticoagulant</th><th>Management / Suggestion</th></tr></thead><tbody>'+
      rows.map((r,i)=>'<tr><td>'+r.day+'</td><td>'+esc(r.date)+'</td><td><textarea data-row="'+i+'" data-col="drug" rows="2">'+esc(r.drug)+'</textarea></td><td><textarea data-row="'+i+'" data-col="manage" rows="2">'+esc(r.manage)+'</textarea></td></tr>').join('')+'</tbody></table></div>'+
      (activePlan&&bridgeFootnote(activePlan.p,activePlan.v)?'<p class="pre-lmwh-footnote">'+esc(bridgeFootnote(activePlan.p,activePlan.v))+'</p>':'');
  }
  const printHtml=(p,v,blocked)=>{
    const hdr='<h2 class="pre-print-heading">PERI-OPERATIVE ANTICOAGULANT MANAGEMENT</h2>'+
      '<div class="pre-print-patient">Patient: '+esc(val('preName')||'________________')+
      ' · Age: '+esc(val('preAge')||'____')+' · Operation: '+esc(p.operationDate?core.thaiDate(p.operationDate):'________')+
      '<br>Indication: '+esc(LABEL[p.indication]||'-')+' · Anticoagulant: '+esc(LABEL[p.anticoagulant]||'-')+
      ' · Procedure: '+esc(p.procedure||'-')+
      '<br>Bleeding risk: '+esc(LABEL[p.bleedingRisk]||'-')+' · CrCl: '+esc(p.crCl||'-')+' mL/min'+
      (p.indication==='mechanical'?' · Valve: '+esc(selectedValues('preValveAt').join('+')||'Unknown'):'')+
      (p.anticoagulant==='warfarin'?' · Warfarin '+esc(p.weeklyDose)+' mg/wk · Target INR '+esc(val('preTargetInr')):' · Apixaban '+esc(p.apixDose)+' mg BID')+
      '<br>'+esc(afRecommendationText(p))+
      '</div>';
    const tbl='<table class="pre-print-grid"><thead><tr><th>Day</th><th>Date</th><th>Drug</th><th>Management / Suggestion</th></tr></thead><tbody>'+
      rows.map(r=>'<tr><td>'+r.day+'</td><td>'+esc(r.date)+'</td><td>'+esc(r.drug)+'</td><td>'+esc(r.manage)+'</td></tr>').join('')+'</tbody></table>';
    const warn=(blocked?'<p class="pre-print-warning">DRAFT - NOT FOR MEDICATION ORDERS. Pending review.</p>':'')+
      (bridgeFootnote(p,v)?'<p class="pre-print-note"><strong>Bridging note:</strong> '+esc(bridgeFootnote(p,v))+'</p>':'')+
      '<p class="pre-print-note">Post-op actions are CONDITIONAL: assess hemostasis/no bleeding and treating physician confirmation. Dates are suggested, not automatic orders.</p>';
    const footer='<footer class="pre-print-footer">Physician: '+esc(val('prePhysician')||'________________')+' &nbsp;&nbsp; Date: __________'+
      '<small>Clinical draft references: ISTH SSC 2026; ESC/EACTS 2025; ESC AF 2024; CHEST 2022; JAMA 2024; ASRA 2025. Validate locally.</small></footer>';
    return hdr+tbl+warn+footer;
  };
  function renderPlan(){
    const {p,v,blockers}=plan();
    activePlan={p,v,blockers};rows=makeRows(p,v);
    $('preStatus').textContent=blockers.length?'DRAFT - รอ Physician Review':'พร้อมให้แพทย์ยืนยัน Final';
    $('preStatus').className='pre-status'+(blockers.length?' blocked':'');
    $('preSafety').innerHTML=blockers.length?'<h3>ต้องตรวจสอบก่อน Final</h3><ul>'+blockers.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'';
    if(v.warnings.length)$('preSafety').innerHTML+='<h3>Safety reminders</h3><ul>'+v.warnings.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';
    $('prePlan').innerHTML='<p><strong>Guideline suggestion:</strong> '+esc(v.action==='continue'?'Continue':v.action==='hold'?'Interrupt / hold '+v.holdDays+' days':'Physician review')+
      '; Bridging selected: '+esc(v.bridging?'Yes (physician-selected)':'No')+'</p>'+
      (afRecommendationText(p)?'<p class="pre-guideline-advice">'+esc(afRecommendationText(p))+'</p>':'')+
      (bridgeFootnote(p,v)?'<p class="pre-lmwh-footnote">'+esc(bridgeFootnote(p,v))+'</p>':'');
    $('preSources').textContent='References: ISTH SSC 2026; '+v.sources.join(' / ');
    $('preNotes').textContent=p.neuraxial!=='no'?v.neuraxialNote:'';
    buildTable();
    $('preOPDNote').value=noteText(p,v,blockers);
    refreshRendered();
    $('prePrintSurface').classList.add('pre-draft');
    $('preConfirm').checked=false;$('prePrint').disabled=true;confirmed=-1;
  }
  function refreshRendered(){
    if(!activePlan)return;
    const {p,v,blockers}=activePlan;
    const significant=rows.filter(r=>r.day===0||r.manage||r.drug.startsWith('Hold')).filter((r,i,a)=>r.day===0||r.manage||!a.slice(0,i).some(x=>x.drug===r.drug));
    $('preOPDNote').value=noteText(p,v,blockers)+'\n'+significant.map(r=>'Day '+(r.day>0?'+':'')+r.day+': '+[r.drug,r.manage].filter(Boolean).join('; ')).join('\n');
    $('prePrintSurface').innerHTML=printHtml(p,v,true);
    $('prePrintSurface').classList.add('pre-draft');
  }
  function changed(){revision++;confirmed=-1;activePlan=null;switchFields();$('preConfirm').checked=false;$('prePrint').disabled=true;}
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
  $('preGrid').addEventListener('input',e=>{
    const t=e.target,idx=Number(t.dataset.row),col=t.dataset.col;
    if(!Number.isInteger(idx)||!rows[idx]||!['drug','manage'].includes(col))return;
    rows[idx][col]=t.value;revision++;confirmed=-1;$('preConfirm').checked=false;$('prePrint').disabled=true;
    refreshRendered();
  });
  $('preConfirm').onchange=()=>{
    if(!checked('preConfirm')){confirmed=-1;$('prePrint').disabled=true;refreshRendered();return;}
    if(!activePlan||activePlan.blockers.length){
      $('preConfirm').checked=false;alert('ยังมีรายการที่ต้องทบทวน ไม่สามารถ Final Print ได้');return;
    }
    confirmed=revision;$('prePrint').disabled=false;
    $('prePrintSurface').innerHTML=printHtml(activePlan.p,activePlan.v,false);
    $('prePrintSurface').classList.remove('pre-draft');
    $('preStatus').textContent='Physician confirmed - Final A4 ready';
  };
  $('preDraftPrint').onclick=()=>{
    if(!activePlan)return;const {p,v}=activePlan;
    $('prePrintSurface').innerHTML=printHtml(p,v,true);
    $('prePrintSurface').classList.add('pre-draft');window.print();
  };
  $('prePrint').onclick=()=>{
    if(!activePlan||activePlan.blockers.length||confirmed!==revision||!checked('preConfirm'))return;
    $('prePrintSurface').innerHTML=printHtml(activePlan.p,activePlan.v,false);
    $('prePrintSurface').classList.remove('pre-draft');window.print();
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
    rows=[];activePlan=null;confirmed=-1;revision++;
    $('prePrintSurface').innerHTML='';$('preOPDNote').value='';$('preCopyStatus').textContent='';
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
  switchFields();
})();