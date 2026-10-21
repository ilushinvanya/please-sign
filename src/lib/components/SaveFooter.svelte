<script lang="ts">
	import { signatureStore } from '#lib/stores/signatureStore';
	import { get } from 'svelte/store';
	import { saveAsGIFWithCrop, saveAsSVGWithCrop } from '#lib/utils/cropExporter';
	import { createAnimationPlayer } from '#lib/composables/useAnimationPlayer';
	import { renderAllStrokes } from '#lib/composables/useStrokeRenderer';
	import { createCroppedCanvas, exportPNG as exportPNGFile } from '#lib/composables/useFileExporter';
	import { _ } from 'svelte-i18n';
	import { onMount, onDestroy } from 'svelte';

	export let isOpen = false;
	export let onClose: () => void;
	export let cropBounds: { top: number; left: number; right: number; bottom: number };

	let transparentBackground = false;
	let showAnimation = false;
	let loopAnimation = false;
	let pauseBefore = 0;
	let pauseAfter = 1;
	let lineWidth = 1.5;
	let originalBaseWidth = 1.5;
	let canSaveAnimations = false;
	let animationPlayer: ReturnType<typeof createAnimationPlayer> | null = null;
	let saving = false;
	let isLandscape = false;

	function checkOrientation() {
		isLandscape = window.innerWidth > window.innerHeight;
	}

	onMount(() => {
		checkOrientation();
		window.addEventListener('resize', checkOrientation);
	});

	onDestroy(() => {
		window.removeEventListener('resize', checkOrientation);
	});

	$: if (isOpen) {
		const state = get(signatureStore);
		canSaveAnimations = state.recordedStrokes.length > 0;
		// Сохраняем оригинальную ширину только при открытии
		if (originalBaseWidth === 1.5) {
			originalBaseWidth = state.baseWidth;
			lineWidth = state.baseWidth;
		}
	}

	// При изменении толщины линии - перерисовываем canvas
	$: if (isOpen && lineWidth !== undefined) {
		redrawWithNewWidth();
	}

	function redrawWithNewWidth() {
		const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const state = get(signatureStore);
		const widthMultiplier = lineWidth / originalBaseWidth;

		// Очищаем canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Перерисовываем все штрихи с новым множителем толщины
		renderAllStrokes(ctx, state.recordedStrokes, Infinity, 1, widthMultiplier);
	}

	// Перезапускаем анимацию при изменении параметров паузы или повтора
	$: if (showAnimation && canSaveAnimations && isOpen) {
		const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
		if (canvas) {
			// Останавливаем старый плеер если он есть
			if (animationPlayer) {
				animationPlayer.stop();
			}
			// Создаём новый с актуальными параметрами
			const widthMultiplier = lineWidth / originalBaseWidth;
			animationPlayer = createAnimationPlayer({
				canvas,
				store: signatureStore,
				pauseBefore,
				pauseAfter,
				loop: loopAnimation,
				widthMultiplier
			});
			animationPlayer.play();
		}
	} else if (!showAnimation && animationPlayer) {
		animationPlayer.stop();
		animationPlayer = null;
		drawFinalFrame();
	}

	function handleCancel() {
		if (animationPlayer) {
			animationPlayer.stop();
			animationPlayer = null;
		}

		const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
		if (canvas) {
			const ctx = canvas.getContext('2d');
			ctx?.clearRect(0, 0, canvas.width, canvas.height);
		}
		signatureStore.clear();
		onClose();
	}

	function drawFinalFrame() {
		const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const state = get(signatureStore);

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		// Canvas context is already scaled by DPR in drawingEngine, so use DPR=1
		renderAllStrokes(ctx, state.recordedStrokes, Infinity, 1);
	}

	async function exportPNG() {
		const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
		if (!canvas) return;

		saving = true;

		const DPR = window.devicePixelRatio || 1;

		// Создаём временный canvas с новой толщиной для экспорта
		const tempCanvas = document.createElement('canvas');
		tempCanvas.width = canvas.width;
		tempCanvas.height = canvas.height;
		const tempCtx = tempCanvas.getContext('2d')!;

		const state = get(signatureStore);
		const widthMultiplier = lineWidth / originalBaseWidth;

		// Рисуем с обновлённой толщиной и правильным DPR
		renderAllStrokes(tempCtx, state.recordedStrokes, Infinity, DPR, widthMultiplier);

		const croppedCanvas = createCroppedCanvas(tempCanvas, cropBounds, transparentBackground);

		await exportPNGFile(croppedCanvas, {
			filename: `signature_${Date.now()}.png`,
			onSuccess: (message) => {
				signatureStore.showToast(message);
				setTimeout(() => signatureStore.hideToast(), 2200);
			}
		});

		saving = false;
	}

	async function exportGIF() {
		const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
		if (!canvas) return;

		saving = true;
		const widthMultiplier = lineWidth / originalBaseWidth;
		await saveAsGIFWithCrop(signatureStore, canvas, cropBounds, transparentBackground, loopAnimation, pauseBefore, pauseAfter, widthMultiplier);
		saving = false;
	}

	async function exportSVG() {
		const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
		if (!canvas) return;

		saving = true;
		const widthMultiplier = lineWidth / originalBaseWidth;
		saveAsSVGWithCrop(signatureStore, cropBounds, canvas.width, canvas.height, transparentBackground, showAnimation, loopAnimation, pauseBefore, pauseAfter, widthMultiplier);
		saving = false;
	}
</script>

<div class="footer-container" class:open={isOpen} class:landscape={isLandscape}>
	<div class="footer-content">
		<div class="options">
			<label class="option-row">
				<span class="option-title">{$_('footer.transparentBackground')}</span>
				<input class="ios-switch" type="checkbox" bind:checked={transparentBackground} />
			</label>
			<label class="option-row range-row">
				<span class="option-title">{$_('footer.lineWidth')}</span>
				<span class="option-value">{lineWidth.toFixed(1)}</span>
				<input type="range" min="0.5" max="5" step="0.1" bind:value={lineWidth} />
			</label>
			<label class="option-row">
				<span class="option-title">{$_('footer.animation')}</span>
				<input class="ios-switch" type="checkbox" bind:checked={showAnimation} />
			</label>
			{#if showAnimation}
				<label class="option-row range-row">
					<span class="option-title">{$_('footer.pauseBefore')}</span>
					<span class="option-value">{pauseBefore} {$_('units.seconds')}</span>
					<input type="range" min="0" max="5" step="0.5" bind:value={pauseBefore} />
				</label>
			{/if}
			{#if showAnimation}
				<label class="option-row">
					<span class="option-title">{$_('footer.loop')}</span>
					<input class="ios-switch" type="checkbox" bind:checked={loopAnimation} />
				</label>
				{#if loopAnimation}
					<label class="option-row range-row">
						<span class="option-title">{$_('footer.pauseAfter')}</span>
						<span class="option-value">{pauseAfter} {$_('units.seconds')}</span>
						<input type="range" min="0" max="5" step="0.5" bind:value={pauseAfter} />
					</label>
				{/if}
			{/if}
		</div>

		<div class="footer-actions">
			<div>
				{#if !showAnimation}
					<button class="export-btn export-png" on:click={exportPNG} disabled={saving}>{$_('formats.png')}</button>
					<button class="export-btn export-svg" on:click={exportSVG} disabled={saving}>{$_('formats.svg')}</button>
				{/if}
				{#if showAnimation}
					<button class="export-btn export-gif" on:click={exportGIF} disabled={saving}>{$_('formats.gif')}</button>
					<button class="export-btn export-svg" on:click={exportSVG} disabled={saving}>{$_('formats.svg')}</button>
				{/if}
			</div>
			<button class="cancel-btn" on:click={handleCancel} disabled={saving}>{$_('buttons.cancel')}</button>
		</div>
	</div>
</div>

<style>
	.footer-container {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: white;
		border-top: 1px solid #e5e5e5;
		box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
		transform: translateY(100%);
		transition: transform 0.3s ease-out;
		z-index: 100;
	}

	/* Landscape режим - футер выезжает справа */
	.footer-container.landscape {
		top: 0;
		bottom: 0;
		left: auto;
		right: 0;
		width: 400px;
		max-width: 90vw;
		border-top: none;
		border-left: 1px solid #e5e5e5;
		box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
		transform: translateX(100%);
		overflow-y: auto;
	}

	.footer-container.open {
		transform: translateY(0);
	}

	.footer-container.landscape.open {
		transform: translateX(0);
	}

	.footer-content {
		padding: 20px;
		max-width: 1200px;
		margin: 0 auto;
	}

	.footer-container.landscape .footer-content {
		padding: 16px;
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.options {
		margin-bottom: 16px;
		background: #fff;
		border: 1px solid #e5e5ea;
		border-radius: 12px;
		overflow: hidden;
		font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
	}

	.option-row {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		min-height: 48px;
		padding: 8px 16px;
		cursor: pointer;
		user-select: none;
	}

	/* inset separator, как в сгруппированных списках iOS */
	.option-row + .option-row::before {
		content: '';
		position: absolute;
		top: 0;
		left: 16px;
		right: 0;
		height: 1px;
		background: #e5e5ea;
	}

	.option-title {
		font-size: 17px;
		font-weight: 400;
		letter-spacing: -0.4px;
		color: #000;
	}

	.option-value {
		font-size: 17px;
		letter-spacing: -0.4px;
		color: #8e8e93;
		font-variant-numeric: tabular-nums;
	}

	/* iOS-style тумблер */
	.ios-switch {
		flex-shrink: 0;
		appearance: none;
		-webkit-appearance: none;
		width: 51px;
		height: 31px;
		border-radius: 16px;
		background: #e9e9ea;
		cursor: pointer;
		outline: none;
		position: relative;
		transition: background 0.2s ease;
	}

	.ios-switch::before {
		content: '';
		position: absolute;
		top: 2px;
		left: 2px;
		width: 27px;
		height: 27px;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2), 0 0 1px rgba(0, 0, 0, 0.1);
		transition: transform 0.2s ease;
	}

	.ios-switch:checked {
		background: #34c759;
	}

	.ios-switch:checked::before {
		transform: translateX(20px);
	}

	.range-row {
		flex-wrap: wrap;
		cursor: default;
	}

	.range-row input[type="range"] {
		flex: 1 1 100%;
		width: 100%;
		height: 6px;
		border-radius: 3px;
		background: #e5e5ea;
		outline: none;
		cursor: pointer;
		-webkit-appearance: none;
		appearance: none;
		margin-bottom: 8px;
	}

	.range-row input[type="range"]::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25);
		cursor: pointer;
		transition: transform 0.15s;
	}

	.range-row input[type="range"]::-webkit-slider-thumb:hover {
		transform: scale(1.15);
	}

	.range-row input[type="range"]::-moz-range-thumb {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25);
		cursor: pointer;
		border: none;
		transition: transform 0.15s;
	}

	.range-row input[type="range"]::-moz-range-thumb:hover {
		transform: scale(1.15);
	}

	.footer-actions {
		display: flex;
		gap: 10px;
		justify-content: space-between;
	}

	.footer-container.landscape .footer-actions {
		flex-direction: column;
		margin-top: auto;
	}

	.footer-container.landscape .footer-actions > div {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	/* скевоморфные кнопки в стиле iOS (глянцевый градиент + объёмная тень) */
	.cancel-btn,
	.export-btn {
		font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
		font-size: 15px;
		font-weight: 600;
		letter-spacing: -0.2px;
		color: #fff;
		padding: 10px 20px;
		border: none;
		border-radius: 10px;
		cursor: pointer;
		min-width: 100px;
		text-align: center;
		text-shadow: 0 -1px 0 rgba(0, 0, 0, 0.25);
		transition: transform 0.1s ease, box-shadow 0.1s ease, background 0.15s ease;
	}

	.footer-container.landscape .cancel-btn,
	.footer-container.landscape .export-btn {
		width: 100%;
	}

	.cancel-btn {
		background: linear-gradient(to bottom, #ff6b6b 0%, #ff3b30 50%, #e0251b 100%);
		box-shadow:
			inset 0 1px 1px rgba(255, 255, 255, 0.5),
			inset 0 -1px 2px rgba(0, 0, 0, 0.2),
			0 1px 2px rgba(224, 37, 27, 0.4),
			0 2px 4px rgba(0, 0, 0, 0.15);
	}

	.cancel-btn:hover {
		background: linear-gradient(to bottom, #ff7b7b 0%, #ff4b40 50%, #e0251b 100%);
	}

	.cancel-btn:active {
		transform: scale(0.96);
		background: linear-gradient(to bottom, #e0251b 0%, #c41e15 50%, #e0251b 100%);
		box-shadow:
			inset 0 1px 2px rgba(0, 0, 0, 0.3),
			0 1px 1px rgba(0, 0, 0, 0.1);
	}

	.export-png {
		background: linear-gradient(to bottom, #6a93ff 0%, #3b6dff 50%, #2854d9 100%);
		box-shadow:
			inset 0 1px 1px rgba(255, 255, 255, 0.5),
			inset 0 -1px 2px rgba(0, 0, 0, 0.2),
			0 1px 2px rgba(40, 84, 217, 0.4),
			0 2px 4px rgba(0, 0, 0, 0.15);
	}

	.export-png:hover:not(:disabled) {
		background: linear-gradient(to bottom, #7ba1ff 0%, #4b7aff 50%, #2854d9 100%);
	}

	.export-png:active:not(:disabled) {
		transform: scale(0.96);
		background: linear-gradient(to bottom, #2854d9 0%, #1f44b8 50%, #2854d9 100%);
		box-shadow:
			inset 0 1px 2px rgba(0, 0, 0, 0.3),
			0 1px 1px rgba(0, 0, 0, 0.1);
	}

	.export-gif {
		background: linear-gradient(to bottom, #34d399 0%, #10b981 50%, #059669 100%);
		box-shadow:
			inset 0 1px 1px rgba(255, 255, 255, 0.5),
			inset 0 -1px 2px rgba(0, 0, 0, 0.2),
			0 1px 2px rgba(5, 150, 105, 0.4),
			0 2px 4px rgba(0, 0, 0, 0.15);
	}

	.export-gif:hover:not(:disabled) {
		background: linear-gradient(to bottom, #4ee0ab 0%, #20c48f 50%, #059669 100%);
	}

	.export-gif:active:not(:disabled) {
		transform: scale(0.96);
		background: linear-gradient(to bottom, #059669 0%, #047a56 50%, #059669 100%);
		box-shadow:
			inset 0 1px 2px rgba(0, 0, 0, 0.3),
			0 1px 1px rgba(0, 0, 0, 0.1);
	}

	.export-svg {
		background: linear-gradient(to bottom, #fbbf4d 0%, #f59e0b 50%, #d97706 100%);
		box-shadow:
			inset 0 1px 1px rgba(255, 255, 255, 0.5),
			inset 0 -1px 2px rgba(0, 0, 0, 0.2),
			0 1px 2px rgba(217, 119, 6, 0.4),
			0 2px 4px rgba(0, 0, 0, 0.15);
	}

	.export-svg:hover:not(:disabled) {
		background: linear-gradient(to bottom, #fccb6e 0%, #ffad26 50%, #d97706 100%);
	}

	.export-svg:active:not(:disabled) {
		transform: scale(0.96);
		background: linear-gradient(to bottom, #d97706 0%, #b86305 50%, #d97706 100%);
		box-shadow:
			inset 0 1px 2px rgba(0, 0, 0, 0.3),
			0 1px 1px rgba(0, 0, 0, 0.1);
	}

	.export-btn:disabled {
		background: #ccc;
		color: #888;
		cursor: not-allowed;
		box-shadow: none;
		text-shadow: none;
	}
</style>
