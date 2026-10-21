import { get } from 'svelte/store';
import type { signatureStore } from '#lib/stores/signatureStore';
import { downloadBlob } from '#lib/composables/useFileExporter';

export function saveAsSVG(store: typeof signatureStore) {
	const DPR = window.devicePixelRatio || 1;
	const state = get(store);
	if (state.recordedStrokes.length === 0) return;

	const canvas = document.querySelector('canvas');
	if (!canvas) return;

	const w = canvas.width / DPR;
	const h = canvas.height / DPR;

	let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n`;
	svg += `  <rect width="100%" height="100%" fill="white"/>\n`;
	svg += `  <g stroke="#111111" fill="none" stroke-linecap="round" stroke-linejoin="round">\n`;

	state.recordedStrokes.forEach((stroke) => {
		if (stroke.length < 2) return;

		let prevPoint = null;
		let lastMidSvg = null;

		// Draw each segment as a separate path with its own timing
		for (let i = 0; i < stroke.length; i++) {
			const point = stroke[i];

			if (i === 0) {
				lastMidSvg = { x: point.x, y: point.y };
				prevPoint = point;
				continue;
			}

			// Calculate midpoint for this segment
			const mx = (prevPoint.x + point.x) / 2;
			const my = (prevPoint.y + point.y) / 2;

			// Calculate segment length
			const dx1 = prevPoint.x - lastMidSvg.x;
			const dy1 = prevPoint.y - lastMidSvg.y;
			const dx2 = mx - prevPoint.x;
			const dy2 = my - prevPoint.y;
			const segmentLength = Math.sqrt(dx1 * dx1 + dy1 * dy1) + Math.sqrt(dx2 * dx2 + dy2 * dy2);

			// Skip very short segments (likely stationary points)
			if (segmentLength < 1.0) {
				lastMidSvg = { x: mx, y: my };
				prevPoint = point;
				continue;
			}

			// Build path for this segment
			let segmentPath = `M${lastMidSvg.x.toFixed(2)},${lastMidSvg.y.toFixed(2)} `;
			segmentPath += `Q${prevPoint.x.toFixed(2)},${prevPoint.y.toFixed(2)} ${mx.toFixed(2)},${my.toFixed(2)}`;

			// Timing for this specific segment
			const segmentStart = prevPoint.t;
			const segmentDuration = point.t - prevPoint.t;

			// Create animated path segment
			// Round up to avoid floating-point precision issues that cause dots at path end
			const dashValue = Math.ceil(segmentLength * 100) / 100;
			svg += `    <path d="${segmentPath}" stroke-width="${point.w.toFixed(2)}" stroke-dasharray="${dashValue.toFixed(2)}" stroke-dashoffset="${dashValue.toFixed(2)}">\n`;
			svg += `      <animate attributeName="stroke-dashoffset" from="${dashValue.toFixed(2)}" to="0" begin="${(segmentStart / 1000).toFixed(3)}s" dur="${(segmentDuration / 1000).toFixed(3)}s" fill="freeze"/>\n`;
			svg += `    </path>\n`;

			lastMidSvg = { x: mx, y: my };
			prevPoint = point;
		}

		// Final tail segment
		if (prevPoint && lastMidSvg && stroke.length > 1) {
			const lastPoint = stroke[stroke.length - 1];
			const dx = lastPoint.x - lastMidSvg.x;
			const dy = lastPoint.y - lastMidSvg.y;
			const tailLength = Math.sqrt(dx * dx + dy * dy);

			// Only draw tail if it's long enough
			if (tailLength > 1.0) {
				// Round up to avoid floating-point precision issues that cause dots at path end
				const tailDashValue = Math.ceil(tailLength * 100) / 100;
				const tailPath = `M${lastMidSvg.x.toFixed(2)},${lastMidSvg.y.toFixed(2)} L${lastPoint.x.toFixed(2)},${lastPoint.y.toFixed(2)}`;
				svg += `    <path d="${tailPath}" stroke-width="${lastPoint.w.toFixed(2)}" stroke-dasharray="${tailDashValue.toFixed(2)}" stroke-dashoffset="${tailDashValue.toFixed(2)}">\n`;
				svg += `      <animate attributeName="stroke-dashoffset" from="${tailDashValue.toFixed(2)}" to="0" begin="${(lastPoint.t / 1000).toFixed(3)}s" dur="0.016s" fill="freeze"/>\n`;
				svg += `    </path>\n`;
			}
		}
	});

	svg += `  </g>\n`;
	svg += `</svg>`;

	const blob = new Blob([svg], { type: 'image/svg+xml' });
	downloadBlob(blob, `signature_animation_${Date.now()}.svg`);

	store.showToast('SVG анимация сохранена');
	setTimeout(() => store.hideToast(), 2200);
}
