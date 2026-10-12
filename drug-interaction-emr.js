(function(root){
  'use strict';
  const C=typeof module!=='undefined'&&module.exports?require('./drug-interaction-core'):root.WarfarinInteractionCore;
  const effects={INR_UP:'อาจทำให้ INR สูงขึ้น',INR_DOWN:'อาจทำให้ INR ลดลง',INR_VARIABLE:'อาจทำให้ INR เพิ่มหรือลด',BLEEDING_RISK_UP:'เพิ่มความเสี่ยงเลือดออก',NO_INR_EFFECT:'ไม่มีผลต่อ INR ตาม source',UNKNOWN:'ผลต่อ INR ไม่ชัดเจน'};
  const fmt=n=>Number(n.toFixed(6)).toString();
  const P=typeof module!=='undefined'&&module.exports?require('./drug-interaction-presentation'):root.WarfarinInteractionPresentation;
  const shortEffects={INR_UP:'↑INR',INR_DOWN:'↓INR',INR_VARIABLE:'INR อาจเพิ่มหรือลด',BLEEDING_RISK_UP:'เพิ่ม bleeding risk',NO_INR_EFFECT:'ไม่มีผลต่อ INR',UNKNOWN:'ผลต่อ INR ไม่ชัดเจน'};
  function format(entry, calculation, confirmed, context){
    if(!entry.review.verifiedForApp||!entry.review.clinicalReviewed||!entry.review.sourceChecked)return null;
    const name=entry.displayName||entry.canonicalName, cbz=entry.adjustmentContext==='START_ONLY';
    const prefix=`DI: ${cbz?'เริ่ม ':''}${name} ${shortEffects[entry.direction]}`;
    const monitor=P.monitoring(entry,true), caution=cbz?' หากหยุด CBZ ภายหลัง อาจต้องลด warfarin ~50%.':'';
    if(!C.adjustmentApplies(entry,context))return `${prefix}; คำแนะนำเกี่ยวกับ warfarin ใช้เฉพาะ sulfamethoxazole-containing regimens; Sulfasalazine ใช้ข้อมูลรายการแยก.`;
    if(entry.emrSummaryTh&&!C.canAdjust(entry,context))return entry.emrSummaryTh;
    if(calculation&&C.canAdjust(entry,context)){
      const actual=confirmed&&confirmed.current===calculation.current&&confirmed.target===calculation.target&&Number.isFinite(confirmed.actual)&&confirmed.actual>=0?confirmed.actual:null;
      const verb=entry.empiricAdjustment.direction==='INCREASE'?'เพิ่ม':'ลด';
      if(actual!==null&&actual!==calculation.target){
        const change=(actual/calculation.current-1)*100;
        return `${prefix}; plan ปรับ warfarin ${fmt(calculation.current)} → ${fmt(actual)} mg/week (actual ${change>0?'+':''}${change.toFixed(1)}%), ${monitor}.${caution}`;
      }
      return `${prefix}; plan ${verb} warfarin ${calculation.percent}% (${fmt(calculation.current)} → ${fmt(calculation.target)} mg/week), ${monitor}.${caution}`;
    }
    if(entry.id==='phenytoin')return 'DI: Phenytoin มี biphasic interaction กับ warfarin; ไม่แนะนำ empiric dose adjustment ตอนเริ่มยา ควรติดตาม INR อย่างน้อย weekly.';
    if(entry.id==='clopidogrel')return 'DI: Clopidogrel ไม่มีผลต่อ INR ตาม source แต่เพิ่ม bleeding risk; monitor bleeding.';
    if(entry.id==='azithromycin')return 'DI: Azithromycin อาจทำให้ INR สูงขึ้นแต่ผลไม่สม่ำเสมอ; ไม่ปรับ warfarin empirically เป็น routine และติดตาม INR ใกล้ชิด.';
    if(entry.id==='danazol')return 'DI: Danazol อาจทำให้ INR สูงขึ้น; ติดตาม INR ใกล้ชิดและปรับ warfarin ตามผล INR.';
    if(cbz)return `${prefix}; warfarin requirement อาจเพิ่ม ${entry.empiricAdjustment.minPercent}–${entry.empiricAdjustment.maxPercent}%, monitor INR closely.${caution}`;
    if(C.canAdjust(entry,context))return `${prefix}; ${P.guidance(entry,context).replace(/เมื่อเริ่มหรือหยุดยา/g,'')}.`;
    if(entry.id==='fluorouracil')return `${prefix}; ติดตาม INR ที่สัปดาห์ที่ 3 และปรับ warfarin ตาม INR ระหว่างและหลังการรักษา.`;
    if(entry.id==='saquinavir')return `${prefix}; ritonavir boosting อาจทำให้ INR ลดลง, monitor INR closely.`;
    return `${prefix}${monitor?`; ${monitor}`:''}.`;
  }
  const api={format,effects};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.WarfarinInteractionEmr=api;
})(typeof window!=='undefined'?window:globalThis);
