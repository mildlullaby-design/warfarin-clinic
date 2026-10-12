/* Thai presentation text. Original PDF-grounded English records remain in drug-interactions.js. */
(function (root) {
  'use strict';
  const entries = {
    metronidazole: {
      mechanism: 'ลดการเมแทบอลิซึมของ warfarin โดยยับยั้ง CYP2C9',
      management: 'ติดตาม INR อย่างใกล้ชิดเมื่อเริ่มหรือหยุด metronidazole โดยแหล่งอ้างอิงระบุว่า AMS พิจารณาลดขนาด warfarin เบื้องต้น 25–40%',
      monitoringText: 'ติดตาม INR อย่างใกล้ชิดเมื่อเริ่มหรือหยุด metronidazole'
    },
    fluconazole: {
      mechanism: 'ยับยั้งการเมแทบอลิซึมของ warfarin ผ่าน CYP2C9 และ CYP3A4',
      management: 'ติดตาม INR อย่างใกล้ชิดเมื่อเริ่มหรือหยุด fluconazole ผลอาจมากขึ้นในผู้ป่วยที่การทำงานของไตลดลง เนื่องจากการกำจัด fluconazole ลดลง แหล่งอ้างอิงระบุว่า AMS พิจารณาลดขนาด warfarin เบื้องต้น 25–30% และในระยะต่อมาอาจต้องลดขนาดยาจนใกล้ 80%',
      note: 'แหล่งอ้างอิงระบุว่าในระยะต่อมาอาจต้องลดขนาดยาจนใกล้ 80% ตัวเลขนี้ไม่ใช่ตัวเลือกสำหรับการปรับยาเบื้องต้น',
      monitoringText: 'ติดตาม INR อย่างใกล้ชิดเมื่อเริ่มหรือหยุด fluconazole และพิจารณาการทำงานของไตที่ลดลง'
    },
    rifampin: {
      mechanism: 'กระตุ้นการเมแทบอลิซึมของ warfarin ที่ตับ',
      management: 'ติดตาม INR อย่างใกล้ชิดอย่างน้อยสัปดาห์ละครั้งเมื่อเริ่มหรือหยุด rifampin แหล่งอ้างอิงระบุว่า AMS พิจารณาเพิ่มขนาด warfarin เบื้องต้น 25–50% และปรับเพิ่มต่อไปตามผล INR ที่ติดตามบ่อยครั้ง (อย่างน้อยสัปดาห์ละครั้ง) ผู้ป่วยบางรายอาจต้องใช้ขนาดยารวมต่อสัปดาห์ 2–3 เท่าของขนาดเดิมเมื่อเพิ่ม rifampin',
      note: 'ผู้ป่วยบางรายอาจต้องใช้ขนาดยารวมต่อสัปดาห์ 2–3 เท่าของขนาดเดิม การปรับเพิ่มเติมต้องอาศัยการติดตาม INR บ่อยครั้ง',
      monitoringText: 'ติดตาม INR อย่างน้อยสัปดาห์ละครั้งเมื่อเริ่มหรือหยุด rifampin และระหว่างการปรับขนาดยาเพิ่มเติม'
    },
    amiodarone: {
      mechanism: 'ยับยั้งการเมแทบอลิซึมของ warfarin นอกจากนี้ amiodarone อาจทำให้ INR เพิ่มขึ้นหรือลดลงโดยทำให้เกิดภาวะไทรอยด์ทำงานมากเกินหรือไทรอยด์ทำงานต่ำ ตามลำดับ',
      management: 'ติดตาม INR อย่างใกล้ชิด (สัปดาห์ละครั้ง) เมื่อเริ่มหรือหยุด amiodarone การให้ขนาดยาเริ่มต้นสูง (loading dose) อาจทำให้เกิดอันตรกิริยาเร็วขึ้น แหล่งอ้างอิงระบุว่า AMS พิจารณาลดขนาด warfarin 10–25% หลังเริ่ม amiodarone ประมาณ 1 สัปดาห์ โดยในระยะต่อมาอาจต้องลดถึง 60% หมายเหตุเพิ่มเติมในเอกสารแนะนำให้ติดตาม INR ทุก 1–2 สัปดาห์ในช่วง 12 สัปดาห์แรก',
      note: 'อาจต้องลดขนาดยาเพิ่มเติมเมื่อเวลาผ่านไป แหล่งอ้างอิงระบุว่าในระยะต่อมาอาจต้องลดถึง 60%',
      timingNote: 'พิจารณาลดขนาดยาหลังเริ่ม amiodarone ประมาณ 1 สัปดาห์ การให้ loading dose อาจทำให้เกิดอันตรกิริยาเร็วขึ้น',
      monitoringText: 'ติดตาม INR อย่างใกล้ชิด (สัปดาห์ละครั้ง) เมื่อเริ่มหรือหยุดยา หมายเหตุเพิ่มเติมในเอกสาร: ทุก 1–2 สัปดาห์ในช่วง 12 สัปดาห์แรก'
    },
    ciprofloxacin: {
      mechanism: 'ยังไม่ทราบแน่ชัด อาจเกิดจากการยับยั้ง CYP1A2 พบอันตรกิริยาได้บ่อยขึ้นในผู้สูงอายุที่ใช้ยาหลายชนิด',
      management: 'ติดตาม INR บ่อยขึ้นเมื่อเริ่มหรือหยุด ciprofloxacin ผู้ป่วยส่วนใหญ่มี INR เพิ่มขึ้น แต่บางรายอาจไม่พบผล แหล่งอ้างอิงระบุว่า AMS พิจารณาลดขนาด warfarin เบื้องต้น 10–15%',
      monitoringText: 'ติดตาม INR บ่อยขึ้นเมื่อเริ่มหรือหยุด ciprofloxacin'
    },
    levofloxacin: {
      mechanism: 'ยังไม่ทราบแน่ชัด อาจเกิดจากการยับยั้ง CYP1A2 อันตรกิริยาที่มีนัยสำคัญทางคลินิกพบได้บ่อยขึ้นในผู้สูงอายุ',
      management: 'ติดตาม INR อย่างใกล้ชิดเมื่อเริ่มหรือหยุด levofloxacin ความรุนแรงของการเจ็บป่วยมีผลต่อ INR แหล่งอ้างอิงระบุว่า AMS พิจารณาลดขนาด warfarin เบื้องต้น 0–15%',
      note: 'ความรุนแรงของการเจ็บป่วยอาจมีผลต่อ INR การเลือก 0% หมายถึงไม่ปรับขนาดยาเบื้องต้น',
      monitoringText: 'ติดตาม INR อย่างใกล้ชิดเมื่อเริ่มหรือหยุด levofloxacin และพิจารณาความรุนแรงของการเจ็บป่วย'
    },
    azithromycin: {
      mechanism: 'อาจลดการเมแทบอลิซึมของ warfarin ไข้และการรับประทานอาหารได้น้อยลงอาจเสริมให้ INR เพิ่มขึ้น',
      management: 'ผลต่อ INR ไม่สม่ำเสมอ ควรติดตาม INR อย่างใกล้ชิดเมื่อเริ่มหรือหยุด azithromycin แหล่งอ้างอิงระบุว่า AMS ไม่ลดขนาด warfarin เบื้องต้นเป็นกิจวัตร เว้นแต่มีปัจจัยอื่นที่ส่งผลต่อ INR เช่น ไข้หรือการรับประทานอาหารได้น้อยลง เอกสารไม่ได้ระบุเปอร์เซ็นต์สำหรับการปรับยาเบื้องต้น และไม่ได้รายงานระยะเวลาที่ผลลดลงหลังหยุดยา',
      monitoringText: 'ติดตาม INR อย่างใกล้ชิดเมื่อเริ่มหรือหยุดยา และประเมินไข้ การรับประทานอาหารได้น้อยลง และปัจจัยอื่นที่มีผลต่อ INR'
    },
    clopidogrel: {
      mechanism: 'ฤทธิ์ต้านเกล็ดเลือดของ clopidogrel ร่วมกับฤทธิ์ต้านการแข็งตัวของเลือดของ warfarin ทำให้การแข็งตัวของเลือดบกพร่อง เอกสารระบุว่าไม่มีผลต่อ INR และการรวมตัวของเกล็ดเลือดถูกยับยั้งแบบไม่กลับคืนตลอดอายุของเกล็ดเลือด',
      management: 'ติดตามอาการเลือดออก เอกสารระบุว่าไม่มีผลต่อ INR แต่เพิ่มความเสี่ยงเลือดออก และไม่ได้ระบุการปรับขนาด warfarin เบื้องต้น',
      monitoringText: 'ติดตามอาการเลือดออก'
    }
  };
  function display(entry) {
    const text = entry.thai ? { ...entry.thai, monitoringText: entry.thai.monitoring } : entries[entry.id] || {};
    return { ...entry,
      mechanism: text.mechanism ?? entry.mechanism, management: text.management ?? entry.management,
      monitoring: { ...entry.monitoring, text: text.monitoringText ?? entry.monitoring.text },
      empiricAdjustment: { ...entry.empiricAdjustment, note: text.note ?? entry.empiricAdjustment.note,
        timingNote: text.timingNote ?? entry.empiricAdjustment.timingNote } };
  }
  root.WarfarinInteractionThai = { display };
})(typeof window !== 'undefined' ? window : globalThis);
