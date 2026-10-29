/* Warfarin Clinic pre-op UI: all patient values remain in the page session. */
(function(){
'use strict';
const core=window.PreopCore, $=id=>document.getElementById(id);
if(!core || !$('preopModule')) return;
let revision=0, confirmedRevision=-1,edited=false;
const fields=['preDrug','preIndication','preProcedure','preBleed','preDate','preTime','preName','preAge','preHN','preCr','preCrCl','preSex','preWeight','preWeekly','preTargetInr','preInr','preApixDose','preNeuraxial','preValve','preRecentStroke','preRecentVTE','preSevereThrombophilia','prePriorClot','preRiskReviewed','preBridge','preBridgeConfirmed','preLmwhMgKg','preLastApix','preRenalHold','prePhysician','preHospital','preExtra'];
const ev=(id)=>$(id)?.value||'';
const yes=(id)=>$(id)?.checked===true;
const txt=(val)=>String(val==null?'':val);
const esc=(s)=>txt(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function input(){
 const cr=ev('preCrCl'),age=ev('preAge'),sex=ev('preSex'),weight=ev('preWeight'),scr=ev('preCr');
 const calculated=core.crclCG(age,sex,weight,scr);
 const crCl=cr.trim()?cr:(Number.isFinite(calculated)?calculated.toFixed(1):'');
 return {anticoagulant:ev('preDrug'),indication:ev('preIndication'),procedure:ev('preProcedure'),bleedingRisk:ev('preBleed'),operationDate:ev('preDate'),operationTime:ev('preTime'),
 crCl,weightKg:weight, weeklyDose:ev('preWeekly'),apixDose:ev('preApixDose'),neuraxial:ev('preNeuraxial'),valvePosition:ev('preValve'),
 recentStroke:ev('preRecentStroke'),recentVTE:ev('preRecentVTE'),severeThrombophilia:ev('preSevereThrombophilia'),priorPeriopClot:ev('prePriorClot'),
 riskReviewed:yes('preRiskReviewed'),bridgeChoice:ev('preBridge'),bridgeConfirmed:yes('preBridgeConfirmed'),
 lmwhMgPerKg:ev('preLmwhMgKg'),lastDoseDateTime:ev('preLastApix'),renalHoldDays:ev('preRenalHold'),
 physicianConfirmed:yes('preConfirm') && confirmedRevision===revision,
 caseRevision:revision, confirmedRevision};
}
function switchFields(){
 const drug=ev('preDrug'),bridge=ev('preBridge')==='yes';
 $('preWarfarinFields').classList.toggle('hidden',drug!=='warfarin');
 $('preApixFields').classList.toggle('hidden',drug!=='apixaban');
 $('preBridgeFields').classList.toggle('hidden',drug!=='warfarin'||!bridge);
 $('preValveWrap').classList.toggle('hidden',ev('preIndication')!=='mechanical');
 $('preRenalHoldWrap').classList.toggle('hidden',drug!=='apixaban');
}
function render(){
 switchFields();const p=input(),v=core.plan(p);
 $('preConfirm').checked=false; // re-confirm only through explicit Final Review
 $('preStatus').textContent=v.blockers.length?'DRAFT — NOT FOR MEDICATION ADMINISTRATION':'Requires Final Physician Confirmation';
 $('preStatus').className=v.blockers.length?'pre-status blocked':'pre-status';
 $('preSafety').innerHTML=(v.blockers.length?'<h3>ต้องทบทวนก่อน Final</h3><ul>'+v.blockers.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'<p>Clinical draft generated. Please check every date and dose before confirmation.</p>')+
 (v.warnings.length?'<h3>Warnings</h3><ul>'+v.warnings.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'');
 $('prePlan').innerHTML= v.instructions.length?'<ul>'+v.instructions.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'<p>กรอกข้อมูลเพื่อสร้างแผนเบื้องต้น</p>';
 $('preNotes').textContent=v.neuraxialNote;
 $('preSources').textContent=v.sources.join(' · ');
 if(v.layout==='bridging-grid' && v.days.length){
  $('preGrid').classList.remove('hidden');
  $('preGrid').innerHTML='<h3>Bridging Schedule — conditional draft</h3><div class="pre-table-wrap"><table><thead><tr><th>Day</th><th>Date (B.E.)</th><th>Anticoagulant</th><th>Management</th></tr></thead><tbody>'+v.days.map(x=>'<tr><td>Day '+(x.offset>0?'+':'')+x.offset+'</td><td>'+esc(x.date||'—')+'</td><td>'+esc(x.anticoagulant)+'</td><td>'+esc(x.management)+'</td></tr>').join('')+'</tbody></table></div>';
 } else {$('preGrid').classList.add('hidden');$('preGrid').innerHTML='';}
 $('preOutput').dataset.blocked=String(v.blockers.length>0);
 $('prePrint').disabled=v.blockers.length>0 || confirmedRevision!==revision;
 return v;
}
function markChanged(){revision++;confirmedRevision=-1;$('preConfirm').checked=false;render();}
function printMarkup(v){
 const p=input(), date=p.operationDate?core.thaiDate(p.operationDate):'Not specified';
 const showWarfarin=p.anticoagulant==='warfarin';
 const table=v.layout==='bridging-grid'&&v.days.length?
 '<table class="pre-print-grid"><thead><tr><th>Day</th><th>Date</th><th>Anticoagulant</th><th>Management</th></tr></thead><tbody>'+
 v.days.map(x=>'<tr><td>Day '+(x.offset>0?'+':'')+x.offset+'</td><td>'+esc(x.date)+'</td><td>'+esc(x.anticoagulant)+'</td><td>'+esc(x.management)+'</td></tr>').join('')+'</tbody></table>':'';
 const header='<div class="pre-print-title"><h1>'+esc(ev('preHospital')||'Warfarin Clinic')+'</h1><h2>Perioperative Anticoagulant Plan</h2></div>'+
 '<div class="pre-print-patient">'+[
 'Name: '+esc(ev('preName')||'________________')+' · Age: '+esc(ev('preAge')||'—')+' · HN: '+esc(ev('preHN')||'—'),
 'Anticoagulant: '+esc(p.anticoagulant.toUpperCase())+' · Indication: '+esc(p.indication)+' · Procedure: '+esc(p.procedure),
 'Operation: '+esc(date)+' · Bleeding risk: '+esc(p.bleedingRisk)+' · Cr: '+esc(ev('preCr')||'—')+' · CrCl: '+esc(p.crCl||'—'),
 (showWarfarin?'Weekly Warfarin: '+esc(p.weeklyDose||'—')+' mg/wk · Target INR: '+esc(ev('preTargetInr')||'—')+' · Latest INR: '+esc(ev('preInr')||'—'):
 'Apixaban dose: '+esc(p.apixDose||'—')+' mg BID')
 ].map(x=>'<div>'+x+'</div>').join('')+'</div>';
 const content='<div class="pre-print-content">'+(table||'<div class="pre-print-prose">'+v.instructions.map(x=>'<p>• '+esc(x)+'</p>').join('')+'</div>')+
 '<p class="pre-print-note"><strong>Neuraxial precautions:</strong> '+esc(v.neuraxialNote)+'</p>'+
 (ev('preExtra')?'<p class="pre-print-note"><strong>Physician Notes:</strong> '+esc(ev('preExtra'))+'</p>':'')+
 (v.warnings.length?'<p class="pre-print-warning"><strong>Confirm:</strong> '+v.warnings.map(esc).join(' · ')+'</p>':'')+
 '</div>';
 const footer='<footer class="pre-print-footer"><span>Physician: '+esc(ev('prePhysician')||'________________')+' &nbsp; Signature: ____________________ &nbsp; Date: ____________</span><small>'+v.sources.map(esc).join(' · ')+'</small></footer>';
 return header+content+footer;
}
$('prePreview').addEventListener('click',()=>{
 const v=core.plan(input());$('prePrintSurface').innerHTML=printMarkup(v);
 $('prePrintSurface').classList.toggle('pre-draft',v.blockers.length>0||confirmedRevision!==revision);
 $('prePrintSurface').scrollIntoView({behavior:'smooth',block:'start'});
});
$('preConfirm').addEventListener('change',()=>{
 if(!yes('preConfirm')){confirmedRevision=-1;$('prePrint').disabled=true;return;}
 let v=core.plan({...input(),physicianConfirmed:true});
 if(v.blockers.length){$('preConfirm').checked=false;confirmedRevision=-1;render();return;}
 confirmedRevision=revision;v=core.plan(input());
 $('prePrintSurface').innerHTML=printMarkup(v);$('prePrintSurface').classList.remove('pre-draft');
 $('prePrint').disabled=false;
 $('preStatus').textContent='Physician Confirmed — Print Preview';
});
$('prePrint').addEventListener('click',()=>{
 if(confirmedRevision!==revision || !yes('preConfirm'))return;
 const v=core.plan(input());
 if(v.blockers.length)return;
 $('prePrintSurface').innerHTML=printMarkup(v);$('prePrintSurface').classList.remove('pre-draft');
 window.print();
});
$('preCrCalc').addEventListener('click',()=>{const cr=core.crclCG(ev('preAge'),ev('preSex'),ev('preWeight'),ev('preCr'));if(!Number.isFinite(cr)){alert('กรอก Age / Sex / Actual weight / Serum Cr ให้ครบ');return;}$('preCrCl').value=cr.toFixed(1);markChanged()});
$('preNew').addEventListener('click',()=>{
 if(!confirm('ล้างข้อมูลผู้ป่วยรายนี้และเริ่มรายใหม่?'))return;
 fields.forEach(id=>{const e=$(id);if(!e||id==='preHospital'||id==='prePhysician')return;
 if(e.type==='checkbox')e.checked=false;else if(e.tagName==='SELECT')e.selectedIndex=0;else e.value='';});
 $('prePrintSurface').innerHTML='';revision++;confirmedRevision=-1;render();
});
for(const id of fields){const el=$(id);if(el){el.addEventListener('input',markChanged);el.addEventListener('change',markChanged);}}
$('preConfirm').checked=false;render();
})();
