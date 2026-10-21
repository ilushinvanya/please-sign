<script lang="ts">
	import { signatureStore } from '#lib/stores/signatureStore';

	let toastMessage = '';
	let toastVisible = false;

	signatureStore.subscribe(state => {
		toastMessage = state.toastMessage;
		toastVisible = state.toastVisible;
	});
</script>

<div class="toast" class:show={toastVisible}>
	{toastMessage}
</div>

<style>
	.toast {
		position: fixed;
		bottom: 30px;
		left: 50%;
		transform: translateX(-50%) translateY(80px);
		background: #111;
		color: white;
		padding: 12px 24px;
		border-radius: 20px;
		font-size: 15px;
		font-weight: 500;
		transition: transform 0.3s ease;
		pointer-events: none;
		z-index: 1000;
		white-space: nowrap;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}
	.toast.show {
		transform: translateX(-50%) translateY(0);
	}
</style>
