import { get } from 'svelte/store';
import type { signatureStore } from '#lib/stores/signatureStore';
import { renderAllStrokes } from '#lib/composables/useStrokeRenderer';
import { downloadBlob } from '#lib/composables/useFileExporter';

export async function saveAsGIF(store: typeof signatureStore) {
	const DPR = window.devicePixelRatio || 1;
	const state = get(store);
	if (state.recordedStrokes.length === 0) return;

	try {
		// Dynamically import gifenc
		const { GIFEncoder, quantize, applyPalette } = await import(
			'https://cdn.jsdelivr.net/npm/gifenc@1.0.3/dist/gifenc.esm.js'
		);

		const canvas = document.querySelector('canvas');
		if (!canvas) return;

		// Get logical dimensions (CSS pixels)
		const logicalWidth = canvas.clientWidth;
		const logicalHeight = canvas.clientHeight;

		console.log('Canvas dimensions:', logicalWidth, 'x', logicalHeight);
		console.log('Strokes count:', state.recordedStrokes.length);

		// Create offscreen canvas for gif frames
		const gifCanvas = document.createElement('canvas');
		const scale = 0.5;
		gifCanvas.width = Math.round(logicalWidth * scale);
		gifCanvas.height = Math.round(logicalHeight * scale);
		const gifCtx = gifCanvas.getContext('2d')!;

		console.log('GIF canvas size:', gifCanvas.width, 'x', gifCanvas.height);

		// Calculate max time
		let maxTime = 0;
		state.recordedStrokes.forEach((stroke) => {
			stroke.forEach((pt) => {
				if (pt.t > maxTime) maxTime = pt.t;
			});
		});

		const frameDelay = 33;
		const totalFrames = Math.max(1, Math.ceil(maxTime / frameDelay));

		console.log('Max time:', maxTime, 'Total frames:', totalFrames);

		const gif = GIFEncoder();

		// Generate frames
		const frames = [];
		for (let frame = 0; frame <= totalFrames; frame++) {
			const currentTime = frame * frameDelay;

			// Clear frame
			gifCtx.fillStyle = 'white';
			gifCtx.fillRect(0, 0, gifCanvas.width, gifCanvas.height);
			gifCtx.save();
			gifCtx.scale(scale, scale);

			renderAllStrokes(gifCtx, state.recordedStrokes, currentTime, 1);

			gifCtx.restore();

			// Get image data
			const imageData = gifCtx.getImageData(0, 0, gifCanvas.width, gifCanvas.height);
			frames.push(imageData);
		}

		// Quantize colors using the last frame (most complete drawing)
		const palette = quantize(frames[frames.length - 1].data, 256);

		console.log('Palette created, colors:', palette.length / 3);

		// Write frames to GIF
		frames.forEach((imageData, idx) => {
			const index = applyPalette(imageData.data, palette);
			gif.writeFrame(index, gifCanvas.width, gifCanvas.height, {
				palette,
				delay: frameDelay
			});
		});

		gif.finish();

		// Create blob and download
		const blob = new Blob([gif.bytes()], { type: 'image/gif' });
		downloadBlob(blob, `signature_animation_${Date.now()}.gif`);

		store.showToast('GIF анимация сохранена');
		setTimeout(() => store.hideToast(), 2200);
	} catch (error) {
		console.error('GIF generation error:', error);
		store.showToast('Ошибка создания GIF');
		setTimeout(() => store.hideToast(), 2200);
	}
}
