(function(root) {
  'use strict';
  // Explicit human review decisions; source import remains unchanged.
  const numeric = 'amiodarone metronidazole fluconazole rifampin ciprofloxacin levofloxacin sulfonamides clarithromycin erythromycin miconazole-oral-topical-or-vaginal-formulation bosentan celecoxib isoniazid itraconazole-and-ketoconazole moxifloxacin gemfibrozil rosuvastatin voriconazole propafenone tramadol fibric-acids carbamazepine'.split(' ');
  const monitor = 'azithromycin clopidogrel danazol isotretinoin azathioprine-and-mercaptopurine barbiturates darunavir dronedarone efavirenz fluorouracil indinavir lopinavir-ritonavir nevirapine phenytoin ritonavir saquinavir sulfasalazine sulfinpyrazone'.split(' ');
  const mechanisms = {
    amiodarone:'ยับยั้ง metabolism ของ warfarin; ภาวะ thyroid ที่เปลี่ยนไปอาจทำให้ INR เพิ่มหรือลด',
    metronidazole:'ยับยั้ง CYP2C9 ทำให้ metabolism ของ warfarin ลดลง',
    fluconazole:'ยับยั้ง metabolism ของ warfarin ผ่าน CYP2C9 และ CYP3A4',
    rifampin:'กระตุ้น hepatic metabolism ของ warfarin',
    ciprofloxacin:'กลไกไม่ชัดเจน อาจยับยั้ง CYP1A2; พบ interaction มากขึ้นในผู้สูงอายุที่ใช้ยาหลายชนิด',
    levofloxacin:'กลไกไม่ชัดเจน อาจยับยั้ง CYP1A2; พบ interaction ที่สำคัญมากขึ้นในผู้สูงอายุ',
    sulfonamides:'ยับยั้ง metabolism และแทนที่ warfarin จาก protein-binding sites',
    clarithromycin:'ยับยั้ง CYP3A4 ทำให้ metabolism ของ warfarin ลดลง',
    erythromycin:'ยับยั้ง CYP3A4 ทำให้ metabolism ของ warfarin ลดลง',
    'miconazole-oral-topical-or-vaginal-formulation':'ยับยั้ง metabolism ของ warfarin ผ่าน CYP2C9 และ CYP3A4',
    bosentan:'อาจกระตุ้น metabolism ของ warfarin ผ่าน CYP3A4 และ/หรือ CYP2C9',
    celecoxib:'ถูก metabolize ผ่าน CYP2C9 แต่ไม่ได้ยับยั้งหรือกระตุ้น enzyme นี้',
    isoniazid:'ยับยั้ง metabolism ของ warfarin ผ่าน CYP2C9',
    'itraconazole-and-ketoconazole':'ยับยั้ง metabolism ของ warfarin ผ่าน CYP2C9 และ CYP3A4',
    moxifloxacin:'กลไกไม่ชัดเจน อาจยับยั้ง CYP1A2; interaction สำคัญพบมากขึ้นในผู้สูงอายุ',
    gemfibrozil:'ยับยั้ง CYP2C9 และแทนที่ warfarin จาก plasma protein-binding sites',
    rosuvastatin:'กลไกไม่ทราบแน่ชัด', voriconazole:'ยับยั้ง metabolism ของ S-warfarin ผ่าน CYP2C9',
    propafenone:'ลด metabolism ของ warfarin; source รายงานระดับ warfarin ใน plasma เพิ่ม 39%',
    tramadol:'กลไกไม่ชัดเจน อาจยับยั้ง metabolism ของ warfarin ผ่าน CYP3A4',
    'fibric-acids':'กลไกไม่ทราบแน่ชัด',
    carbamazepine:'กระตุ้น CYP2C9 ทำให้ metabolism ของ warfarin เพิ่มขึ้น จึงทำให้ INR ลดลง',
    azithromycin:'อาจลด metabolism ของ warfarin; ไข้และความอยากอาหารลดลงอาจเสริมให้ INR สูงขึ้น',
    clopidogrel:'antiplatelet effect ร่วมกับ anticoagulant effect เพิ่มความเสี่ยงเลือดออก โดยไม่มีผลต่อ INR ตาม source',
    danazol:'ลด metabolism ของ warfarin และอาจยับยั้ง fibrinolytic systems',
    isotretinoin:'อาจกระตุ้น CYP enzymes',
    'azathioprine-and-mercaptopurine':'อาจเพิ่ม metabolism ของ warfarin',
    barbiturates:'กระตุ้น hepatic metabolism ของ warfarin',
    darunavir:'การกระตุ้น CYP2C9/CYP1A2 อาจเกิดจาก ritonavir ที่ใช้ร่วมกัน',
    dronedarone:'ยับยั้ง CYP3A4 ระดับปานกลาง; source รายงาน S-warfarin และ INR เพิ่มเล็กน้อย',
    efavirenz:'อาจยับยั้งหรือกระตุ้น metabolism; กระตุ้น CYP3A4 และอาจยับยั้ง CYP2C9',
    fluorouracil:'อาจแทนที่ protein binding ยับยั้ง metabolism ของ warfarin หรือยับยั้ง clotting-factor synthesis',
    indinavir:'ยับยั้ง CYP3A4; ผลสุทธิอาจต่างกันเมื่อใช้ ritonavir ร่วม',
    'lopinavir-ritonavir':'กระตุ้น metabolism ของ warfarin ผ่าน CYP2C9 และ CYP1A2',
    nevirapine:'กระตุ้น metabolism ของ warfarin ผ่าน CYP3A4',
    phenytoin:'biphasic interaction: ระยะแรกแทนที่ warfarin จาก protein binding; ระยะยาวกระตุ้น hepatic metabolism',
    ritonavir:'กระตุ้น CYP2C9/CYP1A2; case reports พบผลต่อ INR ได้ทั้งสองทิศทาง',
    saquinavir:'ยับยั้ง CYP3A4; ritonavir boosting อาจเปลี่ยนผลสุทธิ',
    sulfasalazine:'กลไกไม่ทราบแน่ชัด', sulfinpyrazone:'ยับยั้ง metabolism ของ warfarin โดยเฉพาะ S-isomer'
  };
  const notes = {
    'miconazole-oral-topical-or-vaginal-formulation':'ครอบคลุม oral, topical และ vaginal formulation; source ให้พิจารณา alternative therapy เช่น clotrimazole',
    amiodarone:'พิจารณาลดหลังเริ่มประมาณ 1 สัปดาห์; loading dose อาจทำให้เกิดผลเร็วขึ้น อาจต้องลดเพิ่มจนถึง 60% ในระยะต่อมา ติดตามทุก 1–2 สัปดาห์ใน 12 สัปดาห์แรกตามหมายเหตุ source',
    fluconazole:'ผลอาจมากขึ้นเมื่อไตทำงานลดลง; ในระยะต่อมาอาจต้องลดจนใกล้ 80% ไม่ใช่ initial preset',
    rifampin:'บางรายอาจต้องใช้ 2–3 เท่าของ weekly dose เดิม ปรับเพิ่มเติมตาม INR ไม่ใช่ preset',
    levofloxacin:'ความรุนแรงของการเจ็บป่วยมีผลต่อ INR; 0% หมายถึงยังไม่ปรับ empiric dose',
    moxifloxacin:'ความรุนแรงของการเจ็บป่วยมีผลต่อ INR',
    sulfonamides:'ใช้ช่วงลด 25–40% เฉพาะ sulfamethoxazole-containing regimens; Sulfasalazine ใช้ record แยก รายชื่อสมาชิกกลุ่มจาก PDF ยังคงเก็บไว้',
    bosentan:'อาจต้องเพิ่มถึง 50% ในระยะต่อมา ให้ปรับตาม INR รายสัปดาห์ ไม่ใช่ initial preset',
    celecoxib:'ติดตามอาการเลือดออกร่วมด้วย',
    gemfibrozil:'numeric guidance ใน source อ้างอิง published case reports และต้องติดตามต่อเนื่อง',
    rosuvastatin:'ประเมิน INR ซ้ำภายใน 1 สัปดาห์; source กล่าวถึง alternative statin',
    propafenone:'อาจต้องลดเพิ่มเติมตาม INR', tramadol:'source กล่าวถึงการลด 25–30% ที่อาจจำเป็น แต่ initial empiric range คือ 0–20%',
    'fibric-acids':'เดิมอยู่ใต้หัวข้อ Fibric acids; คำแนะนำนี้เจาะจง Fenofibrate อาจต้องลดถึง 40% ในระยะต่อมา เป็นหมายเหตุเท่านั้น Gemfibrozil ใช้ record แยก',
    carbamazepine:'ผลเกิดช้า onset 10–35 วัน; เมื่อหยุด CBZ อาจต้องลด warfarin ประมาณ 50% เพราะ enzyme induction ลดลง และติดตาม INR ใกล้ชิด ไม่มี Stop calculator',
    azithromycin:'ผลไม่สม่ำเสมอ ไม่ลด empiric dose เป็น routine; ประเมินไข้ ความอยากอาหารลดลง และปัจจัยอื่น',
    clopidogrel:'ติดตามเลือดออก ไม่สร้าง numeric adjustment จากความเสี่ยงเลือดออกเพียงอย่างเดียว',
    danazol:'อาจต้องลด warfarin ~50% แต่ไม่ใช่ routine empiric preset',
    isotretinoin:'การเพิ่ม 33–50% มาจาก case reports ไม่ใช่ routine preset',
    'azathioprine-and-mercaptopurine':'อาจต้องใช้ warfarin 2–3 เท่า ติดตามเมื่อเริ่ม หยุด หรือเปลี่ยนขนาดยา ไม่สร้าง +100/+200% presets',
    barbiturates:'published reports ระบุว่าอาจต้องเพิ่ม 30–60% เป็น contextual guidance ไม่มี calculator',
    darunavir:'อาจต้องเพิ่มถึง 20% แต่ผลอาจเกี่ยวกับ ritonavir ที่ใช้ร่วม ไม่สร้าง preset',
    dronedarone:'clinical trials ใน source ไม่พบหลักฐาน safety concern จากการใช้ร่วม; ไม่มี numeric guidance',
    efavirenz:'INR อาจเพิ่มหรือลด; source ให้พิจารณาลดแต่ไม่มี routine numeric range การลด 4 เท่ามาจากผู้ป่วยรายเดียว',
    fluorouracil:'ติดตาม INR ที่สัปดาห์ที่ 3; อาจต้องลด 20–70% ระหว่างรักษา และเพิ่มกลับภายใน 30 วันหลังจบ 5-FU เป็น time/context-dependent ไม่มี routine calculator',
    indinavir:'การเพิ่ม 50% มาจาก paradoxical case report ของ unboosted indinavir ไม่ใช่ preset',
    'lopinavir-ritonavir':'ที่ steady state อาจต้องเพิ่ม warfarin ถึง 2 เท่า ไม่มี routine preset',
    nevirapine:'การเพิ่ม 2–4 เท่ามาจาก case reports ไม่มี routine preset',
    phenytoin:'source ไม่แนะนำ empiric dose adjustment ตอนเริ่มยา; บางรายอาจต้องเพิ่มถึง 50% หลายสัปดาห์ภายหลัง warfarin มีผลต่อระดับ phenytoin ด้วย',
    ritonavir:'case reports พบผลตรงข้ามกัน ทั้งเพิ่ม requirement และ INR สูงขึ้น ไม่มี calculator',
    saquinavir:'การลด 20% มาจากผู้ป่วยรายเดียวที่ใช้ unboosted saquinavir; ritonavir boosting อาจทำให้ผลสุทธิเป็น INR ลดลง ไม่มี routine calculator',
    sulfasalazine:'INR อาจเพิ่มหรือลด; การเพิ่ม warfarin 250% มาจากผู้ป่วยรายเดียว ไม่ใช้ calculator ของ TMP-SMX',
    sulfinpyrazone:'การลดเฉลี่ย ~50% มาจาก small case series ไม่ใช่ routine preset'
  };
  function apply(entries) {
    return entries.map(original => {
      const id = original.id;
      if (!numeric.includes(id) && !monitor.includes(id)) return original;
      const e = { ...original, managementRaw: original.management, mechanismRaw: original.mechanism,
        sourceNotesRaw: original.sourceNotesTh, review: { ...original.review, sourceChecked:true, clinicalReviewed:true, verifiedForApp:true },
        empiricAdjustment:{...original.empiricAdjustment}, optimizerIntegration:{...original.optimizerIntegration} };
      if (id === 'fibric-acids') {
        e.id='fenofibrate'; e.canonicalName='Fenofibrate'; e.displayName='Fenofibrate';
        e.sourceRecordId=id; e.sourceGroupName='Fibric acids'; e.sourceListedMembers=[...original.generics];
        e.generics=['fenofibrate']; e.aliases=[]; e.aliasSource='source';
        e.empiricAdjustment.note='Eventual reduction up to 40%; note only.';
      }
      if (id === 'carbamazepine') {
        e.adjustmentContext='START_ONLY'; e.adjustmentWording='may be required';
        e.empiricAdjustment={...e.empiricAdjustment,enabled:true,direction:'INCREASE',minPercent:50,maxPercent:100,presets:[50,60,70,80,90,100],customAllowed:true,
          context:'START_ONLY', note:'When stopping CBZ, ~50% reduction may be required; note only.',
          sourceRange:{direction:'INCREASE',minPercent:50,maxPercent:100,page:e.source.page,text:original.management}};
      }
      if (monitor.includes(id)) { e.empiricAdjustment.enabled=false; e.optimizerIntegration.enabled=false; }
      else e.optimizerIntegration.enabled=true;
      const weekly=['rifampin','isoniazid','phenytoin'].includes(id);
      const monitoringTh=id==='clopidogrel'?'ติดตามอาการเลือดออก':id==='dronedarone'?'source ไม่ระบุ monitoring schedule':id==='fibric-acids'?'ติดตาม INR ประมาณ weekly เมื่อเริ่มหรือหยุดยา':['amiodarone','bosentan'].includes(id)?'ติดตาม INR weekly เมื่อเริ่มหรือหยุดยา':weekly?'ติดตาม INR อย่างน้อย weekly เมื่อเริ่มหรือหยุดยา':'ติดตาม INR ใกล้ชิดเมื่อเริ่มหรือหยุดยา';
      const a=e.empiricAdjustment;
      const managementTh=id==='carbamazepine'?'เมื่อเริ่ม CBZ อาจต้องเพิ่ม warfarin 50–100% และติดตาม INR ใกล้ชิด':
        a.enabled?`source ระบุให้พิจารณา${a.direction==='INCREASE'?'เพิ่ม':'ลด'} warfarin ${a.minPercent}–${a.maxPercent}% initially; ${monitoringTh}`:
        id==='phenytoin'?'ไม่แนะนำ empiric dose adjustment ตอนเริ่มยา; ติดตาม INR อย่างน้อย weekly':monitoringTh;
      e.thai={mechanism:mechanisms[id],management:id==='sulfonamides'?`สำหรับ sulfamethoxazole-containing regimens เท่านั้น: ${managementTh}`:managementTh,monitoring:monitoringTh,note:notes[id]||null};
      return e;
    });
  }
  const api={apply,numeric,monitor};
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  root.WarfarinInteractionClinicalReview=api;
})(typeof window!=='undefined'?window:globalThis);
