/**
 * Service Worker registration utility
 */

/**
 * Registers the service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker is not supported in this browser');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('./sw.js');

    console.log('Service Worker registered successfully:', registration.scope);

    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('New Service Worker available');
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Unregisters all service workers (useful for development)
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
    console.log('All Service Workers unregistered');
    return true;
  } catch (error) {
    console.error('Failed to unregister Service Workers:', error);
    return false;
  }
}

/**
 * Checks if Service Worker is supported
 */
export function isServiceWorkerSupported(): boolean {
  return 'serviceWorker' in navigator;
}
