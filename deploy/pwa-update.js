(function () {
  'use strict';

  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;

  window.addEventListener('load', async () => {
    let refreshing = false;
    const banner = document.getElementById('updateBanner');
    const button = document.getElementById('updateApp');

    function showUpdate(registration) {
      if (!registration.waiting || !navigator.serviceWorker.controller) return;
      banner.classList.remove('hidden');
      button.onclick = () => {
        refreshing = true;
        button.disabled = true;
        button.textContent = 'กำลังอัปเดต…';
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      };
    }

    try {
      const registration = await navigator.serviceWorker.register('./service-worker.js', {
        updateViaCache: 'none'
      });
      showUpdate(registration);

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed') showUpdate(registration);
        });
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) location.reload();
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update();
      });
    } catch {
      // The dose module remains usable if service-worker registration is unavailable.
    }
  });
})();
