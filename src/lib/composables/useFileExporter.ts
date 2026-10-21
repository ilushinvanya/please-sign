import { _ } from 'svelte-i18n';

let t: any;
_.subscribe(value => t = value);

export interface ExportOptions {
	filename: string;
	onSuccess?: (message: string) => void;
	onError?: (error: Error) => void;
}

export function downloadBlob(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportPNG(
	canvas: HTMLCanvasElement,
	options: ExportOptions
) {
	try {
		const blob = await new Promise<Blob | null>((resolve) => {
			canvas.toBlob(resolve, 'image/png');
		});

		if (!blob) {
			throw new Error('Failed to create PNG blob');
		}

		downloadBlob(blob, options.filename);

		if (options.onSuccess) {
			options.onSuccess(t('toast.pngSaved'));
		}
	} catch (error) {
		if (options.onError) {
			options.onError(error as Error);
		}
		throw error;
	}
}

export function createCroppedCanvas(
	sourceCanvas: HTMLCanvasElement,
	cropBounds: { top: number; left: number; right: number; bottom: number },
	transparentBackground: boolean = false
): HTMLCanvasElement {
	const croppedW = sourceCanvas.width - cropBounds.left - cropBounds.right;
	const croppedH = sourceCanvas.height - cropBounds.top - cropBounds.bottom;

	const exportCanvas = document.createElement('canvas');
	exportCanvas.width = croppedW;
	exportCanvas.height = croppedH;
	const exportCtx = exportCanvas.getContext('2d')!;

	// Add white background if transparency is disabled
	if (!transparentBackground) {
		exportCtx.fillStyle = 'white';
		exportCtx.fillRect(0, 0, croppedW, croppedH);
	}

	// Copy cropped area from source canvas
	exportCtx.drawImage(
		sourceCanvas,
		cropBounds.left, cropBounds.top, croppedW, croppedH,
		0, 0, croppedW, croppedH
	);

	return exportCanvas;
}
