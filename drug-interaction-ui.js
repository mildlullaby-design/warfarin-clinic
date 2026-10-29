(function () {
  'use strict';
  const C = window.WarfarinInteractionCore, data = window.WarfarinInteractionData;
  const $ = id => document.getElementById(id), state = C.createAdjustmentState();
  const search = C.createSearchIndex(data.entries);
  const effects = { INR_UP: 'INR ↑', INR_DOWN: 'INR ↓', INR_VARIABLE: 'INR variable',
    BLEEDING_RISK_UP: 'Bleeding risk ↑', NO_INR_EFFECT: 'No INR effect', UNKNOWN: 'Unknown' };
  const display = window.WarfarinInteractionThai.display;
  const context = () => $('interactionSearch').value;
  const adjustmentLabel = entry => C.adjustmentLabel(entry, context());
  const name = entry => entry.displayName || entry.canonicalName;
  const effectLabel = entry => `${effects[entry.direction]||effects.UNKNOWN}${entry.direction!=='BLEEDING_RISK_UP'&&entry.additionalEffects?.includes('BLEEDING_RISK_UP')?' · Bleeding risk ↑':''}`;
  const fmt = value => Number(value.toFixed(6)).toString();
  let customMode = false, handedOff = null, confirmed = null, detailEntry = null;
  function node(tag, text, className) { const n = document.createElement(tag); if (text != null) n.textContent = text; if (className) n.className = className; return n; }
  function button(text, action, className) { const n = node('button', text, className); n.type = 'button'; n.addEventListener('click', action); return n; }
  function showModule(name) {
    $('doseModule').classList.toggle('hidden', name !== 'dose');
    $('drugInteractions').classList.toggle('hidden', name !== 'interactions');
    document.querySelectorAll('[data-module-view]').forEach(b => { const selected = b.dataset.moduleView === name;
      b.classList.toggle('selected', selected); b.setAttribute('aria-pressed', String(selected)); });
  }
  document.querySelectorAll('[data-module-view]').forEach(b => b.addEventListener('click', () => showModule(b.dataset.moduleView)));
  function actions(entry) {
    const box = node('div', null, 'interaction-actions');
    if (C.canAdjust(entry, context())) box.append(button('Adjust dose', () => select(entry), 'primary'));
    else if (!entry.review.sourceChecked || !entry.review.clinicalReviewed || !entry.review.verifiedForApp) box.append(node('span', 'Review pending', 'interaction-review-pending'));
    box.append(button('Details', () => details(entry)));
    return box;
  }
  function renderResults() {
    const entries = search($('interactionSearch').value), box = $('interactionResults');
    $('interactionCount').textContent = `${entries.length} result${entries.length === 1 ? '' : 's'} · ${data.entries.filter(e => e.review.verifiedForApp).length} verified / ${data.entries.length} imported records`;
    box.replaceChildren();
    if (!entries.length) { box.append(node('p', 'ไม่พบยาในข้อมูลที่นำเข้าจากเอกสาร ไม่ได้หมายความว่ายานี้ไม่มีอันตรกิริยากับ warfarin', 'warning')); return; }
    const table = node('table', null, 'interaction-table');
    table.setAttribute('aria-label', 'Drug interaction results');
    const head = node('thead'), header = node('tr');
    ['Drug', 'Effect', 'Severity', 'Onset', 'Offset', 'Dose guidance', 'Action'].forEach(text => {
      const th = node('th', text); th.scope = 'col'; header.append(th);
    });
    head.append(header); const body = node('tbody'), cards = node('div', null, 'interaction-cards');
    entries.forEach(sourceEntry => {
      const entry = sourceEntry;
      const row = node('tr'); row.dataset.drugId = entry.id;
      const values = [name(entry), effectLabel(entry), entry.severity || 'Not reported',
        entry.onset || 'Not reported', entry.offset || 'Not reported', adjustmentLabel(entry)];
      values.forEach((text, i) => {
        const cell = node('td', i === 3 || i === 4 ? null : text, i === 0 ? 'interaction-name' : '');
        if (i === 3 || i === 4) { const summary = node('div', text, 'interaction-time-summary'); summary.title = text; cell.append(summary); }
        if (i === 0 && Array.isArray(entry.empiricAdjustment.appliesTo)) cell.append(node('small', ' · Source group entry', 'muted'));
        if (i === 5 && entry.empiricAdjustment.applicabilityText) cell.append(node('div', entry.empiricAdjustment.applicabilityText, 'muted'));
        row.append(cell);
      });
      const action = node('td'); action.append(actions(entry)); row.append(action);
      row.addEventListener('click', event => { if (!event.target.closest('button')) details(entry); });
      body.append(row);
      const card = node('article', null, 'interaction-card'); card.dataset.drugId = entry.id;
      card.append(node('h3', name(entry)), node('p', `${entry.severity || 'Not reported'} · ${effectLabel(entry)}`, 'interaction-effect'),
        node('p', `Onset ${entry.onset || 'Not reported'}`), node('p', adjustmentLabel(entry), 'interaction-empiric'), actions(entry));
      cards.append(card);
      if (entry.empiricAdjustment.applicabilityText) card.insertBefore(node('p', entry.empiricAdjustment.applicabilityText, 'muted'), card.lastChild);
      if (Array.isArray(entry.empiricAdjustment.appliesTo)) card.insertBefore(node('small', 'Source group entry', 'muted'), card.firstChild.nextSibling);
    });
    table.append(head, body); box.append(table, cards);
  }
  function details(entry, scroll=true) {
    if(state.entry && state.entry.id!==entry.id){state.clear();confirmed=null;handedOff=null;renderAdjustment();}
    const panel=$('interactionDetails');panel.replaceChildren();panel.classList.remove('hidden');detailEntry=entry;
    const P=window.WarfarinInteractionPresentation,view=P.details(entry,context());
    const title=node('h3',`${view.title} · รายละเอียด`);title.id='interactionDetailHeading';panel.append(title);
    panel.append(node('p',view.summary,'interaction-detail-summary'),
      node('p',`เริ่มเห็นผล ${view.onset} · หลังหยุดยา ${view.offset}`,'interaction-detail-times'),
      node('h4','คำแนะนำเกี่ยวกับ Warfarin'),node('p',view.guidance,'interaction-detail-guidance'));
    if(view.note)panel.append(node('h4','หมายเหตุสำคัญ'),node('p',view.note,'interaction-important-note'));
    panel.append(emrBox(entry),node('p',view.source,'interaction-source-footer'));
    if(view.mechanism){
      const more=node('details',null,'interaction-more');
      more.append(node('summary','ข้อมูลเพิ่มเติม'),node('h4','กลไก'),node('p',view.mechanism));panel.append(more);
    }
    const controls=node('div',null,'interaction-actions');
    if(C.canAdjust(entry,context()))controls.append(button('Adjust dose',()=>select(entry,true),'primary'));
    controls.append(button('ปิด',()=>{panel.classList.add('hidden');state.clear();confirmed=null;handedOff=null;renderAdjustment();}));panel.append(controls);
    if(scroll)panel.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function emrBox(entry) {
    const box=node('div',null,'interaction-emr');
    const calc=state.entry?.id===entry.id?state.calculation:null;
    const text=window.WarfarinInteractionEmr.format(entry,calc,confirmed,context());
    if(!text)return box;
    const heading=node('h4','EMR note'), caption=node('p','ข้อความสำหรับบันทึกในเวชระเบียน','muted');
    const preview=node('p',window.WarfarinDoseApp.formatCopiedNote(text),'emr-note'); preview.style.whiteSpace='pre-wrap';
    const status=node('span','','muted');status.setAttribute('role','status');
    box.append(heading,caption,preview,button('คัดลอก EMR note',async()=>{
      try { await navigator.clipboard.writeText(preview.textContent);status.textContent='คัดลอกแล้ว';setTimeout(()=>status.textContent='',2000); }
      catch {status.textContent='คัดลอกไม่ได้ กรุณาเลือกข้อความเพื่อคัดลอก';}
    }),status);return box;
  }
  function refreshEmr() {
    const preview=$('interactionDetails').querySelector('.emr-note');
    if(preview&&detailEntry){
      const calc=state.entry?.id===detailEntry.id?state.calculation:null;
      preview.textContent=window.WarfarinDoseApp.formatCopiedNote(window.WarfarinInteractionEmr.format(detailEntry,calc,confirmed,context())||'');
    }
  }
  document.addEventListener('warfarin:regimen-confirmed',event=>{
    const receipt=event.detail;
    if(handedOff&&receipt.current===handedOff.current&&receipt.target===handedOff.target){confirmed=receipt;refreshEmr();}
  });
  document.addEventListener('warfarin:regimen-invalidated',()=>{confirmed=null;refreshEmr();});
  function select(entry, inline=false) {
    if (!C.canAdjust(entry, context())) return;
    if(detailEntry?.id!==entry.id || $('interactionDetails').classList.contains('hidden'))details(entry,false);
    confirmed=null; handedOff=null; state.select(entry, context()); customMode = false; renderAdjustment();
    if(!inline)$('interactionDetails').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function renderCalculation() {
    const calc = state.calculation;
    $('interactionCalculation').textContent = calc ? `Current: ${fmt(calc.current)} mg/wk · Selected adjustment: ${calc.signedPercent > 0 ? '+' : ''}${calc.signedPercent}% · Target: ${fmt(calc.target)} mg/wk` : 'กรอกขนาดยาปัจจุบันต่อสัปดาห์ให้ถูกต้อง แล้วเลือกเปอร์เซ็นต์เพื่อคำนวณขนาดเป้าหมาย';
    $('interactionOpenOptimizer').disabled = !calc;
    refreshEmr();
  }
  function renderAdjustment() {
    const panel = $('interactionAdjustment'), entry = state.entry ? display(state.entry) : null;
    panel.replaceChildren(); panel.classList.toggle('hidden', !entry);
    if (!entry) { refreshEmr(); return; }
    const currentLabel=node('label','ขนาด warfarin ปัจจุบันต่อสัปดาห์ (mg/week)');currentLabel.htmlFor='interactionAdjustmentCurrent';
    const currentInput=node('input');currentInput.id='interactionAdjustmentCurrent';currentInput.type='text';currentInput.inputMode='decimal';currentInput.value=$('current').value;
    currentInput.addEventListener('input',()=>{$('current').value=currentInput.value;$('current').dispatchEvent(new Event('input',{bubbles:true}));});
    panel.append(currentLabel,currentInput);
    const a = entry.empiricAdjustment, title = node('h3', `${name(entry)} · ${adjustmentLabel(entry)}`); title.id = 'interactionAdjustmentHeading';
    if (a.applicabilityText) panel.append(node('p', a.applicabilityText, 'muted'));
    panel.append(title, node('p', 'ผู้รักษาเป็นผู้เลือกเปอร์เซ็นต์ แอปไม่เลือกค่าให้อัตโนมัติ', 'muted'));
    [a.timingNote, a.note, entry.monitoring.text].filter(Boolean).forEach(text => panel.append(node('p', text, 'interaction-clinical-note')));
    const presets = node('div', null, 'interaction-presets');
    a.presets.filter(value => C.isValidPercent(entry, value, state.context)).forEach(value => {
      const b = button(`${entry.adjustmentContext === 'START_ONLY' ? '+' : ''}${value}%`, () => { customMode = false; confirmed=null; handedOff=null; state.choose(value); renderAdjustment(); });
      b.dataset.percent = value; b.setAttribute('aria-pressed', String(!customMode && state.calculation?.percent === value));
      b.classList.toggle('active', !customMode && state.calculation?.percent === value); presets.append(b);
    });
    if (a.customAllowed) { const b = button('Custom', () => { confirmed=null; handedOff=null; customMode = true; state.choose(null); renderAdjustment(); $('interactionCustomPercent').focus(); });
      b.setAttribute('aria-pressed', String(customMode)); b.classList.toggle('active', customMode); presets.append(b); }
    panel.append(presets);
    if (customMode) {
      const label = node('label', `Custom adjustment (%) · documented range ${a.minPercent}–${a.maxPercent}%`); label.htmlFor = 'interactionCustomPercent';
      const input = node('input'); input.id = 'interactionCustomPercent'; input.type = 'number'; input.inputMode = 'decimal'; input.step = 'any'; input.min = a.minPercent; input.max = a.maxPercent;
      const error = node('p', '', 'error'); error.id = 'interactionPercentError'; error.setAttribute('role', 'status');
      input.addEventListener('input', () => {
        const value = input.value.trim() === '' ? null : Number(input.value);
        confirmed=null; handedOff=null; state.choose(value); error.textContent = value !== null && !C.isValidPercent(entry, value, state.context) ? `กรอกเปอร์เซ็นต์ในช่วง ${a.minPercent}–${a.maxPercent}%` : ''; renderCalculation();
      });
      panel.append(label, input, error);
    }
    const calc = node('div', null, 'stat'); calc.id = 'interactionCalculation'; calc.setAttribute('role', 'status');
    const open = button('Open in Dose Optimizer', () => {
      const calculation = state.calculation;
      if (!calculation || !C.canAdjust(state.entry, context()) || window.WarfarinDoseApp.getCurrent() !== calculation.current) { syncCurrent(); return; }
      showModule('dose');
      if (window.WarfarinDoseApp.openTarget(calculation.target, calculation.current)) handedOff = calculation;
    }, 'primary'); open.id = 'interactionOpenOptimizer';
    panel.append(calc, node('p', 'Dose Optimizer จะคำนวณสูตรยาที่จัดได้จริงและเปอร์เซ็นต์การเปลี่ยนแปลงจริง โดยใช้เฉพาะขนาดเม็ดยาที่อนุญาต', 'muted'), open,
      button('Cancel adjustment', () => { state.clear(); confirmed=null; handedOff=null; renderAdjustment(); refreshEmr(); }));
    renderCalculation();
  }
  function syncCurrent() {
    const value = window.WarfarinDoseApp.getCurrent();
    if (state.syncCurrent(value)) {
      confirmed=null; customMode = false;
      if (handedOff && value !== handedOff.current) {
        const previous = handedOff; handedOff = null;
        window.WarfarinDoseApp.clearInteractionTarget(previous.target);
      }
      const focused=document.activeElement?.id==='interactionAdjustmentCurrent',typed=focused?document.activeElement.value:null,caret=focused?document.activeElement.selectionStart:null;
      renderAdjustment();
      if(focused&&$('interactionAdjustmentCurrent')){$('interactionAdjustmentCurrent').value=typed;$('interactionAdjustmentCurrent').focus();$('interactionAdjustmentCurrent').setSelectionRange(caret,caret);}
    }
    if (document.activeElement !== $('interactionCurrent')) $('interactionCurrent').value = $('current').value;
  }
  $('interactionCurrent').addEventListener('input', () => {
    $('current').value = $('interactionCurrent').value;
    $('current').dispatchEvent(new Event('input', { bubbles: true }));
  });
  document.addEventListener('warfarin:current-dose-changed', syncCurrent);
  document.addEventListener('warfarin:case-reset', () => {
    state.clear(); state.syncCurrent(null); confirmed=null; customMode=false; handedOff=null; detailEntry=null;
    $('interactionSearch').value='';$('interactionCurrent').value='';
    $('interactionDetails').replaceChildren();$('interactionDetails').classList.add('hidden');
    $('interactionReview').classList.add('hidden');$('interactionReviewToggle').setAttribute('aria-expanded','false');
    renderAdjustment();renderResults();showModule('dose');
  });
  $('interactionSearch').addEventListener('input', () => {
    state.clear(); confirmed=null; handedOff=null; customMode = false; $('interactionDetails').classList.add('hidden'); renderAdjustment(); renderResults();
  });
  syncCurrent(); renderResults();
})();
