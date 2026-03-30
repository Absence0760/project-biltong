<script lang="ts">
	import { cart, type Product } from './cartStore.svelte';

	type Props = { product: Product };
	const { product }: Props = $props();

	let added = $state(false);

	function addToCart() {
		cart.add(product);
		added = true;
		setTimeout(() => (added = false), 800);
	}
</script>

<article class="card">
	{#if product.badge}
		<span class="badge">{product.badge}</span>
	{/if}
	<div class="card-body">
		<h3 class="name">{product.name}</h3>
		<p class="description">{product.description}</p>
	</div>
	<div class="card-footer">
		<div class="meta">
			<span class="weight">{product.weight}</span>
			<span class="price">${product.price}</span>
		</div>
		<button class="add-btn" class:added onclick={addToCart} aria-label="Add {product.name} to cart">
			{#if added}
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="20 6 9 17 4 12"></polyline>
				</svg>
				Added
			{:else}
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
					<line x1="12" y1="5" x2="12" y2="19"></line>
					<line x1="5" y1="12" x2="19" y2="12"></line>
				</svg>
				Add to Cart
			{/if}
		</button>
	</div>
</article>

<style>
	.card {
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		display: flex;
		flex-direction: column;
		position: relative;
		transition: border-color 0.2s, background 0.2s;
		overflow: hidden;
	}

	.card:hover {
		background: var(--bg-card-hover);
		border-color: var(--border-accent);
	}

	.badge {
		position: absolute;
		top: 12px;
		right: 12px;
		background: var(--accent);
		color: #0f0b06;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		padding: 3px 8px;
		border-radius: 4px;
	}

	.card-body {
		padding: 20px 20px 12px;
		flex: 1;
	}

	.name {
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--text);
		margin-bottom: 8px;
		padding-right: 56px;
	}

	.description {
		font-size: 0.875rem;
		color: var(--text-muted);
		line-height: 1.5;
	}

	.card-footer {
		padding: 12px 20px 20px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.meta {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.weight {
		font-size: 0.75rem;
		color: var(--text-subtle);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.price {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--accent);
	}

	.add-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 16px;
		background: var(--accent-dim);
		color: var(--accent);
		border: 1px solid var(--border-accent);
		border-radius: 6px;
		font-size: 0.85rem;
		font-weight: 600;
		transition: background 0.15s, color 0.15s, border-color 0.15s;
		white-space: nowrap;
	}

	.add-btn:hover {
		background: var(--accent);
		color: #0f0b06;
		border-color: var(--accent);
	}

	.add-btn.added {
		background: #1a3a1a;
		color: #5cb85c;
		border-color: #2a5a2a;
	}
</style>
