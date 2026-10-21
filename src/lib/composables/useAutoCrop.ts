import type { Stroke } from '#lib/stores/signatureStore';

export interface CropBounds {
	top: number;
	left: number;
	right: number;
	bottom: number;
}

export interface AutoCropOptions {
	/** Ширина канваса в физических пикселях (canvas.width). */
	canvasWidth: number;
	/** Высота канваса в физических пикселях (canvas.height). */
	canvasHeight: number;
	/** devicePixelRatio, использованный при записи точек (логические -> физические px). */
	DPR?: number;
	/** Дополнительный отступ вокруг рисунка в физических пикселях. */
	padding?: number;
}

/**
 * Вычисляет минимальный прямоугольник (в физических пикселях канваса),
 * который охватывает весь нарисованный рисунок, по записанным штрихам.
 * Учитывает толщину линии точек, чтобы не срезать края штрихов.
 * Возвращает отступы от краёв канваса (top/left/right/bottom), совместимые
 * с форматом cropBounds, используемым в приложении.
 */
export function computeAutoCropBounds(
	strokes: Stroke[],
	options: AutoCropOptions
): CropBounds {
	const { canvasWidth, canvasHeight, DPR = 1, padding = 10 } = options;

	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

	for (const stroke of strokes) {
		for (const point of stroke) {
			const halfWidth = (point.w ?? 0) / 2;
			minX = Math.min(minX, point.x - halfWidth);
			maxX = Math.max(maxX, point.x + halfWidth);
			minY = Math.min(minY, point.y - halfWidth);
			maxY = Math.max(maxY, point.y + halfWidth);
		}
	}

	// Нет штрихов — область рисунка не определена, кадрировать нечего.
	if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
		return { top: 0, left: 0, right: 0, bottom: 0 };
	}

	// Логические координаты -> физические пиксели канваса.
	let left = minX * DPR - padding;
	let top = minY * DPR - padding;
	let right = canvasWidth - (maxX * DPR + padding);
	let bottom = canvasHeight - (maxY * DPR + padding);

	// Не даём отступам выходить за пределы канваса или пересекаться друг с другом.
	left = Math.max(0, Math.min(left, canvasWidth));
	top = Math.max(0, Math.min(top, canvasHeight));
	right = Math.max(0, Math.min(right, canvasWidth - left));
	bottom = Math.max(0, Math.min(bottom, canvasHeight - top));

	return { top, left, right, bottom };
}
