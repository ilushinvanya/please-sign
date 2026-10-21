<script lang="ts">
	import Canvas from '#lib/components/Canvas.svelte';
	import Toast from '#lib/components/Toast.svelte';
	import SaveFooter from '#lib/components/SaveFooter.svelte';
	import { signatureStore } from '#lib/stores/signatureStore';
	import { get } from 'svelte/store';
	import { computeAutoCropBounds } from '#lib/composables/useAutoCrop';
	import '#lib/i18n';
	import { _, isLoading } from 'svelte-i18n';

	let showSaveMode = false;
	let cropBounds = { top: 0, left: 0, right: 0, bottom: 0 };
	let canvasWidth = 0;
	let canvasHeight = 0;

	function handleSaveClick() {
		const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
		if (canvas) {
			canvasWidth = canvas.width;
			canvasHeight = canvas.height;

			const DPR = window.devicePixelRatio || 1;
			const { recordedStrokes } = get(signatureStore);
			cropBounds = computeAutoCropBounds(recordedStrokes, {
				canvasWidth,
				canvasHeight,
				DPR
			});
		}
		showSaveMode = true;
	}

	function handleCloseSaveMode() {
		showSaveMode = false;
	}

	function handleClear() {
		const canvas = document.querySelector('canvas');
		if (canvas) {
			const ctx = canvas.getContext('2d')!;
			const DPR = window.devicePixelRatio || 1;
			const w = canvas.width / DPR;
			const h = canvas.height / DPR;
			ctx.clearRect(0, 0, w, h);
		}
		signatureStore.clear();
	}
</script>

<svelte:head>
	{#if !$isLoading}
		<title>{$_('app.title')}</title>
	{/if}
</svelte:head>

{#if !$isLoading}
	<div class="app-container">
		<Canvas showCropOverlay={showSaveMode} cropBounds={cropBounds} />
		<Toast />

		<!-- Нижний футер с кнопками -->
		<div class="bottom-footer" class:hidden={showSaveMode}>
			<button class="btn-clear" on:click={handleClear}>{$_('buttons.clear')}</button>
			<button class="btn-save" on:click={handleSaveClick}>{$_('buttons.save')}</button>
		</div>

		<SaveFooter
			isOpen={showSaveMode}
			onClose={handleCloseSaveMode}
			cropBounds={cropBounds}
			canvasWidth={canvasWidth}
			canvasHeight={canvasHeight}
		/>
	</div>
{/if}

<style>
	.app-container {
		display: flex;
		flex-direction: column;
		height: 100dvh;
		width: 100%;
		position: relative;
	}

	.bottom-footer {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 10px;
		padding: 14px 20px;
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(10px);
		border-top: 1px solid #e5e5e5;
		z-index: 50;
		transition: transform 0.3s ease-out, opacity 0.3s ease-out;
	}

	.bottom-footer.hidden {
		transform: translateY(100%);
		opacity: 0;
		pointer-events: none;
	}

	.btn-clear {
		background: transparent;
		border: 1px solid #ddd;
		padding: 10px 20px;
		border-radius: 10px;
		font-size: 15px;
		cursor: pointer;
		color: #555;
		font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
		font-weight: 500;
	}
	.btn-clear:active {
		background: #f5f5f5;
	}

	.btn-save {
		background: linear-gradient(to bottom, #3b6dff 0%, #2854d9 100%);
		color: white;
		border: none;
		padding: 10px 24px;
		border-radius: 10px;
		font-size: 15px;
		font-weight: 600;
		cursor: pointer;
		font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
		box-shadow:
			inset 0 1px 1px rgba(255, 255, 255, 0.5),
			inset 0 -1px 2px rgba(0, 0, 0, 0.2),
			0 1px 2px rgba(40, 84, 217, 0.4),
			0 2px 4px rgba(0, 0, 0, 0.15);
		text-shadow: 0 -1px 0 rgba(0, 0, 0, 0.25);
		transition: transform 0.1s ease, box-shadow 0.1s ease, background 0.15s ease;
	}
	.btn-save:hover {
		background: linear-gradient(to bottom, #4b7aff 0%, #2854d9 100%);
	}
	.btn-save:active {
		transform: scale(0.96);
		background: linear-gradient(to bottom, #2854d9 0%, #1f44b8 100%);
		box-shadow:
			inset 0 1px 2px rgba(0, 0, 0, 0.3),
			0 1px 1px rgba(0, 0, 0, 0.1);
	}
</style>
