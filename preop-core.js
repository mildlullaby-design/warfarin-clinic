/* Pre-op Anticoagulant Planner — clinical draft engine, no persistence.
 * IMPORTANT: clinician review and local guideline validation required before patient use.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PreopCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const DAY = 86400000;
  const SOURCES = Object.freeze({
    ESC: 'ESC/EACTS VHD 2025',
    CHEST: 'CHEST Perioperative 2022',
    JAMA: 'JAMA DOAC Review 2024',
    ASRA: 'ASRA Regional Anesthesia 2025'
  });
  function number(v) {
    if (v === '' || v === null || v === undefined) return NaN;
    return Number(v);
  }
  function iso(ymd) {
    if (typeof ymd !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) throw Error('Invalid date format');
    const [y,m,d] = ymd.split('-').map(Number);
    const dt = new Date(Date.UTC(y,m-1,d));
    if (y < 1900 || y > 2100 || dt.getUTCFullYear()!==y || dt.getUTCMonth()!==m-1 || dt.getUTCDate()!==d) throw Error('Invalid calendar date');
    return dt;
  }
  function shiftDate(date, offset) {
    if (!Number.isInteger(offset) || Math.abs(offset)>365) throw Error('Invalid offset');
    return new Date(iso(date).getTime()+offset*DAY).toISOString().slice(0,10);
  }
  function thaiDate(date) {
    const dt=iso(date), pad=x=>String(x).padStart(2,'0');
    return pad(dt.getUTCDate())+'/'+pad(dt.getUTCMonth()+1)+'/'+(dt.getUTCFullYear()+543);
  }
  function dated(op,day) { return op ? thaiDate(shiftDate(op,day)) : 'Day '+(day>0?'+':'')+day; }
  function crclCG(age, sex, kg, scr) {
    const a=number(age),w=number(kg),s=number(scr);
    if (![a,w,s].every(x=>Number.isFinite(x)&&x>0) || a<18 || a>=140 || !['male','female'].includes(sex)) return NaN;
    return ((140-a)*w/(72*s))*(sex==='female'?0.85:1);
  }
  function enoxaparin(kg,mgPerKg=1) {
    const w=number(kg),d=number(mgPerKg);
    if (!Number.isFinite(w)||w<=0||!Number.isFinite(d)||d<=0) return null;
    const mg=w*d,exactMl=mg/100;
    return {
      mg, exactMl, volume:exactMl.toFixed(2), ampoules:Math.ceil(exactMl/0.6-1e-10),
      needsPrecisionReview:Math.abs(exactMl-Number(exactMl.toFixed(2)))>1e-8,
      multiAmpoule:exactMl>0.6+1e-8
    };
  }
  function clockHours(lastDateTime, opDate, opTime) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(lastDateTime||'') ||
      !/^\d{2}:\d{2}$/.test(opTime||'')) return NaN;
    const lastDay=lastDateTime.slice(0,10), lastClock=lastDateTime.slice(11), [lh,lm]=lastClock.split(':').map(Number),[oh,om]=opTime.split(':').map(Number);
    try { iso(lastDay); iso(opDate); } catch { return NaN; }
    if (lh>23||lm>59||oh>23||om>59) return NaN;
    return (iso(opDate).getTime()-iso(lastDay).getTime())/3600000+(oh+om/60)-(lh+lm/60);
  }
  const NEURAXIAL_NOTE = 'If spinal/epidural anesthesia or deep plexus block is planned, anesthesia team must verify anticoagulant interruption, normalized INR (Warfarin), LMWH timing (if applicable), and safe restart/catheter precautions per ASRA 2025.';
  // AF: CHEST 2022 strongly recommends against routine perioperative heparin bridging.
  // Recent embolism or thrombosis during interruption warrants individualized review,
  // NOT automatic therapeutic LMWH.
  function afBridgeRecommendation({recentStroke='',priorPeriopClot=''}={}) {
    const exceptional=recentStroke==='yes'||priorPeriopClot==='yes';
    return Object.freeze({
      recommendation:exceptional?'individual-review':'against-routine-bridging',
      reason:exceptional
        ? 'CHEST 2022 recommends against routine AF bridging; recent stroke/embolism or thrombosis during interruption warrants individualized multidisciplinary review.'
        : 'CHEST 2022: recommend against routine heparin bridging in AF (strong recommendation).',
      source:'CHEST 2022'
    });
  }
  // A surgical INR threshold cannot substitute for a neuraxial needle-placement requirement.
  // For elective major surgery that requires Warfarin interruption, the commonly
  // recommended target is INR <1.5; procedural/anesthesia protocols may be stricter.
  function preopInrRequirement({anticoagulant='',action='',neuraxial='no'}={}) {
    if(anticoagulant!=='warfarin'||action!=='hold')return null;
    if(neuraxial==='yes')return Object.freeze({
      kind:'neuraxial',label:'INR normalized to local laboratory reference range',
      threshold:null,
      advice:'ASRA 2025: normalized INR before needle placement. INR <1.5 alone does NOT establish neuraxial safety.'
    });
    return Object.freeze({
      kind:'surgery',label:'INR <1.5',threshold:1.5,
      advice:'For elective surgery requiring Warfarin interruption, aim INR <1.5; confirm procedure-specific threshold with surgical team. If INR >=1.5, contact treating surgeon/anesthetist before surgery.'
    });
  }
  function plan(input={}) {
    const p={...input}, blockers=[],warnings=[],instructions=[],sources=new Set(),days=[];
    const drug=p.anticoagulant, indication=p.indication, bleed=p.bleedingRisk, operation=p.operationDate||'';
    const validDrug=['warfarin','apixaban'].includes(drug), validIndication=['af','mechanical','vte'].includes(indication);
    const operationKnown=Boolean(operation);
    if (!validDrug) blockers.push('Select Warfarin or Apixaban.');
    if (!validIndication) blockers.push('Select the primary indication.');
    if (drug==='apixaban' && indication==='mechanical') blockers.push('No supported apixaban + mechanical-valve perioperative pathway; physician review required.');
    if (!p.procedure || !p.procedure.trim()) blockers.push('Enter the procedure name.');
    if (!['minimal','lowmod','high'].includes(bleed)) blockers.push('Procedure bleeding risk must be classified by a clinician.');
    if (!operationKnown) blockers.push('Operation date missing: DRAFT only, no final dated orders.');
    else { try{ iso(operation); }catch{blockers.push('Invalid operation date.');} }
    const hasDate=operationKnown && !blockers.includes('Invalid operation date.');
    const d=(day)=>dated(hasDate?operation:'',day);
    const renal=number(p.crCl);
    let action='review',holdDays=null, restart='';
    let bridge=false, dose=null;

    // Procedure-risk classification is entered by the clinician, never guessed by the app.
    if (drug==='warfarin' && ['minimal','lowmod','high'].includes(bleed)) {
      sources.add(SOURCES.CHEST);
      if (bleed==='minimal' && p.neuraxial!=='yes') {action='continue';holdDays=0;}
      else if (indication==='mechanical') {
        sources.add(SOURCES.ESC);
        if (bleed==='high') { action='hold';holdDays=4; }
        else if (p.neuraxial==='yes') {action='hold';holdDays=5;}
        else if (bleed==='minimal') {action='continue';holdDays=0;}
        else {
          action='review';
          if (Number.isInteger(number(p.manualHoldDays)) && number(p.manualHoldDays)>=4 && number(p.manualHoldDays)<=10) {
            action='hold';holdDays=number(p.manualHoldDays);
          } else blockers.push('Mechanical valve + low/moderate-risk procedure: physician must specify interruption plan.');
        }
      } else {action='hold';holdDays=5;}
      if (p.neuraxial==='yes') {
        sources.add(SOURCES.ASRA);
        action='hold';holdDays=Math.max(5,holdDays||0);
        warnings.push('Neuraxial: INR must be normalized to the local laboratory range before needle placement.');
      }
      if (action==='continue') instructions.push('Continue usual Warfarin regimen through procedure; confirm the procedure permits uninterrupted anticoagulation.');
      if (action==='hold') {
        instructions.push('Hold Warfarin from '+d(-holdDays)+' (Day -'+holdDays+'); last usual dose on '+d(-holdDays-1)+' (Day -'+(holdDays+1)+').');
        instructions.push('Resume usual maintenance regimen within approximately 24 h post-op ONLY after adequate hemostasis and treating team confirmation; candidate '+d(1)+' (Day +1).');
        if (p.weeklyDose) instructions.push('Known usual dose: '+p.weeklyDose+' mg/week. Do not infer daily tablet doses from weekly total.');
      }
      const specialRisk=p.recentStroke==='yes'||p.recentVTE==='yes'||p.priorPeriopClot==='yes'||p.severeThrombophilia==='yes'||p.valveRiskFactors==='yes';
      if (indication==='mechanical' && bleed==='high') {
        warnings.push('Mechanical valve: assess thromboembolic risk and consider bridging per ESC/EACTS 2025.');
        if (p.valvePosition==='mitral'||p.valvePosition==='tricuspid'||specialRisk) warnings.push('Mechanical valve with high-risk features: bridging requires explicit physician decision.');
      }
      if (specialRisk && indication!=='mechanical') warnings.push('Exceptional perioperative thrombotic risk: individual physician review; do not assume routine no-bridging.');
      if (p.bridgeChoice==='yes' && action==='hold') {
        bridge=true;
        if (p.bridgeConfirmed!==true) blockers.push('Physician must explicitly confirm therapeutic bridging.');
        if (!Number.isFinite(renal)||renal<=0) blockers.push('CrCl required for LMWH bridging.');
        else if (renal<30) blockers.push('CrCl <30: no automatic therapeutic enoxaparin order; physician-directed alternative required.');
        // Prescriber can override the calculated mg/dose on the input screen.
        // Do not coerce a blank or invalid override into an automatic dose.
        const enteredDose=number(p.lmwhMgPerDose);
        if(p.lmwhMgPerDose!==undefined && p.lmwhMgPerDose!==null && p.lmwhMgPerDose!=='') {
          dose=Number.isFinite(enteredDose)&&enteredDose>0?enoxaparin(enteredDose,1):null;
        } else dose=enoxaparin(p.weightKg,p.lmwhMgPerKg || 1);
        if (!dose) blockers.push('Body weight and LMWH dose (mg/kg) required for bridging.');
        if (dose?.needsPrecisionReview) warnings.push('Enoxaparin volume requires preparation precision review; displayed volume does not change prescribed mg.');
        if (dose?.multiAmpoule) warnings.push('More than one single-use 60 mg/0.6 mL ampoule per dose; verify pharmacy preparation.');
        warnings.push('Pre-op LMWH initiation: obtain INR at clinically selected pre-bridge assessment and begin only when subtherapeutic; do not order daily INR by default.');
        warnings.push('Last pre-op therapeutic LMWH dose approximately 24 h before procedure; verify actual clock time.');
        sources.add(SOURCES.CHEST);sources.add(SOURCES.ESC);
        if (bleed==='high') restart='Therapeutic LMWH may restart 48–72 h post-op ONLY with adequate hemostasis and surgical-team confirmation.';
        else restart='Therapeutic LMWH may restart no earlier than 24 h post-op ONLY with adequate hemostasis and surgical-team confirmation.';
        if (p.neuraxial==='yes') { sources.add(SOURCES.ASRA); warnings.push('ASRA: last therapeutic LMWH dose ≥24 h before neuraxial needle placement; verify exact times.'); if(p.neuraxialConfirmed!==true) blockers.push('ASRA LMWH + neuraxial: verify last-injection, needle-placement and catheter precautions with anesthesia before Final.'); }
        if (dose) {
          const doseText=dose.mg.toFixed(1)+' mg ('+dose.volume+' mL) SC q12h';
          for(let offset=-6;offset<=7;offset++) {
            let anticoagulant='',management='';
            if (offset===0) {anticoagulant='Hold Warfarin / LMWH';management='Operation; hemostasis and anesthesia team assessment';}
            else if(offset<0){
              anticoagulant=offset <= -(holdDays||5)-1?'Warfarin usual regimen':'Hold Warfarin';
              if(offset===-3||offset===-2) management='LMWH '+doseText+' per confirmed bridge plan';
              if(offset===-1)management='Hold enoxaparin at least 24 h before surgery';
            } else {
              anticoagulant='Warfarin: conditional restart at usual maintenance regimen';
              if(bleed==='high' && offset<2)management='No therapeutic LMWH restart; assess hemostasis';
              else if(bleed==='high' && offset<=3)management='Consider LMWH '+doseText+' at 48–72 h ONLY if safe/confirmed';
              else if(bleed!=='high' && offset===1)management='Consider LMWH '+doseText+' ≥24 h ONLY if safe/confirmed';
              else management='LMWH only if restarted & INR below therapeutic; physician-directed stop';
            }
            days.push({offset,date:hasDate?d(offset):'',anticoagulant,management});
          }
        }
        instructions.push(restart);
        instructions.push('Continue therapeutic LMWH (if started) until INR therapeutic and physician confirms stopping; may extend beyond Day +7.');
      } else {
        if (p.bridgeChoice==='yes' && action!=='hold') blockers.push('Bridging cannot be scheduled unless Warfarin interruption is planned.');
        instructions.push('No therapeutic LMWH bridging selected.');
      }
      if (specialRisk && p.riskReviewed!==true) blockers.push('Exceptional thrombotic risk requires explicit physician review.');
      if (indication==='mechanical' && bleed==='high' && p.riskReviewed!==true) blockers.push('Mechanical-valve thrombotic risk/bridging decision requires physician review.');
    }

    if (drug==='apixaban' && indication!=='mechanical' && ['minimal','lowmod','high'].includes(bleed)) {
      sources.add(SOURCES.JAMA);sources.add(SOURCES.CHEST);
      if (![2.5,5,10].includes(number(p.apixDose))) blockers.push('Select the pre-existing Apixaban dose; do not infer it.');
      if (!Number.isFinite(renal)||renal<=0) blockers.push('CrCl is required for Apixaban planning.');
      if (bleed==='minimal' && p.neuraxial!=='yes') { action='continue';holdDays=0; }
      else { action='hold';holdDays=bleed==='high'?2:bleed==='lowmod'?1:0; }
      if (Number.isFinite(renal)&&renal<30 && action==='hold') {
        warnings.push('CrCl <30: physician-reviewed extended interruption may be necessary; expert-opinion timing.');
        if(!Number.isInteger(number(p.renalHoldDays)) || number(p.renalHoldDays)<3 || number(p.renalHoldDays)>4 || p.riskReviewed!==true) {
          blockers.push('Severe renal impairment: physician must confirm 3–4-day hold or alternative plan.');
        } else holdDays=Math.max(holdDays,number(p.renalHoldDays));
      }
      if (p.neuraxial==='yes') {
        sources.add(SOURCES.ASRA);
        if(number(p.apixDose)>=5) {
          // Use the verified last-dose CLOCK TIME; never publish a conflicting
          // bleeding-risk-derived calendar date when an ASRA timed hold applies.
          holdDays = Math.max(holdDays,3);
          const h=clockHours(p.lastDoseDateTime,operation,p.operationTime);
          if(!Number.isFinite(h)) warnings.push('ASRA high-dose Apixaban: exact time not entered (optional); anesthesia team must verify the >=72 h interval and catheter timing before procedure.');
          else if(h<72) blockers.push('ASRA high-dose Apixaban: last dose to needle placement must be ≥72 h.');
          if (Number.isFinite(h) && h>=72)warnings.push('ASRA ≥72 h interruption verified from entered times; anesthesia team must confirm needle/catheter details.');
        } else blockers.push('ASRA Apixaban dose category not safely classifiable: physician/anesthesia review required.');
      }
      if (action==='continue') instructions.push('Continue usual Apixaban regimen for this minimal-risk procedure unless procedure team directs otherwise.');
      else {
        if(p.neuraxial==='yes' && number(p.apixDose)>=5) instructions.push('ASRA timed interruption: last dose '+(p.lastDoseDateTime||'[not entered]')+'; verify ≥72 h before neuraxial needle placement at '+(p.operationTime||'[time unknown]')+' on '+d(0)+'. Do not substitute a date-only hold for the clock-hour verification.');
        else if(holdDays>0) instructions.push('Omit Apixaban from '+d(-holdDays)+' (Day -'+holdDays+') through surgery '+d(0)+' (Day 0); last planned dose on '+d(-holdDays-1)+' (Day -'+(holdDays+1)+').');
        else instructions.push('Neuraxial-specific Apixaban interruption requires the verified ASRA interval; do not use minimal-risk continuation.');
        if (bleed==='high') restart='Conditional Apixaban restart window '+d(2)+' (Day +2) to '+d(3)+' (Day +3), ≥48–72 h post-op; adequate hemostasis and treating team confirmation required.';
        else restart='Consider restarting Apixaban '+d(1)+' (Day +1), ≥24 h post-op ONLY after adequate hemostasis and treating team confirmation.';
        instructions.push(restart);
      }
      instructions.push('No routine therapeutic LMWH bridging for Apixaban.');
      if(p.bridgeChoice==='yes')blockers.push('No routine therapeutic LMWH bridging pathway for Apixaban.');
    }
    if(p.neuraxial==='yes')warnings.push('ASRA neuraxial precautions: anesthesia must confirm drug timing, INR when on Warfarin, and needle/catheter plan; physician sign-off is not a substitute for these checks.');
    return {
      action,holdDays,bridging:bridge,dose,days,
      instructions,warnings,blockers,neuraxialNote:NEURAXIAL_NOTE,
      sources:[...sources],draft:blockers.length>0,
      operationDate:hasDate?operation:null,
      layout:bridge?'bridging-grid':'concise-prose',
      canFinalize:blockers.length===0 && p.physicianConfirmed===true
    };
  }
  return Object.freeze({iso,shiftDate,thaiDate,crclCG,enoxaparin,clockHours,afBridgeRecommendation,preopInrRequirement,plan,NEURAXIAL_NOTE,SOURCES});
});
