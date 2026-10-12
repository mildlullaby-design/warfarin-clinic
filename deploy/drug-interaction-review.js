(function () {
  'use strict';
  const D = window.WarfarinInteractionData, C = window.WarfarinInteractionCore;
  const panel = document.getElementById('interactionReview'), toggle = document.getElementById('interactionReviewToggle');
  const storageKey = `warfarin-interaction-review-drafts:${D.importMetadata.sha256}`;
  let drafts = {}, filter = 'all', query = '', selected = null;
  try { const saved = JSON.parse(localStorage.getItem(storageKey) || '{}'); if (saved && typeof saved === 'object' && !Array.isArray(saved)) drafts = saved; } catch (_) { /* Review remains usable without storage. */ }
  const search = C.createSearchIndex(D.entries);
  const filters = {
    all: ['All', () => true], source: ['Pending source check', e => !e.review.sourceChecked],
    clinical: ['Pending clinical review', e => !e.review.clinicalReviewed], verified: ['Verified', e => e.review.sourceChecked && e.review.clinicalReviewed && e.review.verifiedForApp],
    empiric: ['Numeric dose guidance available', C.hasDocumentedAdjustment], monitor: ['Monitor only / no numeric adjustment', e => !C.hasDocumentedAdjustment(e)]
  };
  function node(tag, text, cls) { const n = document.createElement(tag); if (text != null) n.textContent = text; if (cls) n.className = cls; return n; }
  function button(text, run, id) { const n = node('button', text); n.type = 'button'; if (id) n.id = id; n.addEventListener('click', run); return n; }
  function item(dl, label, value) { dl.append(node('dt', label), node('dd', value || 'Not reported')); }
  function render() {
    panel.replaceChildren();
    const title = node('h3', 'Review imported records'); title.id = 'interactionReviewHeading';
    const count = node('p', `Reviewed ${D.entries.filter(e => e.review.clinicalReviewed && e.review.verifiedForApp && e.review.sourceChecked).length} / ${D.entries.length} · Local drafts ${Object.keys(drafts).filter(id => D.entries.some(e => e.id === id)).length}`, 'muted'); count.id = 'interactionReviewCount';
    panel.append(title, count, node('p', 'เปรียบเทียบข้อมูลกับหน้า PDF ที่ระบุ ช่องด้านล่างใช้บันทึกการตรวจทานในเครื่องเท่านั้น ไม่เปลี่ยนสถานะอนุมัติของข้อมูลและไม่เปิดปุ่ม Adjust dose การอนุมัติใช้ในแอปจะทำแยกในขั้นทบทวนรายยา', 'muted'));
    const controls = node('div', null, 'interaction-review-controls');
    const searchLabel = node('label', 'Search review records'), input = node('input'); input.id = 'interactionReviewSearch'; input.type = 'search'; input.value = query; searchLabel.htmlFor = input.id;
    input.addEventListener('input', () => { query = input.value; selected = null; renderList(); });
    const filterLabel = node('label', 'Review filter'), select = node('select'); select.id = 'interactionReviewFilter'; filterLabel.htmlFor = select.id;
    Object.entries(filters).forEach(([key, [name]]) => { const opt = node('option', name); opt.value = key; select.append(opt); }); select.value = filter;
    select.addEventListener('change', () => { filter = select.value; selected = null; renderList(); });
    controls.append(searchLabel, input, filterLabel, select); panel.append(controls);
    const list = node('div'); list.id = 'interactionReviewList'; panel.append(list);
    panel.append(button('Export local review drafts', () => {
      const blob = new Blob([JSON.stringify({ document: D.importMetadata.document, sourceSha256: D.importMetadata.sha256, drafts, notice: 'Draft notes only; these do not grant production dose-adjustment approval.' }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob), a = node('a'); a.href = url; a.download = 'drug-interaction-review-drafts.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'interactionReviewExport'));
    renderList();
  }
  function renderList() {
    const list = document.getElementById('interactionReviewList'); list.replaceChildren();
    const entries = search(query).filter(filters[filter][1]);
    list.append(node('p', `${entries.length} matching record${entries.length === 1 ? '' : 's'}`));
    if (!entries.length) { list.append(node('p', 'No matching records')); return; }
    let index = entries.findIndex(e => e.id === selected); if (index < 0) index = 0; selected = entries[index].id;
    const nav = node('div', null, 'interaction-review-nav'), picker = node('select'); picker.id = 'interactionReviewPicker'; picker.setAttribute('aria-label', 'Choose record to review');
    entries.forEach(e => { const option = node('option', `${e.canonicalName} · p. ${e.source.pages.join(', ')}`); option.value = e.id; picker.append(option); }); picker.value = selected;
    picker.addEventListener('change', () => { selected = picker.value; renderList(); });
    const prev = button('Previous', () => { selected = entries[index - 1].id; renderList(); }, 'interactionReviewPrevious'); prev.disabled = index === 0;
    const next = button('Next', () => { selected = entries[index + 1].id; renderList(); }, 'interactionReviewNext'); next.disabled = index === entries.length - 1;
    nav.append(prev, picker, next); list.append(nav);
    const e = entries[index], a = e.empiricAdjustment, fields = node('dl');
    list.append(node('h4', `${e.canonicalName} · ${index + 1} / ${entries.length}`));
    item(fields, 'Source page', `${e.source.document} · ${e.source.pages.join(', ')}`);
    item(fields, 'Effect on INR / additional effects', `${e.direction}${e.additionalEffects.length ? ' · ' + e.additionalEffects.join(', ') : ''}`);
    item(fields, 'Original source effect', e.sourceEffect); item(fields, 'Severity', e.severity);
    if(e.clinicalReviewDecision){
      item(fields,'Clinician review decision',`${e.clinicalReviewDecision.date} · Monitor only${e.clinicalReviewDecision.note?' · '+e.clinicalReviewDecision.note:''}`);
      item(fields,'Original source timing before clinician finalization',`Onset: ${e.sourceOriginal.onset||'Not reported'}; offset: ${e.sourceOriginal.offset||'Not reported'}`);
    }
    item(fields, 'Onset', e.onset); item(fields, 'Offset', e.offset); item(fields, 'Half-life notes', e.halfLifeNotes.join('; '));
    item(fields, 'Mechanism (source-derived English)', e.mechanism); item(fields, 'Management (source-derived)', e.management);
    item(fields, 'Monitoring', e.monitoring.text);
    item(fields, e.adjustmentContext==='START_ONLY'?'Dose guidance when starting CBZ — may be required':'Dose guidance', C.hasDocumentedAdjustment(e) ? `${a.direction} · ${a.minPercent}–${a.maxPercent}% · Presets: ${a.presets.join(', ')} · Custom allowed · ${e.review.sourceChecked && e.review.clinicalReviewed && e.review.verifiedForApp ? 'Verified' : 'Review pending'}` : 'No numeric initial empiric adjustment documented');
    item(fields, 'Dose guidance context / subgroup', [a.context, a.applicabilityText || (Array.isArray(a.appliesTo) ? a.appliesTo.join(', ') : a.appliesTo), a.timingNote, a.note].filter(Boolean).join('\n'));
    item(fields, 'Numeric observations (not presets)', e.numericDoseObservations?.map(n => `${n.classification}: ${n.text}`).join('\n'));
    item(fields, 'Starting guidance', e.changeGuidance?.starting); item(fields, 'Stopping guidance', e.changeGuidance?.stopping); item(fields, 'Dose-change guidance', e.changeGuidance?.doseChange);
    item(fields, 'Source notes (Thai; compare glyphs with PDF)', e.sourceNotesTh.map(n => `${n.field}: ${n.text}`).join('\n'));
    item(fields, 'Source variants', e.sourceVariants?.map(v => `Page ${v.page}: ${v.management}; offset: ${v.offset}`).join('\n'));
    item(fields, 'Extraction uncertainties', e.extractionUncertainties.map(w => `${w.field}: ${w.reason}`).join('\n') || 'None flagged');
    item(fields, 'Review flags (dataset)', Object.entries(e.review).map(([name, checked]) => `${name}: ${checked}`).join(' · '));
    item(fields, 'Aliases / provenance', `${e.aliases.join(', ') || 'None'} (${e.aliasSource})${e.manualAliasProvenance ? ' · ' + e.manualAliasProvenance : ''}`);
    list.append(fields);
    const raw = node('details'); raw.append(node('summary', 'Original extracted cells')); const rawFields = node('dl');
    e.sourceRows.forEach(row => { item(rawFields, `PDF page ${row.page}, table row ${row.row}`, row.cells.map((cell, i) => `${['Drug','Effect/severity','Mechanism','Onset','Offset','Management','Significance','References'][i]}: ${cell || '[blank]'}`).join('\n')); }); raw.append(rawFields); list.append(raw);
    const draft = drafts[e.id] || {}, form = node('div', null, 'interaction-review-draft');
    const checks = [];
    for (const [key, text] of [['sourceCompared','Source comparison draft complete'],['clinicalReviewed','Clinical review draft complete']]) {
      const label = node('label', text), check = node('input'); check.type = 'checkbox'; check.dataset.reviewDraft = key; check.checked = draft[key] === true; label.prepend(check); form.append(label); checks.push([key,check]);
    }
    const label = node('label', 'Local review notes'), notes = node('textarea'); notes.id = 'interactionReviewNotes'; notes.rows = 4; notes.value = typeof draft.notes === 'string' ? draft.notes : ''; label.htmlFor = notes.id;
    const status = node('p'); status.id = 'interactionReviewSaveStatus'; status.setAttribute('role','status');
    form.append(label, notes, button('Save local draft', () => {
      drafts[e.id] = { ...Object.fromEntries(checks.map(([key,check]) => [key,check.checked])), notes: notes.value, savedAt: new Date().toISOString() };
      try { localStorage.setItem(storageKey, JSON.stringify(drafts)); status.textContent = 'บันทึกในเครื่องแล้ว สถานะอนุมัติและสิทธิ์ปรับขนาดยายังคงเดิม'; }
      catch (_) { status.textContent = 'บันทึกในหน่วยความจำแล้ว แต่พื้นที่เก็บข้อมูลในเครื่องใช้ไม่ได้ กรุณาส่งออกบันทึก'; }
      document.getElementById('interactionReviewCount').textContent = `Reviewed ${D.entries.filter(x => x.review.clinicalReviewed && x.review.verifiedForApp && x.review.sourceChecked).length} / ${D.entries.length} · Local drafts ${Object.keys(drafts).length}`;
    }, 'interactionReviewSave'), status); list.append(form);
  }
  toggle.addEventListener('click', () => { const open = panel.classList.contains('hidden'); panel.classList.toggle('hidden', !open); toggle.setAttribute('aria-expanded', String(open)); if (open) render(); });
})();
