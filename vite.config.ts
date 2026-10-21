import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
	base: './',
	plugins: [svelte()],
	resolve: {
		alias: {
			'#lib': '/src/lib'
		}
	},
	build: {
		rollupOptions: {
			input: {
				main: resolve(__dirname, 'index.html'),
				app: resolve(__dirname, 'app.html')
			}
		}
	}
});
