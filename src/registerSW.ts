export function registerServiceWorker() {
  if ('serviceWorker' in navigator && typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          registration.onupdatefound = () => {
            const installing = registration.installing;
            if (installing) {
              installing.onstatechange = () => {
                if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                  window.dispatchEvent(new CustomEvent('birrx-sw-updated'));
                }
              };
            }
          };
        })
        .catch((error) => {
          console.warn('ServiceWorker registration failed: ', error);
        });
    });
  }
}
