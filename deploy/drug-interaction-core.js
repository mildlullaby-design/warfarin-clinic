(function (root) {
  'use strict';
  const normalize = value => String(value ?? '').normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  function createSearchIndex(entries) {
    const unique = new Map();
    entries.forEach(entry => { if (!unique.has(entry.id)) unique.set(entry.id, { entry,
      canonical: normalize(entry.canonicalName), terms: [entry.canonicalName, ...entry.generics, ...entry.aliases].map(normalize) }); });
    const records = [...unique.values()];
    return query => { const term = normalize(query);
      const score = record => !term ? 0 : record.canonical === term ? 0 : record.terms.includes(term) ? 1 : 2;
      return records.filter(record => !term || record.terms.some(name => name.includes(term)))
        .sort((a,b) => score(a)-score(b)).map(record => record.entry); };
  }
  function hasDocumentedAdjustment(entry) {
    const a = entry?.empiricAdjustment;
    return Boolean(a?.enabled === true && ['INCREASE', 'DECREASE'].includes(a.direction)
      && Number.isFinite(a.minPercent) && Number.isFinite(a.maxPercent)
      && a.minPercent >= 0 && a.maxPercent >= a.minPercent
      && Array.isArray(a.presets) && a.presets.every(value => Number.isFinite(value) && value >= a.minPercent && value <= a.maxPercent)
      && (a.direction !== 'DECREASE' || a.maxPercent <= 100));
  }
  function adjustmentApplies(entry, context) {
    const scope = entry?.empiricAdjustment?.appliesTo;
    // Structured scopes require an explicit exact regimen context. Broad group
    // names and partial/member matches cannot authorize a scoped calculation.
    return !Array.isArray(scope) || (normalize(context) !== '' && scope.some(name => normalize(name) === normalize(context)));
  }
  function canAdjust(entry, context) {
    const r = entry?.review;
    return Boolean(r?.imported === true && r.sourceChecked === true && r.clinicalReviewed === true
      && r.verifiedForApp === true && entry.optimizerIntegration?.enabled === true && hasDocumentedAdjustment(entry) && adjustmentApplies(entry, context));
  }
  function isValidPercent(entry, percent, context) {
    const a = entry?.empiricAdjustment;
    return canAdjust(entry, context) && Number.isFinite(percent) && percent >= a.minPercent && percent <= a.maxPercent
      && (a.customAllowed === true || a.presets.includes(percent));
  }
  function calculateTarget(entry, current, percent, context) {
    if (!Number.isFinite(current) || current <= 0 || !isValidPercent(entry, percent, context)) return null;
    const signedPercent = (entry.empiricAdjustment.direction === 'DECREASE' ? -1 : 1) * percent;
    const target = Number((current * (1 + signedPercent / 100)).toFixed(6));
    return Number.isFinite(target) ? { current, percent, signedPercent, target } : null;
  }
  function adjustmentLabel(entry, context) {
    if (!adjustmentApplies(entry, context)) return 'Adjustment not applicable to this search';
    if (!hasDocumentedAdjustment(entry)) return entry.direction === 'BLEEDING_RISK_UP' ? 'Monitor only · bleeding' : entry.monitoring?.required ? 'Monitor only · Monitor INR' : 'No numeric adjustment documented';
    const a = entry.empiricAdjustment;
    return `${entry.adjustmentContext === 'START_ONLY' ? 'When starting · may be required ' : 'Empiric '}${a.direction === 'DECREASE' ? '↓' : '↑'}${a.minPercent === a.maxPercent ? a.minPercent : `${a.minPercent}–${a.maxPercent}`}%`;
  }
  function createAdjustmentState() {
    let current = null, entry = null, calculation = null, context = null;
    return {
      syncCurrent(value) { const next = Number.isFinite(value) && value > 0 ? value : null;
        const changed = next !== current; current = next; if (changed) calculation = null; return changed; },
      select(value, selectedContext) { context = selectedContext; entry = canAdjust(value, context) ? value : null; calculation = null; },
      choose(percent) { calculation = calculateTarget(entry, current, percent, context); return calculation; },
      clear() { entry = null; calculation = null; context = null; },
      get context() { return context; },
      get current() { return current; }, get entry() { return entry; }, get calculation() { return calculation; }
    };
  }
  const api = { normalize, createSearchIndex, hasDocumentedAdjustment, adjustmentApplies, canAdjust, isValidPercent, calculateTarget, adjustmentLabel, createAdjustmentState };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.WarfarinInteractionCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
