# Warfarin Clinic

A privacy-first, static, browser-based tool for clinician review in a Warfarin OPD clinic. It has no patient-data backend.

## Modules

- **Dose Optimizer** — weekly-dose arithmetic and tablet-strength-aware 7-day regimens; clinicians review all results.
- **Drug Interaction** — formulary/search data and HOSxP-friendly interaction notes.
- **Pre-op Planner** — elective perioperative Warfarin/Apixaban assessment with indication-specific thrombotic risk, physician-confirmed bridging, printable A4 relative-day calendar, and short OPD note.

The Pre-op calendar supports an optional **unknown operation date**. In this mode the printed dates are blank; the physician must fill in and verify hold/restart dates and bleeding/neuraxial timing before use. A printed plan is **not an automatic medication order**.

## Running the app

Open `index.html` from a static web server (HTTPS recommended for PWA/offline use). No build, database or API keys are required. Check local hospital IT/privacy policy before entering patient information on shared computers. Patient-specific Pre-op information is not persisted; hospital formulary preferences are saved in the browser.

The PWA service worker caches application assets for offline use; reload/accept the update banner after deploying a new release.

## Tests

The GitHub Actions workflow in `.github/workflows/preop-tests.yml` runs clinical engine, risk, DOM and extended Pre-op regression checks, plus syntax checks for existing modules.

For local development with Node.js 22:

```sh
node --test preop-core.test.cjs preop-risk.test.cjs
npm install --no-save --no-package-lock --ignore-scripts jsdom@26
node --test preop-dom.test.cjs
```

## Safety

For clinician use only. Assess procedure-specific bleeding risk, thromboembolic risk, renal function, drug dose, neuraxial requirements and postoperative hemostasis before acting. In particular, **VTE risk baseline and any prior-interruption clinical override are displayed separately; no automatic therapeutic LMWH bridging is authorized**. Follow your institution's protocols and current guidelines.
