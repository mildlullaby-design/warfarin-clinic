(function(root){
  'use strict';
  const C=typeof module!=='undefined'&&module.exports?require('./drug-interaction-core'):root.WarfarinInteractionCore;
  const severityLabels={Major:'รุนแรง (Major)',Moderate:'ปานกลาง (Moderate)',Mild:'เล็กน้อย (Mild)',Severe:'รุนแรงมาก (Severe)',
    'Moderate to severe':'ปานกลาง–รุนแรง','Moderate–severe':'ปานกลาง–รุนแรง','Mild to moderate':'เล็กน้อย–ปานกลาง'};
  const effects={INR_UP:'INR ↑',INR_DOWN:'INR ↓',INR_VARIABLE:'INR อาจเพิ่มหรือลด',BLEEDING_RISK_UP:'ความเสี่ยงเลือดออก ↑',NO_INR_EFFECT:'ไม่มีผลต่อ INR',UNKNOWN:'ไม่พบข้อมูลผลต่อ INR'};
  // Presentation translations only. The reviewed data and calculation gates stay authoritative.
  function time(value,offset=false){
    if(!value||/^(NR|Not reported|Unknown)$/i.test(value))return 'ไม่พบข้อมูล';
    return value.replace(/\bNR\b|Not reported/g,'ไม่พบข้อมูล').replace(/Delayed/gi,offset?'ผลลดลงช้า':'ล่าช้า')
      .replace(/Initial:/g,'ระยะแรก:').replace(/Subsequent:/g,'ระยะต่อมา:')
      .replace(/Slow decline over/g,'ผลลดลงช้าในช่วง').replace(/after stopping/g,'หลังหยุดยา')
      .replace(/increases gradually over/g,'เพิ่มขึ้นทีละน้อยในช่วง').replace(/possibly longer with prolonged therapy/g,'อาจนานขึ้นเมื่อใช้ยาต่อเนื่อง')
      .replace(/approximately/g,'ประมาณ').replace(/at least/g,'อย่างน้อย').replace(/may persist longer/g,'ผลอาจคงอยู่นานกว่า')
      .replace(/Not Specified/gi,'ไม่พบข้อมูล').replace(/Rapid/g,'เร็ว').replace(/Within/g,'ภายใน')
      .replace(/Several days to weeks/g,'หลายวันถึงหลายสัปดาห์').replace(/Several days/g,'หลายวัน').replace(/\bweek\b/g,'สัปดาห์').replace(/\bdays\b/g,'วัน').replace(/\bweeks\b/g,'สัปดาห์').replace(/\bhours\b/g,'ชั่วโมง');
  }
  function monitoring(entry,english=false){
    const text=entry.thai?.monitoring;
    if(!text||text.includes('ไม่ระบุ'))return null;
    if(english)return entry.direction==='BLEEDING_RISK_UP'?'monitor bleeding':text.includes('อย่างน้อย weekly')?'monitor INR at least weekly':text.includes('weekly')?'monitor INR weekly':'monitor INR closely';
    if(entry.direction==='BLEEDING_RISK_UP')return 'ติดตามอาการเลือดออก';
    return text.includes('อย่างน้อย weekly')?'ติดตาม INR อย่างน้อย weekly':text.includes('ประมาณ weekly')?'ติดตาม INR ประมาณ weekly':text.includes('weekly')?'ติดตาม INR weekly':'ติดตาม INR ใกล้ชิด';
  }
  function importantNote(entry){
    if(!entry.thai?.note)return null;
    if(entry.adjustmentContext==='START_ONLY')return 'หากหยุด CBZ ภายหลัง อาจต้องลด warfarin ~50%';
    if(entry.id==='fenofibrate')return 'ในระยะต่อมาอาจต้องลด warfarin ถึง 40%';
    if(entry.id==='phenytoin')return 'บางรายอาจต้องเพิ่ม warfarin ถึง 50% หลายสัปดาห์ภายหลัง; warfarin มีผลต่อระดับ phenytoin ด้วย';
    if(entry.id==='sulfonamides')return 'Sulfasalazine ใช้ข้อมูลรายการแยก';
    // These repeat routine monitoring/adjustment advice; retain them in Review.
    if(['clopidogrel','propafenone','azithromycin','dronedarone','gemfibrozil'].includes(entry.id))return null;
    let text=entry.thai.note.replace(/source /g,'').replace(/\s*ไม่มี Stop calculator/g,'')
      .replace(/\s*(?:เป็นหมายเหตุเท่านั้น|ไม่ใช่ initial preset|ไม่มี routine calculator|ไม่มี calculator|ไม่มี routine preset|ไม่ใช่ routine preset|ไม่ใช่ preset|ไม่สร้าง preset|ไม่สร้าง \+100\/\+200% presets|ไม่ใช้ calculator ของ TMP-SMX)/g,'')
      .replace(/\s*ไม่ใช่ preset/g,'').replace(/; 0% หมายถึงยังไม่ปรับ empiric dose/g,'')
      .replace(/ แต่ไม่ใช่ routine empiric preset/g,'').replace(/ เป็น contextual guidance/g,'');
    return text.trim()||null;
  }
  function guidance(entry,context){
    const monitor=monitoring(entry);
    if(!C.adjustmentApplies(entry,context))return 'คำแนะนำเชิงตัวเลขใช้เฉพาะ sulfamethoxazole-containing regimens';
    if(entry.clinicalReviewPhase==='FINAL_PHASE_3')return entry.thai.management;
    if(entry.adjustmentContext==='START_ONLY')return `เมื่อเริ่ม CBZ อาจต้องเพิ่ม warfarin ${entry.empiricAdjustment.minPercent}–${entry.empiricAdjustment.maxPercent}% และติดตาม INR ใกล้ชิด`;
    if(C.hasDocumentedAdjustment(entry)){
      const a=entry.empiricAdjustment,initial=['rifampin','fenofibrate','bosentan','isoniazid'].includes(entry.id)?' initially':'';
      return `พิจารณา${a.direction==='INCREASE'?'เพิ่ม':'ลด'} warfarin ${a.minPercent===a.maxPercent?a.minPercent:`${a.minPercent}–${a.maxPercent}`}%${initial}${monitor?` และ${monitor}${['metronidazole','fluconazole'].includes(entry.id)?'เมื่อเริ่มหรือหยุดยา':''}`:''}`;
    }
    if(entry.id==='phenytoin')return 'ไม่แนะนำ empiric dose adjustment ตอนเริ่มยา ควรติดตาม INR อย่างน้อย weekly';
    if(entry.id==='clopidogrel')return 'ไม่มีผลต่อ INR ตาม source แต่เพิ่ม bleeding risk ให้ติดตามอาการเลือดออก';
    if(entry.id==='azithromycin')return 'ผลต่อ INR ไม่สม่ำเสมอ ไม่ปรับ warfarin empirically เป็น routine และติดตาม INR ใกล้ชิด';
    if(entry.id==='fluorouracil')return 'ติดตาม INR ที่สัปดาห์ที่ 3 และปรับตาม INR ระหว่างและหลังการรักษา';
    if(!entry.thai)return 'ดูคำแนะนำฉบับเต็มในหน้าตรวจสอบข้อมูล';
    return monitor?`${monitor}เมื่อเริ่มหรือหยุดยา`:'ไม่มี numeric dose guidance สำหรับรายการนี้';
  }
  function combinedGuidance(entry,context){
    const start=guidance(entry,context),note=importantNote(entry);
    if(!C.adjustmentApplies(entry,context))return `${start}; Sulfasalazine ใช้ข้อมูลรายการแยก`;
    if(entry.adjustmentContext==='START_ONLY')return `เมื่อเริ่ม CBZ: อาจต้องเพิ่ม warfarin ${entry.empiricAdjustment.minPercent}–${entry.empiricAdjustment.maxPercent}% และติดตาม INR ใกล้ชิด\nเมื่อหยุด CBZ: อาจต้องลด warfarin ~50% และติดตาม INR ใกล้ชิด`;
    if(entry.id==='fluorouracil')return `${start}\n${note||''}`;
    if(C.hasDocumentedAdjustment(entry))return `เมื่อเริ่มยา: ${start}\nเมื่อหยุดยา: ${monitoring(entry)||'ติดตามตามคำแนะนำในเอกสาร'}; เอกสารไม่ระบุเปอร์เซ็นต์ปรับยาตอนหยุดแยกไว้${note?`\n${note}`:''}`;
    return `${start}${note?`\n${note}`:''}`;
  }
  function details(entry,context){return {
    title:entry.displayName||entry.canonicalName,
    summary:`${entry.id==='phenytoin'?'INR เปลี่ยนแบบ biphasic':effects[entry.direction]||effects.UNKNOWN}${entry.direction!=='BLEEDING_RISK_UP'&&entry.additionalEffects?.includes('BLEEDING_RISK_UP')?' · bleeding risk ↑':''} · ${severityLabels[entry.severity]||(entry.severity?.startsWith('Moderate (')?'ปานกลาง (Moderate)':entry.severity)||'ไม่พบข้อมูล'}`,
    onset:time(entry.onset),offset:time(entry.offset,true),guidance:guidance(entry,context),
    note:importantNote(entry),mechanism:entry.thai?.mechanism==='กลไกไม่ทราบแน่ชัด'?null:entry.thai?.mechanism||null,
    source:`อ้างอิง: Warfarin Drug interaction PDF · หน้า ${(entry.source.pages||[entry.source.page]).join(', ')}`
  };}
  const api={details,time,monitoring,guidance,combinedGuidance};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.WarfarinInteractionPresentation=api;
})(typeof window!=='undefined'?window:globalThis);
