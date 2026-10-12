(function(root){
  'use strict';
  // Explicit clinician authorization, 2026-10-12. This allowlist does not approve future imports.
  const reviewedIds='acarbose acetaminophen-doses-2-g-d allopurinol amprenavir asa atazanavir bismuth-subsalicylate cephalosporins chloramphenicol cholestyramine cimetidine cisplatin citalopram cloxacillin colchicine cyclophosphamide dextrothyroxine dexamethasone delavirdine diclofenac dicloxacillin disopyramide doxepin doxycycline ethinyl-estradiol etravirine fluoxymesterone-and-other-androgens fluoxetine fluvastatin fosamprenavir griseofulvin glyburide hydrochlorothiazide ibuprofen indomethacin ketorolac lactulose lansoprazole leflunomide thyroid-hormones lovastatin meclofenamiate mefenamic-acid mefloquine mesalamine methimazole methyl-salicylate-topical nalidixic-acid norfloxacin nortriptyline naproxen nelfinavir ofloxacin omeprazole orlistat paroxetine penicillins piroxicam prednisone propoxyphene propylthiouracil quinine-derivatives quetiapine raloxifene ranitidine ribavirin ropinirole rofecoxib secobarbitol selegiline sertraline simvastatin sulindac tamoxifen terbinafine tetracycline ticlopidine tipranavir vitamin-e vitamin-k'.split(' ');
  const guidance={
    acarbose:'ติดตาม INR ใกล้ชิดเมื่อเริ่มหรือหยุด acarbose',
    'acetaminophen-doses-2-g-d':'Acetaminophen ขนาด >2 g/day อาจเพิ่ม INR ควรจำกัดขนาดและระยะเวลาเมื่อเป็นไปได้ และติดตาม INR เมื่อใช้ขนาดสูง',
    allopurinol:'รายงานผลต่อ INR ไม่สม่ำเสมอ ติดตาม INR เมื่อเริ่มหรือหยุดยา และประเมินซ้ำใน 1 สัปดาห์',
    amprenavir:'ติดตาม INR บ่อยขึ้นเมื่อเริ่มหรือหยุดยา หากใช้ ritonavir boosting ผลสุทธิอาจเป็น INR ลดลง',
    asa:'ใช้ ASA ขนาดต่ำสุดที่ได้ผลและชนิด enteric-coated ตามเอกสาร ติดตามอาการเลือดออก',
    atazanavir:'ติดตาม INR บ่อยขึ้นเมื่อเริ่มหรือหยุดยา หากใช้ ritonavir boosting ผลสุทธิอาจเป็น INR ลดลง',
    'bismuth-subsalicylate':'หลีกเลี่ยงเมื่อเป็นไปได้ โดยเฉพาะขนาดสูง ติดตาม INR และอาการเลือดออก',
    cephalosporins:'ติดตาม INR ใกล้ชิดเมื่อเริ่มหรือหยุดยา',
    chloramphenicol:'ติดตาม INR และพิจารณาลด warfarin หากจำเป็นตามผล INR',
    cholestyramine:'ติดตาม INR บ่อยขึ้นเมื่อเริ่มหรือหยุดยา และหลีกเลี่ยงการให้ cholestyramine ภายใน 2 ชั่วโมงของ warfarin',
    cimetidine:'ติดตาม INR ใกล้ชิดจนคงที่เมื่อเริ่มหรือหยุดยา พิจารณา H2RA หรือ PPI ตัวอื่นตามเอกสาร',
    cisplatin:'ติดตาม INR และอาการเลือดออกอย่างใกล้ชิด โดยเฉพาะช่วง chemotherapy; ไม่มีคำแนะนำขนาด warfarin ที่ครบถ้วน',
    citalopram:'เพิ่ม bleeding risk ร่วมกับ warfarin เอกสารไม่ระบุ specific warfarin dose adjustment ควรติดตามอาการเลือดออก',
    cloxacillin:'ติดตาม INR บ่อยขึ้น ไม่ลด warfarin empirically เป็น routine เว้นแต่มีปัจจัยอื่น เช่น ไข้หรือความอยากอาหารลดลง',
    colchicine:'ตรวจ INR หากถ่ายเหลวมากกว่า 3–4 ครั้งต่อวัน อาจต้องลด warfarin ตามผล INR ระหว่างใช้ยา',
    dextrothyroxine:'ติดตาม INR และพิจารณาลด warfarin หากจำเป็นตามผล INR',
    dexamethasone:'ติดตาม INR และปรับ warfarin ตามผล INR หากจำเป็น',
    delavirdine:'ติดตาม INR บ่อยขึ้นเมื่อเริ่มหรือหยุดยา อาจต้องลด warfarin ตามผล INR',
    diclofenac:'ลดการใช้ชนิดรับประทานและติดตามเลือดออก โดยเฉพาะทางเดินอาหาร; ชนิดทามี interaction น้อยตามเอกสาร',
    dicloxacillin:'ติดตาม INR ในช่วงเริ่มยา และต่อเนื่องอย่างน้อยประมาณ 3 สัปดาห์หลังหยุด dicloxacillin',
    disopyramide:'ติดตาม INR เมื่อเริ่มหรือหยุดยา',
    doxycycline:'โดยทั่วไปไม่ลด warfarin empirically เป็น routine หากไม่มีปัจจัยอื่น เช่น ไข้หรือความอยากอาหารลดลง ควรติดตาม INR เมื่อเริ่มหรือหยุดยา',
    'ethinyl-estradiol':'หลีกเลี่ยงการใช้ร่วมเมื่อเป็นไปได้ ติดตาม INR ใกล้ชิดและอาการช้ำหรือเลือดออก',
    etravirine:'เอกสารให้พิจารณาลด warfarin แต่ไม่ระบุเปอร์เซ็นต์ ติดตาม INR บ่อยขึ้นเมื่อเริ่มหรือหยุดยา',
    'fluoxymesterone-and-other-androgens':'หลีกเลี่ยงการใช้ร่วมเมื่อเป็นไปได้ หากใช้ร่วมให้ติดตาม INR และพิจารณาลด warfarin หากจำเป็น',
    fluoxetine:'อาจเพิ่ม INR และ bleeding risk ควรติดตาม INR และอาการเลือดออก',
    fluvastatin:'ติดตาม INR เมื่อเริ่มหรือหยุดยา พิจารณา statin ตัวอื่นตามเอกสาร',
    fosamprenavir:'ติดตาม INR บ่อยขึ้นเมื่อเริ่มหรือหยุดยา หากใช้ ritonavir boosting ผลสุทธิอาจเป็น INR ลดลง',
    glyburide:'ติดตาม INR ใกล้ชิดเมื่อเริ่มหรือหยุดยา',
    ibuprofen:'หลีกเลี่ยงหรือลดการใช้ร่วม ติดตามเลือดออกโดยเฉพาะทางเดินอาหาร และรับประทานพร้อมอาหารตามเอกสาร',
    indomethacin:'ติดตาม INR และเลือดออกโดยเฉพาะทางเดินอาหาร ลดการใช้ร่วมและรับประทานพร้อมอาหารตามเอกสาร',
    lactulose:'ติดตาม INR ใกล้ชิดเมื่อเริ่มหรือหยุดยา',
    lansoprazole:'ติดตาม INR เมื่อเริ่มหรือหยุดยา พิจารณาประเมินซ้ำใน 1 สัปดาห์',
    leflunomide:'ติดตาม INR ใกล้ชิดเมื่อเริ่มหรือหยุดยา',
    'thyroid-hormones':'ติดตาม INR ทุก 1–2 สัปดาห์เมื่อเริ่มหรือปรับ levothyroxine และปรับ warfarin ทีละน้อยตามผล INR',
    lovastatin:'ติดตาม INR และปรับ warfarin ตามผล INR เมื่อเริ่มหรือหยุดยา',
    mesalamine:'ติดตาม INR เมื่อเริ่มหรือหยุดยา',
    methimazole:'ติดตาม INR ใกล้ชิดเมื่อเริ่ม หยุด หรือปรับขนาดยา',
    'methyl-salicylate-topical':'ติดตาม INR ใกล้ชิด พิจารณายาทาอื่น เช่น capsaicin ตามเอกสาร',
    'nalidixic-acid':'ติดตาม INR และพิจารณาลด warfarin หากจำเป็นตามผล INR',
    nortriptyline:'ติดตาม INR เมื่อเริ่มหรือหยุด nortriptyline และปรับ warfarin ตามผล INR หากจำเป็น',
    naproxen:'หลีกเลี่ยงหรือลดการใช้ร่วม ติดตามเลือดออกโดยเฉพาะทางเดินอาหาร และรับประทานพร้อมอาหารตามเอกสาร',
    nelfinavir:'ติดตาม INR บ่อยขึ้นเมื่อเริ่มหรือหยุดยา',
    ofloxacin:'ติดตาม INR ใกล้ชิด; เริ่มเห็นผลประมาณ 3–4 วัน และ effect อาจสูงสุดในช่วง 7–14 วัน',
    omeprazole:'ผลต่อ INR เล็กน้อยและ clinical significance ต่ำ ไม่ต้อง empirically adjust warfarin เป็น routine และติดตาม INR ตามเหมาะสม',
    orlistat:'หลีกเลี่ยงการใช้ร่วมเมื่อเป็นไปได้ และติดตาม INR ใกล้ชิด',
    paroxetine:'อาจเพิ่ม bleeding risk ร่วมกับ warfarin เอกสารไม่ระบุ specific warfarin dose adjustment ควรติดตามอาการเลือดออก',
    penicillins:'ติดตาม INR และพิจารณาลด warfarin หากจำเป็นตามผล INR',
    prednisone:'ไม่แนะนำ empiric warfarin adjustment ตอนเริ่มยาเป็น routine ติดตาม INR โดยเฉพาะขนาดสูงหรือ bolus/pulse therapy และอาการเลือดออก',
    propoxyphene:'ติดตาม INR เมื่อเริ่มหรือหยุดยา; ข้อมูลมาจาก case reports',
    propylthiouracil:'ติดตาม INR ใกล้ชิดเมื่อเริ่ม หยุด หรือปรับขนาดยา',
    'quinine-derivatives':'ติดตาม INR และพิจารณาลด warfarin ตามผล INR หากจำเป็น',
    quetiapine:'ติดตาม INR เมื่อเริ่มหรือหยุดยา; ข้อมูลมาจาก case report รายเดียว',
    raloxifene:'ติดตาม INR ใกล้ชิดเมื่อเริ่มหรือหยุดยา',
    ranitidine:'ติดตาม INR เมื่อเริ่มหรือหยุดยา พิจารณา famotidine หรือ nizatidine ตามเอกสาร',
    ribavirin:'ติดตาม INR บ่อยขึ้นเมื่อเริ่มหรือหยุด ribavirin',
    ropinirole:'ติดตาม INR ใกล้ชิดเมื่อเริ่มหรือหยุดยา; ข้อมูลมาจาก case report รายเดียว',
    sertraline:'อาจเพิ่ม INR และ bleeding risk เอกสารไม่ระบุ specific warfarin dose adjustment',
    simvastatin:'ติดตาม INR เมื่อเริ่มหรือหยุดยา ผลอาจน้อยจนถึงมีนัยสำคัญ พิจารณา atorvastatin หรือ pravastatin ตามเอกสาร',
    tamoxifen:'ติดตาม PT/INR ในช่วง 1–3 วันหลังเริ่มใช้ยาร่วมกันตามเอกสาร',
    terbinafine:'ติดตาม INR เมื่อเริ่มหรือหยุดยา',
    tetracycline:'ติดตาม INR',
    ticlopidine:'ติดตาม INR เมื่อเริ่มหรือหยุดยา และอาการเลือดออกแม้ INR อาจไม่เพิ่ม',
    tipranavir:'ติดตาม INR บ่อยขึ้นเมื่อเริ่มหรือหยุดยาและระวังเลือดออก หากใช้ ritonavir boosting ผลสุทธิอาจเป็น INR ลดลง',
    'vitamin-e':'ติดตาม INR และพิจารณาลด warfarin หากจำเป็นตามผล INR',
    'vitamin-k':'หลีกเลี่ยงหรือลดอาหารที่มี vitamin K สูงตามเอกสาร ติดตาม INR และปรับ warfarin ตามผล INR'
  };
  const notes={
    dicloxacillin:'ผลอาจคงอยู่อย่างน้อย 2–3 สัปดาห์หลังหยุดยา',
    fluoxetine:'ผลอาจคงอยู่นานกว่าประมาณ 1 สัปดาห์หลังหยุดยา',
    mesalamine:'มีรายงานผู้ป่วยหนึ่งราย INR ลดลงมาก และกลับสู่ therapeutic range หลังหยุด mesalamine',
    cisplatin:'เอกสารให้ติดตาม INR อย่างน้อย 2 สัปดาห์หลัง chemotherapy โดยเฉพาะช่วงสามวันแรกของการให้ยา',
    raloxifene:'ข้อมูลจาก single-dose studies; ไม่มีข้อมูลการใช้ระยะยาว',
    tipranavir:'เอกสารรายงานความเสี่ยง intracranial hemorrhage',
    'acetaminophen-doses-2-g-d':'interaction นี้เกี่ยวกับการใช้ขนาด >2 g/day'
  };
  const emr={
    nortriptyline:'DI: Nortriptyline อาจทำให้ INR สูงขึ้น; ควรติดตาม INR เมื่อเริ่มหรือหยุดยาและปรับ warfarin ตามผล INR.',
    acarbose:'DI: Acarbose อาจทำให้ INR สูงขึ้น; ติดตาม INR ใกล้ชิดเมื่อเริ่มหรือหยุดยา.',
    'acetaminophen-doses-2-g-d':'DI: Acetaminophen >2 g/day อาจทำให้ INR สูงขึ้น; ควรจำกัดขนาด/ระยะเวลาและติดตาม INR เมื่อใช้ขนาดสูง.',
    dicloxacillin:'DI: Dicloxacillin อาจทำให้ INR ลดลง; เริ่มเห็นผลประมาณ 4–5 วันและอาจคงอยู่อย่างน้อย 2–3 สัปดาห์หลังหยุดยา ควรติดตาม INR ต่อเนื่อง.',
    fluoxetine:'DI: Fluoxetine อาจเพิ่ม INR และ bleeding risk; effect มักเห็นชัดประมาณ 1 สัปดาห์ ควรติดตาม INR และอาการเลือดออก.',
    ofloxacin:'DI: Ofloxacin อาจทำให้ INR สูงขึ้น; effect เริ่มเห็นประมาณ 3–4 วันและอาจสูงสุดในช่วง 7–14 วัน ควรติดตาม INR ใกล้ชิด.',
    cisplatin:'DI: Cisplatin อาจเพิ่ม INR และ bleeding risk; ควรติดตาม INR และอาการเลือดออกอย่างใกล้ชิด โดยเฉพาะช่วง chemotherapy.',
    citalopram:'DI: Citalopram อาจเพิ่ม bleeding risk ร่วมกับ warfarin; source ไม่ระบุ specific warfarin dose adjustment ควรติดตามอาการเลือดออก.',
    mesalamine:'DI: Mesalamine อาจทำให้ INR ลดลง; มี case report ของ INR ลดลงมาก ควรติดตาม INR เมื่อเริ่มหรือหยุดยา.',
    'quinine-derivatives':'DI: Quinine derivatives อาจทำให้ INR สูงขึ้น; ควรติดตาม INR และปรับ warfarin ตามผล INR หากจำเป็น.',
    ribavirin:'DI: Ribavirin อาจทำให้ INR ลดลง; ควรติดตาม INR บ่อยขึ้นเมื่อเริ่มหรือหยุดยา.',
    doxycycline:'DI: Doxycycline อาจทำให้ INR สูงขึ้น; โดยทั่วไปไม่ลด warfarin empirically เป็น routine หากไม่มีปัจจัยอื่นที่ทำให้ INR สูง ควรติดตาม INR.',
    omeprazole:'DI: Omeprazole อาจเพิ่ม INR เล็กน้อย แต่ clinical significance ต่ำ; ไม่ต้อง empirically adjust warfarin เป็น routine และติดตาม INR ตามเหมาะสม.',
    prednisone:'DI: Prednisone อาจทำให้ INR เปลี่ยนได้ทั้งขึ้นหรือลง; ไม่แนะนำ empiric warfarin adjustment ตอนเริ่มยาเป็น routine ควรติดตาม INR โดยเฉพาะเมื่อใช้ขนาดสูงหรือ pulse therapy.'
  };
  const mechanisms={
    acarbose:'กลไกไม่แน่ชัด อาจเพิ่มการดูดซึม warfarin หรือเกี่ยวกับอาการท้องเสียจากยา',
    'acetaminophen-doses-2-g-d':'อาจลด metabolism ของ warfarin และ/หรือลดการสร้าง clotting factors',
    asa:'ยับยั้งการทำงานของ platelet แบบ irreversible',
    'bismuth-subsalicylate':'อาจแทนที่ warfarin จาก protein binding',
    cholestyramine:'ลดการดูดซึม warfarin', cimetidine:'ลด metabolism ของ warfarin',
    colchicine:'อาจเกี่ยวกับอาการท้องเสียจากยา',
    cyclophosphamide:'อาจแทนที่ protein binding ยับยั้ง metabolism ของ warfarin หรือยับยั้งการสร้าง clotting factors',
    diclofenac:'ยับยั้ง platelet และ gastroprotective prostaglandins',
    dicloxacillin:'กระตุ้น CYP2C9 และ CYP3A4 ทำให้ metabolism ของ warfarin เพิ่มขึ้น',
    doxycycline:'กลไกไม่แน่ชัด อาจยับยั้ง metabolism ผ่าน CYP3A4 และ/หรือแทนที่ protein binding',
    'ethinyl-estradiol':'กลไกไม่ทราบแน่ชัด; มี case reports ของ INR เพิ่มหลังใช้ emergency contraceptive pill',
    ibuprofen:'ยับยั้งการทำงานของ platelet และ gastroprotective prostaglandins',
    indomethacin:'ยับยั้ง platelet aggregation และ gastroprotective prostaglandins',
    lactulose:'ลดการดูดซึม vitamin K จากลำไส้',
    'thyroid-hormones':'การแก้ hypothyroidism เพิ่ม catabolism ของ clotting factors จึงลด warfarin requirement',
    lovastatin:'ยับยั้ง metabolism ของ warfarin',
    methimazole:'การกลับสู่ euthyroidism เพิ่ม catabolism ของ clotting factors และ warfarin requirement ตามเอกสาร',
    'methyl-salicylate-topical':'ยับยั้ง metabolism ของ warfarin และ platelet aggregation',
    naproxen:'ยับยั้ง platelet aggregation และการสร้าง gastroprotective prostaglandins',
    nelfinavir:'อาจยับยั้ง CYP3A4 หรือกระตุ้น CYP2C9 ทำให้ metabolism เพิ่มหรือลด',
    ofloxacin:'เอกสารระบุ inhibition ของ CYP1A2 ระดับ strong',
    omeprazole:'ยับยั้ง hepatic metabolism ของ R-warfarin ซึ่งมีฤทธิ์น้อยกว่า แบบ stereoselective',
    orlistat:'ลดการดูดซึม fat-soluble vitamins รวมถึง vitamin K',
    propylthiouracil:'การกลับสู่ euthyroidism เพิ่ม catabolism ของ clotting factors และ warfarin requirement ตามเอกสาร',
    quetiapine:'ยับยั้ง CYP3A4 และ CYP2C9 แบบ competitive',
    ranitidine:'ยับยั้ง hepatic metabolism ของ warfarin',
    ropinirole:'อาจยับยั้ง metabolism ผ่าน CYP1A2 แบบ competitive และ/หรือแทนที่ protein binding',
    selegiline:'ยับยั้ง CYP1A2 ระดับ moderate และ CYP2C9/CYP3A4 ระดับ weak ตามเอกสาร',
    sertraline:'การลด serotonin อาจลด platelet aggregation และเพิ่ม bleeding risk ตามคำอธิบายในเอกสาร',
    simvastatin:'แข่งขัน metabolism ผ่าน CYP3A4', tetracycline:'ลด plasma prothrombin activity',
    ticlopidine:'ยับยั้ง metabolism ของ R-warfarin และลด platelet aggregation',
    tipranavir:'อาจกระตุ้น metabolism ผ่าน CYP3A4; ผู้ผลิตคาดว่าไม่มีผลต่อระดับ S-warfarin ตามเอกสาร'
  };
  for(const id of ['amprenavir','atazanavir','fosamprenavir','delavirdine'])mechanisms[id]='อาจยับยั้ง metabolism ของ warfarin ผ่าน CYP3A4';
  for(const id of ['etravirine','fluvastatin','leflunomide'])mechanisms[id]='ยับยั้ง metabolism ของ warfarin ผ่าน CYP2C9';
  const effects={INR_UP:'อาจทำให้ INR สูงขึ้น',INR_DOWN:'อาจทำให้ INR ลดลง',INR_VARIABLE:'อาจทำให้ INR เพิ่มหรือลด',BLEEDING_RISK_UP:'อาจเพิ่ม bleeding risk ร่วมกับ warfarin',NO_INR_EFFECT:'ไม่มีผลต่อ INR ตามเอกสาร',UNKNOWN:'ผลต่อ INR ไม่ชัดเจน'};
  function apply(entries){return entries.map(original=>{
    if(!reviewedIds.includes(original.id)||original.review.verifiedForApp)return original;
    const e={...original,clinicalReviewPhase:'FINAL_PHASE_3',
      review:{...original.review,sourceChecked:true,clinicalReviewed:true,verifiedForApp:true},
      empiricAdjustment:{...original.empiricAdjustment,enabled:false},optimizerIntegration:{...original.optimizerIntegration,enabled:false},
      managementRaw:original.management,mechanismRaw:original.mechanism,sourceNotesRaw:original.sourceNotesTh,
      sourceOriginal:{direction:original.direction,severity:original.severity,onset:original.onset,offset:original.offset},
      clinicalReviewDecision:{date:'2026-10-12',authority:'User clinician review',monitorOnly:true}};
    if(e.id==='acarbose')e.offset='7–14 days after stopping';
    if(e.id==='acetaminophen-doses-2-g-d')e.offset='approximately 2 days after stopping';
    if(e.id==='dicloxacillin'){e.onset='approximately 4–5 days';e.offset='at least 2–3 weeks after stopping';}
    if(e.id==='fluoxetine'){e.onset='approximately 1 week';e.offset='approximately 1 week after stopping; may persist longer';}
    if(e.id==='ofloxacin'){e.onset='approximately 3–4 days';e.peakEffect='approximately 7–14 days';e.offset=null;}
    if(e.id==='nortriptyline'){
      e.direction='INR_UP';e.severity='Moderate';e.onset='Delayed';
      e.clinicalReviewDecision.note='Clinician-reviewed interpretation: use main table classification (INR ↑, Moderate, Delayed). Conflicting Thai annotation is preserved in raw source data.';
    }
    const bleeding=e.direction==='BLEEDING_RISK_UP';
    const management=guidance[e.id]||'เอกสารไม่ระบุคำแนะนำการปรับ warfarin เฉพาะสำหรับรายการนี้';
    e.thai={mechanism:mechanisms[e.id]||'กลไกไม่ทราบแน่ชัด',management,monitoring:bleeding?'ติดตามอาการเลือดออก':/ติดตาม|ตรวจ INR/.test(management)?management:'เอกสารไม่ระบุ monitoring schedule',note:notes[e.id]||null};
    const additional=(e.additionalEffects||[]).includes('BLEEDING_RISK_UP')&&!bleeding?' และ bleeding risk':'';
    e.emrSummaryTh=emr[e.id]||(bleeding?`DI: ${e.canonicalName} อาจเพิ่ม bleeding risk ร่วมกับ warfarin แม้ INR อาจไม่เพิ่ม; ควรติดตามอาการเลือดออก.`:
      `DI: ${e.canonicalName} ${effects[e.direction]}${additional}; ${management.replace(/ตามเอกสาร/g,'')}.`);
    return e;
  });}
  const api={apply,reviewedIds};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.WarfarinInteractionFinalReview=api;
})(typeof window!=='undefined'?window:globalThis);
