# Pre-op Planner — Wording Review (เสนอให้ตรวจแก้ทีเดียว)

เอกสารนี้เป็น **ร่างคำที่แสดงบน UI** ไม่ได้แก้ option values หรือ clinical logic เอง เพื่อป้องกันผลกระทบต่อการคำนวณ
แก้คอลัมน์ **คำที่อยากใช้** หรือส่งข้อความตอบเป็นรหัส เช่น `A03 = ...` ก่อนนำไปแทนในโปรแกรม

## A. Main form / Labels

| ID | ปัจจุบัน | คำที่เสนอให้ใช้ |
|---|---|---|
| A01 | Anticoagulant | ยาต้านการแข็งตัวของเลือด |
| A02 | Primary indication | Indication |
| A03 | Procedure | หัตถการ / Procedure |
| A04 | Procedure bleeding risk | Bleeding risk |
| A05 | Operation date | วันที่ผ่าตัด |
| A06 | Operation / neuraxial time (if known) | เวลาเริ่มผ่าตัด (Optional) |
| A07 | Patient name | ชื่อผู้ป่วย (ไม่บังคับ) |
| A08 | Age (years) | Age (yr) |
| A09 | Sex for Cockcroft–Gault | Sex |
| A10 | Actual body weight (kg) | Weight (kg) |
| A11 | Serum creatinine (mg/dL) | SCr (mg/dL) |
| A12 | CrCl Cockcroft–Gault (mL/min) | CrCl (CG, mL/min) |
| A13 | Neuraxial / deep plexus planned? | Neuraxial / deep plexus? |
| A14 | Current weekly dose (mg/week) | Warfarin (mg/week) |
| A15 | Target INR | Target INR |
| A16 | Latest INR (optional) | Latest INR |
| A17 | Therapeutic LMWH bridging? | LMWH bridging? |
| A18 | Prescriber-selected dose (mg/kg/dose) | Enoxaparin (mg/kg/dose) |
| A19 | Enoxaparin mg/dose (ปรับได้) | Enoxaparin (mg/dose) |
| A20 | Apixaban dose per administration (BID) | Apixaban (mg BID) |
| A21 | Severe renal impairment: clinician-selected hold | Renal-adjusted hold (review) |

## B. Dropdown / Option text

| ID | Field | ปัจจุบัน | คำที่เสนอให้ใช้ |
|---|---|---|---|
| B01 | Indication | Atrial Fibrillation | AF |
| B02 | Indication | Mechanical heart valve | Mechanical valve |
| B03 | Indication | VTE (DVT / PE) | VTE (DVT/PE) |
| B04 | Bleeding risk | Unclassified — physician review | Unclassified - Review |
| B05 | Bleeding risk | Minimal | Minimal |
| B06 | Bleeding risk | Low–Moderate | Low–Moderate |
| B07 | Bleeding risk | High | High |
| B08 | Neuraxial | Unknown | Unknown |
| B09 | Neuraxial | No | No |
| B10 | Neuraxial | Yes | Yes |
| B11 | Bridging | No / not selected | No bridging |
| B12 | Bridging | Yes — physician selected | Yes (physician decision) |
| B13 | Apixaban | 2.5 mg BID | 2.5 mg BID |
| B14 | Apixaban | 5 mg BID | 5 mg BID |
| B15 | Apixaban | 10 mg BID | 10 mg BID |
| B16 | Apixaban | Other (Physician review) | Other - Review |
| B17 | Renal hold | Not set | Not set |
| B18 | Renal hold | 3 days (review) | Hold 3 days |
| B19 | Renal hold | 4 days (review) | Hold 4 days |

## C. Thrombotic risk option text

| ID | Field | ปัจจุบัน | คำที่เสนอให้ใช้ |
|---|---|---|---|
| C01 | AF stroke | ไม่มีประวัติที่ทราบ / ไม่ทราบ | No recent event / Unknown **(แนะนำแยกเป็น 2 choices ก่อนใช้จริง)** |
| C02 | AF stroke | ภายใน 3 เดือนก่อนผ่าตัด | <3 mo |
| C03 | AF stroke | เกิน 3 เดือน | >=3 mo |
| C04 | AF prior clot | ไม่เคย | No |
| C05 | AF prior clot | เคย | Yes |
| C06 | AF prior clot | ไม่ทราบ | Unknown |
| C07 | Valve positions | Aortic / Mitral / Tricuspid / Unknown | คงเดิม |
| C08 | Valve risk | Major thrombotic event ภายใน 12 เดือน | Stroke/TE <12 mo |
| C09 | Valve risk | LVEF <35% | LVEF <35% |
| C10 | Valve risk | AF with significant MS | AF with mod/severe MS |
| C11 | Valve risk | Hypercoagulable state | Hypercoagulable |
| C12 | VTE time | ภายใน 1 เดือน | <1 mo |
| C13 | VTE time | 1 ถึงน้อยกว่า 3 เดือน | 1-<3 mo |
| C14 | VTE time | 3-12 เดือน | 3-12 mo |
| C15 | VTE time | มากกว่า 12 เดือน | >12 mo |
| C16 | VTE time | ไม่ทราบ | Unknown |
| C17 | VTE type | DVT / PE / DVT + PE / Unknown | คงเดิม |
| C18 | VTE recurrence | First VTE | First event |
| C19 | VTE recurrence | Recurrent VTE | Recurrent |
| C20 | VTE thrombophilia | ไม่มีประวัติที่ทราบ | None known |
| C21 | VTE thrombophilia | APS | APS |
| C22 | VTE thrombophilia | Other severe thrombophilia | Severe thrombophilia |
| C23 | VTE thrombophilia | Non-severe thrombophilia | Non-severe |
| C24 | VTE thrombophilia | มี แต่ไม่ทราบชนิด | Unknown type |
| C25 | Cancer | ไม่มี Active cancer หรือประวัติภายใน 5 ปี | None / Remote (>5 yr) |
| C26 | Cancer | Active pancreatic / primary brain / gastric / esophageal cancer / MPN | High-VTE active cancer |
| C27 | Cancer | Other active cancer | Other active cancer |
| C28 | Cancer | Cancer history ภายใน 5 ปี (ไม่ active) | Recent cancer, not active |
| C29 | Cancer | ไม่ทราบ | Unknown |
| C30 | Prior VTE interruption | ไม่เคย / เคย / ไม่ทราบ | No / Yes / Unknown |

## D. Perioperative table / A4 phrases

| ID | ปัจจุบัน (ตัวอย่าง) | คำที่เสนอให้สั้น |
|---|---|---|
| D01 | Warfarin 21 mg/week (ตามตารางยาเดิม) | Warfarin 21 mg/week |
| D02 | Hold Warfarin (current 21 mg/week ...) | Hold Warfarin |
| D03 | PROCEDURE / ผ่าตัด / ประเมิน hemostasis ก่อน restart | Surgery / Check hemostasis |
| D04 | Hold enoxaparin at least 24 h before surgery | **คงเดิม** |
| D05 | Check pre-op INR; TARGET INR <1.5 ... | Check INR - Goal <1.5 |
| D06 | Neuraxial INR ต้องอยู่ใน normal range ... | INR normal (lab range) - ASRA |
| D07 | Suggest restart Warfarin ... if stable, no bleeding ... | Consider restart Warfarin if hemostasis OK |
| D08 | Suggested INR check (4 วันหลัง planned restart ...) | INR check +4 days after actual restart |
| D09 | LMWH restart only if indicated ... | Resume LMWH only if safe / approved |
| D10 | Suggest restart Apixaban ... physician approves | Consider restart Apixaban if safe |
| D11 | Alternative restart date if bleeding risk requires delay | Delay restart if bleeding risk |
| D12 | Post-op: treating team to confirm | Post-op (conditional) |
| D13 | No therapeutic LMWH order while renal/dose review pending | LMWH - Pending review |
| D14 | Draft - Not for medication orders | DRAFT - NOT FOR ORDERS |
| D15 | Physician / Date | Physician / Date |

### Clinical wording constraints (อย่าย่อจนเสียความหมาย)

- **D04:** Therapeutic-dose LMWH bridging ต้องเว้นอย่างน้อย 24 ชั่วโมงก่อนผ่าตัด; หลีกเลี่ยงสลับกับ 12 ชั่วโมงของ prophylactic-dose LMWH
- **D05:** Surgical INR target <1.5 เป็นค่าใช้ทั่วไปเมื่อหยุด Warfarin; ต้องตรวจ procedural target ของทีมผ่าตัด
- **D06:** Neuraxial ต้อง normalized INR ตาม local laboratory ไม่ใช่แค่ <1.5
- **D07-D11:** Post-op restart เป็น **conditional recommendation**, ต้องมั่นใจว่า hemostasis adequate และ treating team อนุมัติ; ถ้าย่อในแถว ให้พิมพ์คำเตือนนี้ใน footer/notes เสมอ
- **C01:** ห้ามรวม No event กับ Unknown หากต้องใช้ risk logic ต่างกัน

*สถานะ: Wording review only. ยังไม่แก้ข้อความ options ใน runtime ตามตารางนี้จนกว่าจะตรวจชุดเดียวกันทั้งหมด*
