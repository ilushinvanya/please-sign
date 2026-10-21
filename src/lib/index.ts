// place files you want to import through the `#lib` alias in this folder.

// Export PWA icon generation utilities
export {
  initializePWAIcons,
  updateManifestIcons,
  updateManifestIconsFromCanvas,
  generateIcon,
  generateIconDataURL,
  createIconFromCanvas
} from './utils/iconGenerator';

// Export Service Worker utilities
export {
  registerServiceWorker,
  unregisterServiceWorker,
  isServiceWorkerSupported
} from './utils/serviceWorkerRegistration';

