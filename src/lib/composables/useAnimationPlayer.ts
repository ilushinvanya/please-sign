import { get } from 'svelte/store';
import type { signatureStore } from '#lib/stores/signatureStore';

interface AnimationPlayerOptions {
	canvas: HTMLCanvasElement;
	store: typeof signatureStore;
	pauseBefore?: number;
	pauseAfter?: number;
	loop?: boolean;
	onStop?: () => void;
	widthMultiplier?: number;
}

export function createAnimationPlayer(options: AnimationPlayerOptions) {
	const { canvas, store, pauseBefore = 0, pauseAfter = 1, loop = false, onStop, widthMultiplier = 1 } = options;
	let isPlaying = false;
	let shouldStop = false;

	async function play() {
		if (isPlaying) return;

		const state = get(store);
		if (state.recordedStrokes.length === 0) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		isPlaying = true;
		shouldStop = false;

		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Pause before animation starts
		if (pauseBefore > 0) {
			await new Promise(resolve => setTimeout(resolve, pauseBefore * 1000));
			if (shouldStop) {
				isPlaying = false;
				return;
			}
		}

		const startTime = Date.now();

		// Draw animation frame by frame
		for (const stroke of state.recordedStrokes) {
			if (stroke.length === 0) continue;

			let prevPoint = null;
			let lastMidReplay = null;

			for (let i = 0; i < stroke.length; i++) {
				const point = stroke[i];

				// Wait until the recorded time
				const targetTime = startTime + point.t;
				const waitTime = targetTime - Date.now();
				if (waitTime > 0) {
					await new Promise(resolve => setTimeout(resolve, waitTime));
				}

				// Stop if requested
				if (shouldStop) {
					isPlaying = false;
					return;
				}

				ctx.lineCap = 'round';
				ctx.lineJoin = 'round';
				ctx.strokeStyle = '#111111';

				if (i === 0) {
					// Canvas context is already scaled by DPR in drawingEngine, so use logical coordinates
					lastMidReplay = { x: point.x, y: point.y };
					prevPoint = point;
					continue;
				}

				const mx = (prevPoint.x + point.x) / 2;
				const my = (prevPoint.y + point.y) / 2;

				ctx.lineWidth = point.w * widthMultiplier;
				ctx.beginPath();
				ctx.moveTo(lastMidReplay.x, lastMidReplay.y);
				ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, mx, my);
				ctx.stroke();

				lastMidReplay = { x: mx, y: my };
				prevPoint = point;
			}

			// Final tail
			if (prevPoint && lastMidReplay) {
				ctx.beginPath();
				ctx.moveTo(lastMidReplay.x, lastMidReplay.y);
				ctx.lineTo(prevPoint.x, prevPoint.y);
				ctx.stroke();
			}
		}

		// Pause after animation ends
		if (loop && pauseAfter > 0 && !shouldStop) {
			await new Promise(resolve => setTimeout(resolve, pauseAfter * 1000));
		}

		isPlaying = false;

		// Loop if enabled
		if (loop && !shouldStop) {
			play();
		} else if (onStop) {
			onStop();
		}
	}

	function stop() {
		shouldStop = true;
		isPlaying = false;
	}

	return {
		play,
		stop,
		get isPlaying() {
			return isPlaying;
		}
	};
}
