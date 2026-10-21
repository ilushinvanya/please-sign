import type { Stroke } from '#lib/stores/signatureStore';

export interface RenderStrokeOptions {
	ctx: CanvasRenderingContext2D;
	stroke: Stroke;
	maxTime?: number;
	DPR?: number;
	widthMultiplier?: number;
}

export function renderStroke(options: RenderStrokeOptions) {
	const { ctx, stroke, maxTime = Infinity, DPR = 1, widthMultiplier = 1 } = options;

	if (stroke.length === 0) return;

	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	ctx.strokeStyle = '#111111';

	let prevPoint = null;
	let lastMid = null;

	for (let i = 0; i < stroke.length; i++) {
		const point = stroke[i];
		if (point.t > maxTime) break;

		if (i === 0) {
			lastMid = { x: point.x * DPR, y: point.y * DPR };
			prevPoint = point;
			continue;
		}

		const mx = (prevPoint.x + point.x) / 2 * DPR;
		const my = (prevPoint.y + point.y) / 2 * DPR;

		ctx.lineWidth = point.w * DPR * widthMultiplier;
		ctx.beginPath();
		ctx.moveTo(lastMid.x, lastMid.y);
		ctx.quadraticCurveTo(prevPoint.x * DPR, prevPoint.y * DPR, mx, my);
		ctx.stroke();

		lastMid = { x: mx, y: my };
		prevPoint = point;
	}

	// Final tail
	if (prevPoint && lastMid && prevPoint.t <= maxTime) {
		ctx.beginPath();
		ctx.moveTo(lastMid.x, lastMid.y);
		ctx.lineTo(prevPoint.x * DPR, prevPoint.y * DPR);
		ctx.stroke();
	}
}

export function renderAllStrokes(
	ctx: CanvasRenderingContext2D,
	strokes: Stroke[],
	maxTime: number = Infinity,
	DPR: number = 1,
	widthMultiplier: number = 1
) {
	for (const stroke of strokes) {
		renderStroke({ ctx, stroke, maxTime, DPR, widthMultiplier });
	}
}
