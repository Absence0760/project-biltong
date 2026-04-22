<script lang="ts">
	import { cart } from './cartStore.svelte';
	import { formatPrice } from './sanity';
	import { isValidEmail } from './validation';
	import { PUBLIC_API_URL } from '$env/static/public';

	type Props = {
		open?: boolean;
		onclose: () => void;
	};

	let { open = false, onclose }: Props = $props();

	let panelEl = $state<HTMLElement | null>(null);

	// Focus trap: when the panel opens, move focus to the first focusable
	// element inside it. On Tab/Shift+Tab, cycle within the panel only.
	$effect(() => {
		if (!open || !panelEl) return;

		const focusable = (): HTMLElement[] =>
			Array.from(
				panelEl!.querySelectorAll<HTMLElement>(
					'button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
				)
			);

		// Move focus in on next tick (panel is just mounted).
		const raf = requestAnimationFrame(() => {
			const els = focusable();
			if (els.length) els[0].focus();
		});

		function trapFocus(e: KeyboardEvent) {
			if (e.key !== 'Tab') return;
			const els = focusable();
			if (!els.length) return;
			const first = els[0];
			const last = els[els.length - 1];
			if (e.shiftKey) {
				if (document.activeElement === first) {
					e.preventDefault();
					last.focus();
				}
			} else {
				if (document.activeElement === last) {
					e.preventDefault();
					first.focus();
				}
			}
		}

		panelEl!.addEventListener('keydown', trapFocus);
		return () => {
			cancelAnimationFrame(raf);
			panelEl?.removeEventListener('keydown', trapFocus);
		};
	});

	let name = $state('');
	let email = $state('');
	let phone = $state('');
	let address = $state('');
	let notes = $state('');
	let website = $state('');
	let submitting = $state(false);
	let redirecting = $state(false);
	let error = $state<string | null>(null);

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}

	async function handleCheckout() {
		if (cart.items.length === 0) return;
		if (!name.trim() || !email.trim() || !address.trim()) {
			error = 'Please fill in your name, email, and shipping address.';
			return;
		}
		if (!isValidEmail(email)) {
			error = 'Please enter a valid email address.';
			return;
		}

		submitting = true;
		error = null;

		const body = {
			name: name.trim(),
			email: email.trim(),
			phone: phone.trim(),
			address: address.trim(),
			notes: notes.trim(),
			website,
			paymentMethod: 'stripe',
			cart: cart.items.map((item) => ({
				productId: item.productId,
				quantity: item.quantity
			}))
		};

		try {
			const res = await fetch(`${PUBLIC_API_URL}/orders`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			const data = (await res.json()) as {
				success?: true;
				ref?: string;
				error?: string;
				warning?: string;
				stripe?: { sessionId: string; url: string };
			};

			if (!res.ok || data.error) {
				error = data.error ?? 'Something went wrong. Please try again.';
				return;
			}

			if (data.stripe?.url) {
				redirecting = true;
				cart.clear();
				window.location.href = data.stripe.url;
				return;
			}

			if (data.warning) {
				error = data.warning;
				return;
			}
		} catch (e) {
			console.error(e);
			error = 'Could not reach the order service. Please try again.';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="backdrop" onclick={handleBackdropClick}>
		<div class="panel" role="dialog" aria-modal="true" aria-labelledby="cart-heading" bind:this={panelEl}>
			<header class="panel-header">
				<h2 id="cart-heading">Your order</h2>
				<button class="close-btn" onclick={onclose} aria-label="Close cart">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
				</button>
			</header>

			{#if redirecting}
				<div class="redirecting" role="status" aria-live="polite">
					<div class="spinner" aria-hidden="true"></div>
					<p>Redirecting to Stripe…</p>
					<p class="empty-hint">Complete your payment on the next page.</p>
				</div>
			{:else if cart.items.length === 0}
				<div class="empty">
					<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.3">
						<circle cx="9" cy="21" r="1"></circle>
						<circle cx="20" cy="21" r="1"></circle>
						<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
					</svg>
					<p>Your cart is empty</p>
					<p class="empty-hint">Add items from the shop to get started.</p>
				</div>
			{:else}
				<div class="items">
					{#each cart.items as item (item.productId)}
						<div class="item">
							<div class="item-info">
								<span class="item-name">{item.name}</span>
							</div>
							<div class="item-controls">
								<button class="qty-btn" onclick={() => cart.decrement(item.productId)} aria-label="Decrease quantity">&minus;</button>
								<span class="qty">{item.quantity}</span>
								<button class="qty-btn" onclick={() => cart.increment(item.productId)} aria-label="Increase quantity">+</button>
							</div>
							<span class="item-price">{formatPrice(item.price * item.quantity)}</span>
							<button class="remove-btn" onclick={() => cart.remove(item.productId)} aria-label="Remove {item.name}">
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
					<span class="total-amount">{formatPrice(cart.total)}</span>
				</div>

				<div class="form">
					{#if error}
						<div class="form-error">{error}</div>
					{/if}

					<input
						type="text"
						name="website"
						tabindex="-1"
						autocomplete="off"
						class="hp"
						aria-hidden="true"
						bind:value={website}
					/>

					<label for="cart-name">Name <span class="req">*</span></label>
					<input id="cart-name" type="text" autocomplete="name" required bind:value={name} />

					<label for="cart-email">Email <span class="req">*</span></label>
					<input id="cart-email" type="email" autocomplete="email" inputmode="email" required bind:value={email} />

					<label for="cart-phone">Phone <span class="optional">(optional)</span></label>
					<input id="cart-phone" type="tel" autocomplete="tel" inputmode="tel" bind:value={phone} />

					<label for="cart-address">Shipping address <span class="req">*</span></label>
					<textarea id="cart-address" rows="2" autocomplete="street-address" required bind:value={address}></textarea>

					<label for="cart-notes">Notes <span class="optional">(optional)</span></label>
					<textarea id="cart-notes" rows="2" placeholder="Any special requests…" bind:value={notes}></textarea>
				</div>

				<button class="checkout-btn" onclick={handleCheckout} disabled={submitting}>
					{#if submitting}
						Processing…
					{:else}
						Pay now — {formatPrice(cart.total)}
					{/if}
				</button>
				<p class="hint">
					You'll be redirected to Stripe to complete payment securely.
				</p>
			{/if}
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 100;
		display: flex;
		justify-content: flex-end;
	}

	.panel {
		background: var(--color-bg);
		border-left: 1px solid var(--color-rule);
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
		padding: 16px 20px;
		border-bottom: 1px solid var(--color-rule);
		position: sticky;
		top: 0;
		background: var(--color-bg);
		z-index: 1;
	}

	.panel-header h2 {
		font-size: 1.1rem;
		font-weight: 600;
		margin: 0;
		font-family: var(--font-display);
		color: var(--color-leaf-dark);
	}

	.close-btn {
		background: none;
		border: none;
		color: var(--color-ink-soft);
		padding: 4px;
		border-radius: 4px;
		cursor: pointer;
		transition: color 0.15s;
	}

	.close-btn:hover {
		color: var(--color-ink);
	}

	.empty,
	.redirecting {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		color: var(--color-ink-soft);
		padding: 48px 20px;
		font-size: 0.9rem;
	}

	.empty p,
	.redirecting p { margin: 0; }

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--color-rule);
		border-top-color: var(--color-leaf-dark);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		margin-bottom: 8px;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	@media (prefers-reduced-motion: reduce) {
		.spinner { animation: none; }
	}

	.empty-hint {
		font-size: 0.8rem;
		color: var(--color-ink-soft);
	}

	.items {
		padding: 12px 20px 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.item {
		display: grid;
		grid-template-columns: 1fr auto auto auto;
		align-items: center;
		gap: 8px;
		padding: 10px 12px;
		background: var(--color-surface);
		border: 1px solid var(--color-rule);
		border-radius: 4px;
	}

	.item-info {
		min-width: 0;
	}

	.item-name {
		font-size: 0.85rem;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		display: block;
	}

	.item-controls {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.qty-btn {
		width: 24px;
		height: 24px;
		border-radius: 2px;
		background: var(--color-bg);
		border: 1px solid var(--color-rule);
		color: var(--color-ink);
		font-size: 1rem;
		line-height: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: border-color 0.15s, color 0.15s;
		padding: 0;
	}

	.qty-btn:hover {
		border-color: var(--color-leaf);
		color: var(--color-leaf-dark);
	}

	.qty {
		font-size: 0.85rem;
		min-width: 18px;
		text-align: center;
		font-weight: 600;
	}

	.item-price {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-leaf-dark);
		min-width: 48px;
		text-align: right;
	}

	.remove-btn {
		background: none;
		border: none;
		color: var(--color-ink-soft);
		padding: 3px;
		cursor: pointer;
		transition: color 0.15s;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.remove-btn:hover {
		color: #a2432f;
	}

	.total-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 14px 20px;
		border-top: 1px solid var(--color-rule);
		margin-top: 12px;
		font-weight: 600;
	}

	.total-amount {
		font-size: 1.2rem;
		color: var(--color-leaf-dark);
	}

	.form {
		padding: 0 20px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.form label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-soft);
		margin-top: 6px;
	}

	.req { color: #a2432f; font-weight: 700; }
	.optional { font-weight: 400; text-transform: none; letter-spacing: 0; font-style: italic; }

	.form input,
	.form textarea {
		background: var(--color-surface);
		border: 1px solid var(--color-rule);
		border-radius: 2px;
		color: var(--color-ink);
		padding: 8px 10px;
		font: inherit;
		font-size: 0.85rem;
		width: 100%;
		box-sizing: border-box;
		transition: border-color 0.15s;
		resize: vertical;
	}

	.form input:focus,
	.form textarea:focus {
		outline: 2px solid var(--color-leaf);
		outline-offset: 1px;
	}

	.form-error {
		background: #f5e3e0;
		border-left: 4px solid #a2432f;
		color: #6b2a1b;
		padding: 8px 12px;
		font-size: 0.85rem;
		border-radius: 2px;
	}

	.hp {
		position: absolute;
		left: -9999px;
		width: 1px;
		height: 1px;
		opacity: 0;
	}

	.checkout-btn {
		margin: 16px 20px 6px;
		background: var(--color-leaf-dark);
		color: #f6f4ee;
		border: none;
		border-radius: 4px;
		padding: 12px 20px;
		font: inherit;
		font-size: 0.9rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: background 0.15s;
	}

	.checkout-btn:hover {
		background: #244019;
	}

	.checkout-btn:disabled {
		background: #a8afa0;
		cursor: not-allowed;
	}

	.hint {
		text-align: center;
		font-size: 0.75rem;
		color: var(--color-ink-soft);
		padding: 0 20px;
		margin: 4px 0 0;
	}
</style>
