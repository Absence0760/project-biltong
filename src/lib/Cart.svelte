<script lang="ts">
	import { cart } from './cartStore.svelte';

	type Props = { open: boolean; onclose: () => void };
	const { open, onclose }: Props = $props();

	let name = $state('');
	let notes = $state('');

	function handleOrder() {
		cart.sendOrder(name, notes);
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="backdrop" onclick={handleBackdropClick}>
		<aside class="panel">
			<header class="panel-header">
				<h2>Your Order</h2>
				<button class="close-btn" onclick={onclose} aria-label="Close cart">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
				</button>
			</header>

			{#if cart.items.length === 0}
				<div class="empty">
					<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.3">
						<circle cx="9" cy="21" r="1"></circle>
						<circle cx="20" cy="21" r="1"></circle>
						<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
					</svg>
					<p>Your cart is empty</p>
				</div>
			{:else}
				<div class="items">
					{#each cart.items as item (item.id)}
						<div class="item">
							<div class="item-info">
								<span class="item-name">{item.name}</span>
								<span class="item-weight">{item.weight}</span>
							</div>
							<div class="item-controls">
								<button class="qty-btn" onclick={() => cart.decrement(item.id)} aria-label="Decrease quantity">−</button>
								<span class="qty">{item.quantity}</span>
								<button class="qty-btn" onclick={() => cart.increment(item.id)} aria-label="Increase quantity">+</button>
							</div>
							<span class="item-price">${(item.price * item.quantity).toFixed(2)}</span>
							<button class="remove-btn" onclick={() => cart.remove(item.id)} aria-label="Remove {item.name}">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
									<line x1="18" y1="6" x2="6" y2="18"></line>
									<line x1="6" y1="6" x2="18" y2="18"></line>
								</svg>
							</button>
						</div>
					{/each}
				</div>

				<div class="total-row">
					<span>Total</span>
					<span class="total-amount">${cart.total.toFixed(2)}</span>
				</div>

				<div class="form">
					<label for="cart-name">Your name <span class="optional">(optional)</span></label>
					<input id="cart-name" type="text" placeholder="Jane Smith" bind:value={name} />

					<label for="cart-notes">Notes / delivery address <span class="optional">(optional)</span></label>
					<textarea id="cart-notes" rows="3" placeholder="Any special requests or where to deliver…" bind:value={notes}></textarea>
				</div>

				<button class="order-btn" onclick={handleOrder}>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
						<polyline points="22,6 12,13 2,6"></polyline>
					</svg>
					Send Order via Email
				</button>
				<p class="hint">This will open your email client with your order pre-filled.</p>
				<p class="confirm-notice">We'll reply with a payment link once your order is confirmed.</p>
			{/if}
		</aside>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		z-index: 100;
		display: flex;
		justify-content: flex-end;
	}

	.panel {
		background: var(--bg-surface);
		border-left: 1px solid var(--border);
		width: min(420px, 100vw);
		height: 100%;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		padding: 0 0 24px;
	}

	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20px 24px;
		border-bottom: 1px solid var(--border);
		position: sticky;
		top: 0;
		background: var(--bg-surface);
		z-index: 1;
	}

	.panel-header h2 {
		font-size: 1.1rem;
		font-weight: 600;
	}

	.close-btn {
		color: var(--text-muted);
		padding: 4px;
		border-radius: 4px;
		transition: color 0.15s;
	}

	.close-btn:hover {
		color: var(--text);
	}

	.empty {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		color: var(--text-muted);
		padding: 48px 24px;
		font-size: 0.9rem;
	}

	.items {
		padding: 16px 24px 0;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.item {
		display: grid;
		grid-template-columns: 1fr auto auto auto;
		align-items: center;
		gap: 10px;
		padding: 12px;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}

	.item-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.item-name {
		font-size: 0.875rem;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.item-weight {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.item-controls {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.qty-btn {
		width: 24px;
		height: 24px;
		border-radius: 4px;
		background: var(--bg-surface);
		border: 1px solid var(--border);
		color: var(--text);
		font-size: 1rem;
		line-height: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: border-color 0.15s;
	}

	.qty-btn:hover {
		border-color: var(--accent);
		color: var(--accent);
	}

	.qty {
		font-size: 0.875rem;
		min-width: 18px;
		text-align: center;
	}

	.item-price {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--accent);
		min-width: 48px;
		text-align: right;
	}

	.remove-btn {
		color: var(--text-subtle);
		padding: 3px;
		transition: color 0.15s;
	}

	.remove-btn:hover {
		color: var(--danger);
	}

	.total-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 24px;
		border-top: 1px solid var(--border);
		margin-top: 16px;
		font-weight: 600;
	}

	.total-amount {
		font-size: 1.3rem;
		color: var(--accent);
	}

	.form {
		padding: 0 24px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.form label {
		font-size: 0.8rem;
		color: var(--text-muted);
		margin-top: 8px;
	}

	.optional {
		color: var(--text-subtle);
	}

	.form input,
	.form textarea {
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--text);
		padding: 10px 12px;
		font-size: 0.875rem;
		width: 100%;
		transition: border-color 0.15s;
		resize: vertical;
	}

	.form input:focus,
	.form textarea:focus {
		outline: none;
		border-color: var(--border-accent);
	}

	.form input::placeholder,
	.form textarea::placeholder {
		color: var(--text-subtle);
	}

	.order-btn {
		margin: 20px 24px 8px;
		background: var(--accent);
		color: #0f0b06;
		border-radius: 8px;
		padding: 14px 20px;
		font-size: 0.95rem;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		transition: background 0.15s;
	}

	.order-btn:hover {
		background: var(--accent-hover);
	}

	.hint {
		text-align: center;
		font-size: 0.75rem;
		color: var(--text-subtle);
		padding: 0 24px;
	}

	.confirm-notice {
		text-align: center;
		font-size: 0.8rem;
		color: var(--text-muted);
		padding: 8px 24px 0;
	}
</style>
