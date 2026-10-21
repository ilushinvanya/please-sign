import { get } from 'svelte/store';
import type { signatureStore } from '#lib/stores/signatureStore';
import { renderAllStrokes } from '#lib/composables/useStrokeRenderer';
import { downloadBlob } from '#lib/composables/useFileExporter';
import { _ } from 'svelte-i18n';

let t: any;
_.subscribe(value => t = value);

export interface CropBounds {
	top: number;
	left: number;
	right: number;
	bottom: number;
}

export async function saveAsGIFWithCrop(
	store: typeof signatureStore,
	sourceCanvas: HTMLCanvasElement,
	cropBounds: CropBounds,
	transparentBackground: boolean = false,
	loop: boolean = false,
	pauseBefore: number = 0,
	pauseAfter: number = 1,
	widthMultiplier: number = 1
) {
	const state = get(store);
	if (state.recordedStrokes.length === 0) return;

	try {
		const { GIFEncoder, quantize, applyPalette } = await import(
			'https://cdn.jsdelivr.net/npm/gifenc@1.0.3/dist/gifenc.esm.js'
		);

		const DPR = window.devicePixelRatio || 1;
		const croppedW = sourceCanvas.width - cropBounds.left - cropBounds.right;
		const croppedH = sourceCanvas.height - cropBounds.top - cropBounds.bottom;

		// Convert to logical pixels for rendering strokes
		const logicalCroppedW = croppedW / DPR;
		const logicalCroppedH = croppedH / DPR;
		const logicalCropLeft = cropBounds.left / DPR;
		const logicalCropTop = cropBounds.top / DPR;

		const gifCanvas = document.createElement('canvas');
		const scale = 1;
		gifCanvas.width = Math.round(logicalCroppedW * scale);
		gifCanvas.height = Math.round(logicalCroppedH * scale);
		const gifCtx = gifCanvas.getContext('2d')!;

		// Calculate max time
		let maxTime = 0;
		state.recordedStrokes.forEach((stroke) => {
			stroke.forEach((pt) => {
				if (pt.t > maxTime) maxTime = pt.t;
			});
		});

		const frameDelay = 33;
		const pauseBeforeMs = pauseBefore * 1000;
		const pauseAfterMs = pauseAfter * 1000;

		// Calculate frames for each phase
		const pauseBeforeFrames = Math.ceil(pauseBeforeMs / frameDelay);
		const animationFrames = Math.max(1, Math.ceil(maxTime / frameDelay));
		const pauseAfterFrames = loop ? Math.ceil(pauseAfterMs / frameDelay) : 0;
		const totalFrames = pauseBeforeFrames + animationFrames + pauseAfterFrames;

		const gif = GIFEncoder();
		const frames = [];

		for (let frame = 0; frame < totalFrames; frame++) {
			const currentTime = (frame - pauseBeforeFrames) * frameDelay;

			// Clear frame with white or transparent background
			if (transparentBackground) {
				gifCtx.clearRect(0, 0, gifCanvas.width, gifCanvas.height);
			} else {
				gifCtx.fillStyle = 'white';
				gifCtx.fillRect(0, 0, gifCanvas.width, gifCanvas.height);
			}

			// Only draw if we're past the pause before
			if (frame >= pauseBeforeFrames) {
				gifCtx.save();
				gifCtx.scale(scale, scale);
				gifCtx.translate(-logicalCropLeft, -logicalCropTop);

				const drawTime = frame >= pauseBeforeFrames + animationFrames ? Infinity : currentTime;
				renderAllStrokes(gifCtx, state.recordedStrokes, drawTime, 1, widthMultiplier);

				gifCtx.restore();
			}

			const imageData = gifCtx.getImageData(0, 0, gifCanvas.width, gifCanvas.height);
			frames.push(imageData);
		}

		const palette = quantize(frames[frames.length - 1].data, 256);

		frames.forEach((imageData) => {
			const index = applyPalette(imageData.data, palette);
			gif.writeFrame(index, gifCanvas.width, gifCanvas.height, {
				palette,
				delay: frameDelay,
				repeat: loop ? 0 : -1
			});
		});

		gif.finish();

		const blob = new Blob([gif.bytes()], { type: 'image/gif' });
		downloadBlob(blob, `signature_animation_${Date.now()}.gif`);

		store.showToast(t('toast.gifSaved'));
		setTimeout(() => store.hideToast(), 2200);
	} catch (error) {
		console.error('GIF generation error:', error);
		store.showToast(t('toast.gifError'));
		setTimeout(() => store.hideToast(), 2200);
	}
}

export function saveAsSVGWithCrop(
	store: typeof signatureStore,
	cropBounds: CropBounds,
	canvasWidth: number,
	canvasHeight: number,
	transparentBackground: boolean = false,
	animated: boolean = false,
	loop: boolean = false,
	pauseBefore: number = 0,
	pauseAfter: number = 1,
	widthMultiplier: number = 1
) {
	const state = get(store);
	if (state.recordedStrokes.length === 0) return;

	const DPR = window.devicePixelRatio || 1;

	// Convert physical pixels to logical pixels
	const logicalCanvasW = canvasWidth / DPR;
	const logicalCanvasH = canvasHeight / DPR;
	const logicalCropLeft = cropBounds.left / DPR;
	const logicalCropTop = cropBounds.top / DPR;
	const logicalCropRight = cropBounds.right / DPR;
	const logicalCropBottom = cropBounds.bottom / DPR;

	const croppedW = logicalCanvasW - logicalCropLeft - logicalCropRight;
	const croppedH = logicalCanvasH - logicalCropTop - logicalCropBottom;

	// Calculate total animation duration (only needed for animated)
	let maxTime = 0;
	let totalDuration = 0;
	let cycleTime = 0;

	if (animated) {
		state.recordedStrokes.forEach((stroke) => {
			stroke.forEach((pt) => {
				if (pt.t > maxTime) maxTime = pt.t;
			});
		});
		totalDuration = maxTime / 1000;
		cycleTime = totalDuration + pauseBefore + pauseAfter;
	}

	let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${croppedW}" height="${croppedH}" viewBox="0 0 ${croppedW} ${croppedH}">\n`;

	if (!transparentBackground) {
		svg += `  <rect width="100%" height="100%" fill="white"/>\n`;
	}

	svg += `  <g stroke="#111111" fill="none" stroke-linecap="round" stroke-linejoin="round" transform="translate(${-logicalCropLeft}, ${-logicalCropTop})">\n`;

	state.recordedStrokes.forEach((stroke) => {
		if (stroke.length < 2) return;

		let prevPoint = null;
		let lastMidSvg = null;

		for (let i = 0; i < stroke.length; i++) {
			const point = stroke[i];

			if (i === 0) {
				lastMidSvg = { x: point.x, y: point.y };
				prevPoint = point;
				continue;
			}

			const mx = (prevPoint.x + point.x) / 2;
			const my = (prevPoint.y + point.y) / 2;

			const dx1 = prevPoint.x - lastMidSvg.x;
			const dy1 = prevPoint.y - lastMidSvg.y;
			const dx2 = mx - prevPoint.x;
			const dy2 = my - prevPoint.y;
			const segmentLength = Math.sqrt(dx1 * dx1 + dy1 * dy1) + Math.sqrt(dx2 * dx2 + dy2 * dy2);

			if (segmentLength < 1.0) {
				lastMidSvg = { x: mx, y: my };
				prevPoint = point;
				continue;
			}

			const segmentPath = `M${lastMidSvg.x.toFixed(2)},${lastMidSvg.y.toFixed(2)} Q${prevPoint.x.toFixed(2)},${prevPoint.y.toFixed(2)} ${mx.toFixed(2)},${my.toFixed(2)}`;
			const adjustedWidth = point.w * widthMultiplier;

			if (animated) {
				// Анимированный SVG с stroke-dashoffset
				const segmentStart = (prevPoint.t / 1000) + pauseBefore;
				const segmentDuration = (point.t - prevPoint.t) / 1000;
				const dashValue = Math.ceil(segmentLength * 100) / 100;

				if (loop) {
					const drawStartRatio = segmentStart / cycleTime;
					const drawEndRatio = (segmentStart + segmentDuration) / cycleTime;
					const values = `${dashValue.toFixed(2)};${dashValue.toFixed(2)};0;0`;
					const keyTimes = `0;${drawStartRatio.toFixed(4)};${drawEndRatio.toFixed(4)};1`;

					svg += `    <path d="${segmentPath}" stroke-width="${adjustedWidth.toFixed(2)}" stroke-dasharray="${dashValue.toFixed(2)}">\n`;
					svg += `      <animate attributeName="stroke-dashoffset" values="${values}" keyTimes="${keyTimes}" dur="${cycleTime.toFixed(3)}s" repeatCount="indefinite"/>\n`;
					svg += `    </path>\n`;
				} else {
					svg += `    <path d="${segmentPath}" stroke-width="${adjustedWidth.toFixed(2)}" stroke-dasharray="${dashValue.toFixed(2)}" stroke-dashoffset="${dashValue.toFixed(2)}">\n`;
					svg += `      <animate attributeName="stroke-dashoffset" from="${dashValue.toFixed(2)}" to="0" begin="${segmentStart.toFixed(3)}s" dur="${segmentDuration.toFixed(3)}s" fill="freeze"/>\n`;
					svg += `    </path>\n`;
				}
			} else {
				// Статический SVG - просто path без анимации
				svg += `    <path d="${segmentPath}" stroke-width="${adjustedWidth.toFixed(2)}"/>\n`;
			}

			lastMidSvg = { x: mx, y: my };
			prevPoint = point;
		}

		// Final tail segment
		if (prevPoint && lastMidSvg && stroke.length > 1) {
			const lastPoint = stroke[stroke.length - 1];
			const dx = lastPoint.x - lastMidSvg.x;
			const dy = lastPoint.y - lastMidSvg.y;
			const tailLength = Math.sqrt(dx * dx + dy * dy);

			if (tailLength > 1.0) {
				const tailPath = `M${lastMidSvg.x.toFixed(2)},${lastMidSvg.y.toFixed(2)} L${lastPoint.x.toFixed(2)},${lastPoint.y.toFixed(2)}`;
				const adjustedWidth = lastPoint.w * widthMultiplier;

				if (animated) {
					const tailDashValue = Math.ceil(tailLength * 100) / 100;
					const tailStart = (lastPoint.t / 1000) + pauseBefore;
					const tailDuration = 0.016;

					if (loop) {
						const drawStartRatio = tailStart / cycleTime;
						const drawEndRatio = (tailStart + tailDuration) / cycleTime;
						const values = `${tailDashValue.toFixed(2)};${tailDashValue.toFixed(2)};0;0`;
						const keyTimes = `0;${drawStartRatio.toFixed(4)};${drawEndRatio.toFixed(4)};1`;

						svg += `    <path d="${tailPath}" stroke-width="${adjustedWidth.toFixed(2)}" stroke-dasharray="${tailDashValue.toFixed(2)}">\n`;
						svg += `      <animate attributeName="stroke-dashoffset" values="${values}" keyTimes="${keyTimes}" dur="${cycleTime.toFixed(3)}s" repeatCount="indefinite"/>\n`;
						svg += `    </path>\n`;
					} else {
						svg += `    <path d="${tailPath}" stroke-width="${adjustedWidth.toFixed(2)}" stroke-dasharray="${tailDashValue.toFixed(2)}" stroke-dashoffset="${tailDashValue.toFixed(2)}">\n`;
						svg += `      <animate attributeName="stroke-dashoffset" from="${tailDashValue.toFixed(2)}" to="0" begin="${tailStart.toFixed(3)}s" dur="0.016s" fill="freeze"/>\n`;
						svg += `    </path>\n`;
					}
				} else {
					// Статический хвостик
					svg += `    <path d="${tailPath}" stroke-width="${adjustedWidth.toFixed(2)}"/>\n`;
				}
			}
		}
	});

	svg += `  </g>\n`;
	svg += `</svg>`;

	const blob = new Blob([svg], { type: 'image/svg+xml' });
	const filename = animated ? `signature_animation_${Date.now()}.svg` : `signature_${Date.now()}.svg`;
	downloadBlob(blob, filename);

	const message = animated ? t('toast.svgAnimationSaved') : t('toast.svgSaved');
	store.showToast(message);
	setTimeout(() => store.hideToast(), 2200);
}
