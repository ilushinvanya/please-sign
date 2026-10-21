import type { signatureStore } from '#lib/stores/signatureStore';
import { get } from 'svelte/store';

interface DrawingPoint {
	x: number;
	y: number;
	t: number;
}

export function drawingEngine(
	canvas: HTMLCanvasElement,
	wrapper: HTMLDivElement,
	store: typeof signatureStore
) {
	const DPR = window.devicePixelRatio || 1;
	const ctx = canvas.getContext('2d')!;

	let drawing = false;
	let enabled = true;
	let points: DrawingPoint[] = [];
	let lastMid: { x: number; y: number } | null = null;

	function resize() {
		const w = wrapper.clientWidth;
		const h = wrapper.clientHeight;
		canvas.width = Math.round(w * DPR);
		canvas.height = Math.round(h * DPR);
		ctx.scale(DPR, DPR);
		applyCtxDefaults();
	}

	function applyCtxDefaults() {
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.strokeStyle = '#111111';
	}

	function getXY(e: MouseEvent | TouchEvent, touch?: Touch) {
		const rect = canvas.getBoundingClientRect();
		return {
			x: (touch ? touch.clientX : (e as MouseEvent).clientX) - rect.left,
			y: (touch ? touch.clientY : (e as MouseEvent).clientY) - rect.top
		};
	}

	function calcWidth(force: number) {
		const state = get(store);
		if (force > 0) {
			const p = Math.max(0.3, Math.min(1.8, force * 2 + 0.4));
			return state.baseWidth * p;
		}
		return state.baseWidth;
	}

	function beginStroke(x: number, y: number, force: number) {
		if (!enabled) return;
		drawing = true;
		points = [{ x, y, t: Date.now() }];
		lastMid = { x, y };
		applyCtxDefaults();

		const w = calcWidth(force);
		store.beginStroke({ x, y, w, t: 0 });
	}

	function continueStroke(x: number, y: number, force: number) {
		if (!drawing) return;

		const w = calcWidth(force);
		const prev = points[points.length - 1];

		const mx = (prev.x + x) / 2;
		const my = (prev.y + y) / 2;

		ctx.lineWidth = w;
		ctx.beginPath();
		ctx.moveTo(lastMid!.x, lastMid!.y);
		ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
		ctx.stroke();

		lastMid = { x: mx, y: my };

		points.push({ x, y, t: Date.now() });
		if (points.length > 8) points.shift();

		const state = get(store);
		store.addPoint({ x, y, w, t: Date.now() - state.recordingStartTime });
	}

	function endStroke() {
		if (!drawing) return;
		if (lastMid && points.length > 0) {
			const last = points[points.length - 1];
			ctx.beginPath();
			ctx.moveTo(lastMid.x, lastMid.y);
			ctx.lineTo(last.x, last.y);
			ctx.stroke();
		}

		store.endStroke();

		drawing = false;
		points = [];
		lastMid = null;
	}

	// Touch events
	canvas.addEventListener(
		'touchstart',
		(e) => {
			e.preventDefault();
			const t = e.touches[0];
			const { x, y } = getXY(e, t);
			beginStroke(x, y, (t as any).force ?? 0);
		},
		{ passive: false }
	);

	canvas.addEventListener(
		'touchmove',
		(e) => {
			e.preventDefault();
			const t = e.touches[0];
			const { x, y } = getXY(e, t);
			continueStroke(x, y, (t as any).force ?? 0);
		},
		{ passive: false }
	);

	canvas.addEventListener(
		'touchend',
		(e) => {
			e.preventDefault();
			endStroke();
		},
		{ passive: false }
	);

	canvas.addEventListener(
		'touchcancel',
		(e) => {
			e.preventDefault();
			endStroke();
		},
		{ passive: false }
	);

	// Mouse events
	canvas.addEventListener('mousedown', (e) => {
		const { x, y } = getXY(e);
		beginStroke(x, y, 0);
	});

	canvas.addEventListener('mousemove', (e) => {
		if (!drawing) return;
		const { x, y } = getXY(e);
		continueStroke(x, y, 0);
	});

	canvas.addEventListener('mouseup', endStroke);
	canvas.addEventListener('mouseleave', endStroke);

	return {
		resize,
		getContext: () => ctx,
		getCanvas: () => canvas,
		applyCtxDefaults,
		setEnabled: (value: boolean) => {
			enabled = value;
			if (!value) endStroke();
		}
	};
}
