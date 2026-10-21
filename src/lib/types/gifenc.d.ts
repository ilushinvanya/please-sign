// Type definitions for gifenc module
declare module 'https://cdn.jsdelivr.net/npm/gifenc@1.0.3/dist/gifenc.esm.js' {
	export function GIFEncoder(): {
		writeFrame(
			index: Uint8Array,
			width: number,
			height: number,
			options: { palette: number[][]; delay: number }
		): void;
		finish(): void;
		bytes(): Uint8Array;
	};

	export function quantize(data: Uint8ClampedArray, maxColors: number): number[][];

	export function applyPalette(data: Uint8ClampedArray, palette: number[][]): Uint8Array;
}
