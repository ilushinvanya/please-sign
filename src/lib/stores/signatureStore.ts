import { writable } from 'svelte/store';

export interface Point {
	x: number;
	y: number;
	w: number;
	t: number;
}

export type Stroke = Point[];

interface SignatureState {
	recordedStrokes: Stroke[];
	currentStroke: Stroke;
	recordingStartTime: number;
	baseWidth: number;
	isReplaying: boolean;
	toastMessage: string;
	toastVisible: boolean;
}

const initialState: SignatureState = {
	recordedStrokes: [],
	currentStroke: [],
	recordingStartTime: 0,
	baseWidth: 1.5,
	isReplaying: false,
	toastMessage: 'Подпись сохранена',
	toastVisible: false
};

function createSignatureStore() {
	const { subscribe, set, update } = writable<SignatureState>(initialState);

	return {
		subscribe,
		setBaseWidth: (width: number) => update(state => ({ ...state, baseWidth: width })),
		beginStroke: (point: Point) => update(state => {
			if (state.recordedStrokes.length === 0) {
				return {
					...state,
					recordingStartTime: Date.now(),
					currentStroke: [{ ...point, t: 0 }]
				};
			}
			return {
				...state,
				currentStroke: [{ ...point, t: Date.now() - state.recordingStartTime }]
			};
		}),
		addPoint: (point: Point) => update(state => ({
			...state,
			currentStroke: [...state.currentStroke, point]
		})),
		endStroke: () => update(state => {
			if (state.currentStroke.length === 0) return state;
			return {
				...state,
				recordedStrokes: [...state.recordedStrokes, [...state.currentStroke]],
				currentStroke: []
			};
		}),
		clear: () => set(initialState),
		setReplaying: (isReplaying: boolean) => update(state => ({ ...state, isReplaying })),
		showToast: (message: string) => update(state => ({
			...state,
			toastMessage: message,
			toastVisible: true
		})),
		hideToast: () => update(state => ({ ...state, toastVisible: false }))
	};
}

export const signatureStore = createSignatureStore();
