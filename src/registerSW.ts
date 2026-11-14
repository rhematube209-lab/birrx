import {Capacitor} from '@capacitor/core';
export function registerServiceWorker() {
  if(Capacitor.isNativePlatform()||import.meta.env.DEV){
    if('serviceWorker' in navigator)void navigator.serviceWorker.getRegistrations().then(registrations=>Promise.all(registrations.filter(r=>r.active?.scriptURL===location.origin+'/sw.js').map(r=>r.unregister()))).catch(()=>{});
    return;
  }
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
