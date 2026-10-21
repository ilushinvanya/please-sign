<script lang="ts">
	import { onMount } from 'svelte';
	import { signatureStore } from '#lib/stores/signatureStore';
	import { drawingEngine } from '#lib/utils/drawingEngine';

	export let showCropOverlay = false;
	export let cropBounds = { top: 0, left: 0, right: 0, bottom: 0 };

	let canvasElement: HTMLCanvasElement;
	let wrapperElement: HTMLDivElement;
	let canvas: ReturnType<typeof drawingEngine>;
	let previewScale = 1;

	onMount(() => {
		canvas = drawingEngine(canvasElement, wrapperElement, signatureStore);
		canvas.resize();

		const handleResize = () => {
			canvas.resize();
			updatePreviewScale();
		};
		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
		};
	});

	$: if (showCropOverlay && canvasElement) {
		updatePreviewScale();
	}

	$: canvas?.setEnabled(!showCropOverlay);

	function updatePreviewScale() {
		if (!canvasElement || !wrapperElement) return;
		const rect = canvasElement.getBoundingClientRect();
		previewScale = rect.width / canvasElement.width;
	}
</script>

<div bind:this={wrapperElement} class="canvas-wrapper">
	<canvas bind:this={canvasElement} id="main-canvas" class:disabled={showCropOverlay}></canvas>

	{#if showCropOverlay}
		<div class="crop-overlay">
			<div class="crop-border crop-border-top" style="height: {cropBounds.top * previewScale}px"></div>
			<div class="crop-border crop-border-bottom" style="height: {cropBounds.bottom * previewScale}px"></div>
			<div class="crop-border crop-border-left" style="width: {cropBounds.left * previewScale}px"></div>
			<div class="crop-border crop-border-right" style="width: {cropBounds.right * previewScale}px"></div>
		</div>
	{/if}
</div>

<style>
	.canvas-wrapper {
		flex: 1;
		position: relative;
		background: white;
		overflow: hidden;
	}

	canvas {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		touch-action: none;
		cursor: crosshair;
	}

	canvas.disabled {
		cursor: not-allowed;
		pointer-events: none;
	}

	.crop-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		pointer-events: none;
	}

	.crop-border {
		position: absolute;
		background: rgba(0, 0, 0, 0.5);
		pointer-events: none;
	}

	.crop-border-top {
		top: 0;
		left: 0;
		right: 0;
	}

	.crop-border-bottom {
		bottom: 0;
		left: 0;
		right: 0;
	}

	.crop-border-left {
		top: 0;
		left: 0;
		bottom: 0;
	}

	.crop-border-right {
		top: 0;
		right: 0;
		bottom: 0;
	}

</style>
