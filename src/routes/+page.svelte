<script lang="ts">
	import { products } from '$lib/cartStore.svelte';
	import ProductCard from '$lib/ProductCard.svelte';
</script>

<section class="hero">
	<p class="hero-eyebrow">Hand-crafted in small batches</p>
	<h1 class="hero-title">Premium South African<br />Biltong & Droëwors</h1>
	<p class="hero-sub">Air-dried. No shortcuts. Just the real thing.</p>
	<a href="#products" class="hero-cta">Shop Now</a>
</section>

<section id="products" class="products-section">
	<h2 class="section-title">Our Products</h2>
	<div class="products-grid">
		{#each products as product (product.id)}
			<ProductCard {product} />
		{/each}
	</div>
</section>

<style>
	.hero {
		max-width: 1100px;
		margin: 0 auto;
		padding: 80px 24px 96px;
		text-align: center;
	}

	.hero-eyebrow {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--accent);
		font-weight: 600;
		margin-bottom: 16px;
	}

	.hero-title {
		font-size: clamp(2rem, 5vw, 3.5rem);
		font-weight: 800;
		line-height: 1.1;
		letter-spacing: -0.02em;
		color: var(--text);
		margin-bottom: 16px;
	}

	.hero-sub {
		font-size: 1.1rem;
		color: var(--text-muted);
		margin-bottom: 32px;
	}

	.hero-cta {
		display: inline-flex;
		align-items: center;
		background: var(--accent);
		color: #0f0b06;
		font-weight: 700;
		padding: 14px 32px;
		border-radius: 8px;
		font-size: 0.95rem;
		transition: background 0.15s;
	}

	.hero-cta:hover {
		background: var(--accent-hover);
	}

	.products-section {
		max-width: 1100px;
		margin: 0 auto;
		padding: 0 24px 80px;
	}

	.section-title {
		font-size: 1.5rem;
		font-weight: 700;
		margin-bottom: 28px;
		color: var(--text);
	}

	.products-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 16px;
	}
</style>
