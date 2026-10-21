import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { initializePWAIcons } from './lib/utils/iconGenerator';
import { registerServiceWorker } from './lib/utils/serviceWorkerRegistration';
import eruda from 'eruda';

// Initialize Eruda for mobile debugging
if (import.meta.env.DEV || location.search.includes('eruda=true')) {
	eruda.init();
}

// Initialize dynamic PWA icons
initializePWAIcons();

// Register Service Worker
registerServiceWorker();

const app = mount(App, {
	target: document.getElementById('app')!
});

export default app;
