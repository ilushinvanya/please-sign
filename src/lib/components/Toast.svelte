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
		padding: 10px 20px;
		border-radius: 20px;
		font-size: 14px;
		transition: transform 0.3s ease;
		pointer-events: none;
		z-index: 10;
		white-space: nowrap;
	}
	.toast.show {
		transform: translateX(-50%) translateY(0);
	}
</style>
