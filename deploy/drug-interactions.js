/* Phase 1 only. Clinical review flags for these samples are supplied by the user.
 * Clinical facts are checked against the uploaded PDF, using 1-based PDF pages.
 * Brands and rifampicin are manual aliases, not claims made by the PDF. */
(function (root) {
  'use strict';
  const document = 'Warfarin Drug interaction_260112_170458.pdf';
  const reviewed = { imported: true, sourceChecked: true, clinicalReviewed: true, verifiedForApp: true };
  const notReviewed = { imported: true, sourceChecked: false, clinicalReviewed: false, verifiedForApp: false };

  // Future imports use these inactive defaults until the review workflow approves them.
  function createEntry(fields = {}) {
    const defaults = {
      id: '', canonicalName: '', generics: [], aliases: [], aliasSource: 'source',
      direction: 'UNKNOWN', severity: null, onset: null, offset: null,
      mechanism: null, management: null,
      empiricAdjustment: { enabled: false, direction: null, minPercent: null, maxPercent: null,
        presets: [], customAllowed: false, timingNote: null, note: null },
      monitoring: { required: false, text: null },
      optimizerIntegration: { enabled: false }, source: { document, page: null }
    };
    return { ...defaults, ...fields,
      empiricAdjustment: { ...defaults.empiricAdjustment, ...fields.empiricAdjustment },
      monitoring: { ...defaults.monitoring, ...fields.monitoring },
      optimizerIntegration: { ...defaults.optimizerIntegration, ...fields.optimizerIntegration },
      source: { ...defaults.source, ...fields.source }, review: { ...notReviewed, ...fields.review } };
  }
  function adjustment(direction, minPercent, maxPercent, presets, note = null, timingNote = null) {
    return { enabled: true, direction, minPercent, maxPercent, presets,
      customAllowed: true, timingNote, note };
  }
  function sample(fields) {
    const { page, ...clinicalFields } = fields;
    return createEntry({ aliasSource: 'manual', optimizerIntegration: { enabled: Boolean(fields.empiricAdjustment?.enabled) },
      ...clinicalFields, source: { document, page }, review: reviewed });
  }
  const entries = [
    sample({ id: 'metronidazole', canonicalName: 'Metronidazole', generics: ['metronidazole'], aliases: ['Flagyl'],
      direction: 'INR_UP', severity: 'Major', onset: '3–5 days', offset: '~2 days', page: 12,
      mechanism: 'Decrease in warfarin metabolism through CYP2C9 inhibition.',
      management: 'Monitor INR closely when starting or stopping metronidazole. AMS considers an empiric 25–40% warfarin dose reduction.',
      empiricAdjustment: adjustment('DECREASE', 25, 40, [25, 30, 35, 40]),
      monitoring: { required: true, text: 'Monitor INR closely when starting or stopping metronidazole.' } }),
    sample({ id: 'fluconazole', canonicalName: 'Fluconazole', generics: ['fluconazole'], aliases: ['Diflucan'],
      direction: 'INR_UP', severity: 'Major', onset: '2–3 days', offset: '7–10 days', page: 8,
      mechanism: 'Inhibition of warfarin metabolism via CYP2C9 and CYP3A4.',
      management: 'Monitor INR closely when starting or stopping fluconazole. Effects are more pronounced with reduced renal function due to reduced fluconazole clearance. AMS considers an empiric 25–30% reduction, with eventual reductions approaching 80%.',
      empiricAdjustment: adjustment('DECREASE', 25, 30, [25, 30], 'Source describes eventual reductions approaching 80%; this is not an initial empiric preset.'),
      monitoring: { required: true, text: 'Monitor INR closely when starting or stopping fluconazole; consider reduced renal function.' } }),
    sample({ id: 'rifampin', canonicalName: 'Rifampin', generics: ['rifampin'], aliases: ['rifampicin'],
      direction: 'INR_DOWN', severity: 'Moderate to severe', onset: '1–3 weeks', offset: '1–5 weeks', page: 15,
      mechanism: 'Induction of hepatic metabolism of warfarin.',
      management: 'Monitor INR carefully, at least weekly, when starting or stopping rifampin. AMS considers an initial empiric 25–50% increase, with further increases based on frequent INR monitoring (at least weekly). Some patients may require 2–3 times their regular weekly dose when rifampin is added.',
      empiricAdjustment: adjustment('INCREASE', 25, 50, [25, 30, 40, 50], 'Some patients may require 2–3 times their regular weekly dose; further changes depend on frequent INR monitoring.'),
      monitoring: { required: true, text: 'Monitor INR at least weekly when starting or stopping rifampin and during further adjustment.' } }),
    sample({ id: 'amiodarone', canonicalName: 'Amiodarone', generics: ['amiodarone'], aliases: ['Cordarone'],
      direction: 'INR_UP', severity: 'Moderate to severe', onset: '3–7 days; increases gradually over 2–4 weeks',
      offset: 'Slow decline over 4–12 weeks after stopping; ~90 days, possibly longer with prolonged therapy', page: 1,
      mechanism: 'Inhibition of warfarin metabolism. Amiodarone may also increase or reduce INR by inducing hyperthyroidism or hypothyroidism, respectively.',
      management: 'Monitor INR closely (weekly) when starting or stopping amiodarone. Loading doses can bring the interaction on sooner. AMS considers a 10–25% reduction 1 week after starting, anticipating eventual reductions up to 60%. The additional source note advises INR monitoring every 1–2 weeks during the first 12 weeks.',
      empiricAdjustment: adjustment('DECREASE', 10, 25, [10, 15, 20, 25], 'Further reduction may be needed over time; source describes eventual reductions up to 60%.', 'Consider reduction about 1 week after initiation; loading doses may cause an earlier interaction.'),
      monitoring: { required: true, text: 'Monitor INR closely (weekly) when starting or stopping. Additional source note: every 1–2 weeks during the first 12 weeks.' } }),
    sample({ id: 'ciprofloxacin', canonicalName: 'Ciprofloxacin', generics: ['ciprofloxacin'], aliases: ['Cipro'],
      direction: 'INR_UP', severity: 'Major', onset: '2–5 days', offset: '2–4 days', page: 4,
      mechanism: 'Unknown; possible CYP1A2 inhibition. Interaction is more prevalent among elderly patients taking multiple medications.',
      management: 'Monitor INR more frequently when starting or stopping ciprofloxacin. Most patients have an INR increase, but some experience no effect. AMS considers an empiric 10–15% reduction.',
      empiricAdjustment: adjustment('DECREASE', 10, 15, [10, 15]),
      monitoring: { required: true, text: 'Monitor INR more frequently when starting or stopping ciprofloxacin.' } }),
    sample({ id: 'levofloxacin', canonicalName: 'Levofloxacin', generics: ['levofloxacin'], aliases: ['Levaquin'],
      direction: 'INR_UP', severity: 'Major', onset: '3–5 days', offset: '5–10 days', page: 10,
      mechanism: 'Unknown; possible CYP1A2 inhibition. Clinically significant interaction is more common among elderly patients.',
      management: 'Monitor INR closely when starting or stopping levofloxacin. INR is affected by severity of illness. AMS considers an empiric 0–15% reduction.',
      empiricAdjustment: adjustment('DECREASE', 0, 15, [0, 5, 10, 15], 'Severity of illness may affect INR. Selecting 0% means no empiric change.'),
      monitoring: { required: true, text: 'Monitor INR closely when starting or stopping levofloxacin; consider illness severity.' } }),
    sample({ id: 'azithromycin', canonicalName: 'Azithromycin', generics: ['azithromycin'], aliases: ['Zithromax'],
      direction: 'INR_UP', severity: 'Major', onset: '3–7 days', offset: null, page: 2,
      mechanism: 'Possible decrease in warfarin metabolism; fever and decreased appetite may compound INR increases.',
      management: 'Effect is inconsistent. Monitor INR closely when starting or stopping azithromycin. AMS does not routinely reduce warfarin empirically unless other factors affect INR, such as fever or decreased appetite. No numeric empiric adjustment is documented. Offset is not reported in the source.',
      monitoring: { required: true, text: 'Monitor INR closely when starting or stopping; assess fever, decreased appetite, and other factors affecting INR.' } }),
    sample({ id: 'clopidogrel', canonicalName: 'Clopidogrel', generics: ['clopidogrel'], aliases: ['Plavix'],
      direction: 'BLEEDING_RISK_UP', severity: 'Severe', onset: '~2 hours for antiplatelet impact', offset: '3–7 days', page: 4,
      mechanism: 'Clopidogrel antiplatelet effects combined with warfarin anticoagulant effects impair clotting. No effect on INR is reported. Platelet aggregation is irreversibly inhibited for the platelet lifetime.',
      management: 'Monitor for bleeding. The source reports no INR effect and increased bleeding risk; no empiric warfarin adjustment is documented.',
      monitoring: { required: true, text: 'Monitor for bleeding.' } })
  ];
  // Freeze the reviewed sample records so UI consumers cannot change review flags.
  function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
  const imported = typeof module !== 'undefined' && module.exports ? require('./drug-interactions-imported') : root.WarfarinInteractionImport;
  const phase1Entries = freeze(entries);
  const phase1Ids = new Set(entries.map(e => e.id));
  const enriched = entries.map(e => {
    const source = imported.entries.find(x => x.id === e.id);
    return { ...source, ...e, importPhase: 1, source: { ...source.source, ...e.source },
      sourceRows: source.sourceRows, extractionUncertainties: source.extractionUncertainties,
      additionalEffects: source.additionalEffects, sourceEffect: source.sourceEffect };
  });
  const newEntries = imported.entries.filter(e => !phase1Ids.has(e.id));
  // Manual search aliases are separate from PDF group membership.
  const sulfonamides = newEntries.find(e => e.id === 'sulfonamides');
  sulfonamides.aliases = ['TMP-SMX', 'co-trimoxazole', 'Bactrim'];
  sulfonamides.aliasSource = 'manual';
  sulfonamides.manualAliasProvenance = 'TMP-SMX/co-trimoxazole: existing Phase 1 search fixtures. Bactrim: user-requested Phase 3 manual alias. These aliases are not PDF brand-name claims.';
  const clinical = typeof module !== 'undefined' && module.exports ? require('./drug-interaction-clinical-review') : root.WarfarinInteractionClinicalReview;
  const finalReview = typeof module !== 'undefined' && module.exports ? require('./drug-interaction-final-review') : root.WarfarinInteractionFinalReview;
  const api = { entries: freeze(finalReview.apply(clinical.apply([...enriched, ...newEntries]))), phase1Entries, createEntry,
    importMetadata: freeze({ document: imported.document, sha256: imported.sha256,
      pageCoverage: imported.pageCoverage, sourceRowCount: imported.sourceRowCount,
      uniqueRecordCount: imported.uniqueRecordCount, uncertainties: imported.uncertainties,
      duplicateNameConflicts: imported.duplicateNameConflicts, warningRecheck: imported.warningRecheck }) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.WarfarinInteractionData = api;
})(typeof window !== 'undefined' ? window : globalThis);
