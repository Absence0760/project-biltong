<script lang="ts">
	import '../app.css';
	import { cart } from '$lib/cartStore.svelte';
	import Cart from '$lib/Cart.svelte';
	import { page } from '$app/stores';

	let cartOpen = $state(false);
</script>

<header class="header">
	<div class="header-inner">
		<a href="/" class="logo">
			<span class="logo-icon">◈</span>
			<span class="logo-text">Biltong Co.</span>
		</a>
		<nav class="nav">
			<a href="/" class:active={$page.url.pathname === '/'}>Shop</a>
			<a href="/about" class:active={$page.url.pathname === '/about'}>About</a>
			<a href="/faq" class:active={$page.url.pathname === '/faq'}>FAQ</a>
		</nav>
		<button class="cart-btn" onclick={() => (cartOpen = true)} aria-label="Open cart">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="9" cy="21" r="1"></circle>
				<circle cx="20" cy="21" r="1"></circle>
				<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
			</svg>
			{#if cart.count > 0}
				<span class="cart-badge">{cart.count}</span>
			{/if}
		</button>
	</div>
</header>

<main class="main">
	<slot />
</main>

<footer class="footer">
	<p>© {new Date().getFullYear()} Biltong Co. · All rights reserved</p>
</footer>

<Cart open={cartOpen} onclose={() => (cartOpen = false)} />

<style>
	.header {
		position: sticky;
		top: 0;
		z-index: 50;
		background: rgba(15, 11, 6, 0.92);
		border-bottom: 1px solid var(--border);
		backdrop-filter: blur(8px);
	}

	.header-inner {
		max-width: 1100px;
		margin: 0 auto;
		padding: 0 24px;
		height: 60px;
		display: flex;
		align-items: center;
		gap: 32px;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 8px;
		font-weight: 700;
		font-size: 1.1rem;
		letter-spacing: -0.01em;
		flex-shrink: 0;
	}

	.logo-icon {
		color: var(--accent);
		font-size: 1.3rem;
	}

	.logo-text {
		color: var(--text);
	}

	.nav {
		display: flex;
		align-items: center;
		gap: 4px;
		flex: 1;
	}

	.nav a {
		font-size: 0.875rem;
		color: var(--text-muted);
		padding: 6px 12px;
		border-radius: 6px;
		transition: color 0.15s, background 0.15s;
	}

	.nav a:hover,
	.nav a.active {
		color: var(--text);
		background: var(--bg-card);
	}

	.nav a.active {
		color: var(--accent);
	}

	.cart-btn {
		position: relative;
		margin-left: auto;
		color: var(--text-muted);
		padding: 8px;
		border-radius: 8px;
		transition: color 0.15s, background 0.15s;
		flex-shrink: 0;
	}

	.cart-btn:hover {
		color: var(--text);
		background: var(--bg-card);
	}

	.cart-badge {
		position: absolute;
		top: 2px;
		right: 2px;
		background: var(--accent);
		color: #0f0b06;
		font-size: 0.65rem;
		font-weight: 700;
		min-width: 16px;
		height: 16px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 3px;
	}

	.main {
		flex: 1;
	}

	.footer {
		padding: 24px;
		text-align: center;
		font-size: 0.8rem;
		color: var(--text-subtle);
		border-top: 1px solid var(--border);
	}
</style>
