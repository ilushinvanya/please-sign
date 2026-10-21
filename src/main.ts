import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { initializePWAIcons } from './lib/utils/iconGenerator';
import { registerServiceWorker } from './lib/utils/serviceWorkerRegistration';

// Initialize dynamic PWA icons
initializePWAIcons();

// Register Service Worker
registerServiceWorker();

const app = mount(App, {
	target: document.getElementById('app')!
});

export default app;
