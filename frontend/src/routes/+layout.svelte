<script lang="ts">
	import '../app.css';
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { PUBLIC_SITE_URL } from '$env/static/public';
	import Cart from '$lib/Cart.svelte';
	import { cart } from '$lib/cartStore.svelte';

	type Props = { children?: Snippet };
	let { children }: Props = $props();

	const nav = [
		{ href: '/', label: 'Home' },
		{ href: '/shop', label: 'Shop' },
		{ href: '/about', label: 'About' },
		{ href: '/contact', label: 'Contact' }
	];

	const siteUrl = PUBLIC_SITE_URL?.replace(/\/$/, '') ?? '';
	const ogImage = `${siteUrl}/og-default.svg`;
	const canonicalUrl = $derived(`${siteUrl}${page.url.pathname}`);

	let menuOpen = $state(false);

	function closeMenu() {
		menuOpen = false;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && menuOpen) closeMenu();
	}


</script>

<svelte:window onkeydown={onKeydown} />

<svelte:head>
	<!-- Site-wide Open Graph defaults.
	     - Per-page <title>, description, og:title, and og:description go in
	       each +page.svelte so there are no duplicates in the built HTML
	       (Svelte dedupes <title> but NOT <meta> tags).
	     - Favicon and theme-color live in app.html, so routes that disable
	       SSR (like /track) still get them in their static HTML shell. -->
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Thong Biltong" />
	<meta property="og:image" content={ogImage} />
	<meta property="og:url" content={canonicalUrl} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:image" content={ogImage} />
</svelte:head>

<div class="announcement-bar" role="status" aria-label="Shipping and checkout information">
	<div class="container announcement-bar__inner">
		<span>Free shipping on orders over R500</span>
		<span class="announcement-bar__sep" aria-hidden="true">·</span>
		<span>Secure checkout via Stripe</span>
	</div>
</div>

<header class="site-header">
	<div class="container header-inner">
		<button
			class="menu-btn"
			onclick={() => (menuOpen = !menuOpen)}
			aria-label={menuOpen ? 'Close menu' : 'Open menu'}
			aria-expanded={menuOpen}
			aria-controls="mobile-nav"
		>
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
				<line x1="4" y1="7" x2="20" y2="7"></line>
				<line x1="4" y1="12" x2="20" y2="12"></line>
				<line x1="4" y1="17" x2="20" y2="17"></line>
			</svg>
		</button>

		<a class="brand" href="/" aria-label="Thong Biltong — home">
			<img src="/logo.svg" alt="" class="brand-logo" width="36" height="36" />
			<span>Thong Biltong</span>
		</a>

		<div class="header-right">
			<nav class="desktop-nav">
				<ul>
					{#each nav as item}
						<li>
							<a
								href={item.href}
								class:active={page.url.pathname === item.href ||
									(item.href !== '/' && page.url.pathname.startsWith(item.href))}
							>
								{item.label}
							</a>
						</li>
					{/each}
				</ul>
			</nav>
			<button class="cart-btn" onclick={() => cart.openPanel()} aria-label="Open cart">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="9" cy="21" r="1"></circle>
					<circle cx="20" cy="21" r="1"></circle>
					<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
				</svg>
				{#if cart.count > 0}
					<span class="cart-badge">{cart.count}</span>
				{/if}
			</button>
		</div>
	</div>

	<!-- Mobile nav popup. A small dropdown panel anchored near the
	     hamburger, not a full-screen overlay. A transparent backdrop
	     behind it handles tap-to-close. The popup lives inside the
	     <header> so its `position: absolute` resolves to the sticky
	     header element, which means it stays pinned correctly as the
	     page scrolls. -->
	{#if menuOpen}
		<div
			class="mobile-nav-backdrop"
			onclick={closeMenu}
			onkeydown={(e) => e.key === 'Escape' && closeMenu()}
			role="button"
			tabindex="-1"
			aria-label="Close menu"
		></div>
		<div
			class="mobile-nav"
			id="mobile-nav"
			role="menu"
			aria-label="Main menu"
		>
			<nav>
				<ul>
					{#each nav as item}
						<li>
							<a
								href={item.href}
								role="menuitem"
								class:active={page.url.pathname === item.href ||
									(item.href !== '/' && page.url.pathname.startsWith(item.href))}
								onclick={closeMenu}
							>
								{item.label}
							</a>
						</li>
					{/each}
				</ul>
			</nav>
		</div>
	{/if}
</header>

<main>
	{@render children?.()}
</main>

<Cart open={cart.panelOpen} onclose={() => cart.closePanel()} />

<footer class="site-footer">
	<div class="container">
		<ul class="footer-trust" aria-label="Shipping and checkout">
			<li>Ships across South Africa</li>
			<li>Secure checkout via Stripe</li>
			<li>Card · Apple Pay · Google Pay</li>
		</ul>
		<div class="footer-copyright">
			<p>&copy; {new Date().getFullYear()} Thong Biltong. All rights reserved.</p>
			<p class="footer-links">
				<a href="/privacy">Privacy policy</a>
				<span aria-hidden="true">·</span>
				<a href="/contact">Contact</a>
			</p>
			<p class="muted">Thong Biltong — cheekily cured.</p>
			<svg
				class="usa-badge"
				viewBox="0 0 68 32"
				role="img"
				aria-label="Made in the USA"
				xmlns="http://www.w3.org/2000/svg"
			>
				<rect x="0" y="0" width="68" height="32" fill="#ffffff" stroke="#2a1a10" stroke-width="2" rx="2" />
				<rect x="0" y="0" width="68" height="2.46" fill="#b22234" />
				<rect x="0" y="4.92" width="68" height="2.46" fill="#b22234" />
				<rect x="0" y="9.85" width="68" height="2.46" fill="#b22234" />
				<rect x="0" y="14.77" width="68" height="2.46" fill="#b22234" />
				<rect x="0" y="19.69" width="68" height="2.46" fill="#b22234" />
				<rect x="0" y="24.62" width="68" height="2.46" fill="#b22234" />
				<rect x="0" y="29.54" width="68" height="2.46" fill="#b22234" />
				<rect x="0" y="0" width="27" height="17" fill="#3c3b6e" />
				<g fill="#ffffff">
					<circle cx="3.5" cy="3" r="0.8" /><circle cx="8.5" cy="3" r="0.8" /><circle cx="13.5" cy="3" r="0.8" /><circle cx="18.5" cy="3" r="0.8" /><circle cx="23.5" cy="3" r="0.8" />
					<circle cx="6" cy="6.5" r="0.8" /><circle cx="11" cy="6.5" r="0.8" /><circle cx="16" cy="6.5" r="0.8" /><circle cx="21" cy="6.5" r="0.8" />
					<circle cx="3.5" cy="10" r="0.8" /><circle cx="8.5" cy="10" r="0.8" /><circle cx="13.5" cy="10" r="0.8" /><circle cx="18.5" cy="10" r="0.8" /><circle cx="23.5" cy="10" r="0.8" />
					<circle cx="6" cy="13.5" r="0.8" /><circle cx="11" cy="13.5" r="0.8" /><circle cx="16" cy="13.5" r="0.8" /><circle cx="21" cy="13.5" r="0.8" />
				</g>
				<rect x="2" y="18" width="64" height="11" fill="#ffffff" opacity="0.92" stroke="#2a1a10" stroke-width="0.6" rx="1.5" />
				<text x="34" y="25.8" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="6.5" font-weight="bold" fill="#2a1a10">MADE IN THE USA</text>
			</svg>
		</div>
	</div>
</footer>

<style>
	.announcement-bar {
		background: var(--color-leaf-dark);
		color: #e8ece1;
		font-size: 0.78rem;
		letter-spacing: 0.08em;
	}

	.announcement-bar__inner {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.6rem;
		padding: 0.5rem var(--space-3);
		flex-wrap: wrap;
		text-align: center;
	}

	.announcement-bar__sep {
		color: rgba(232, 236, 225, 0.5);
	}

	/* Hide the centre-dot separator on very narrow viewports where the two
	   items wrap onto separate lines — an orphaned dot between stacked
	   lines looks broken. */
	@media (max-width: 520px) {
		.announcement-bar__sep {
			display: none;
		}
		.announcement-bar__inner {
			flex-direction: column;
			gap: 0.1rem;
		}
	}

	.site-header {
		background: var(--color-bg);
		border-bottom: 1px solid var(--color-rule);
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.header-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: var(--space-2);
		padding-bottom: var(--space-2);
		gap: var(--space-3);
		flex-wrap: wrap;
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		font-family: var(--font-display);
		font-size: 1.35rem;
		color: var(--color-leaf-dark);
		border-bottom: none;
	}

	.brand-logo {
		display: block;
		width: 36px;
		height: 36px;
	}

	.desktop-nav ul {
		display: flex;
		gap: var(--space-3);
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.menu-btn {
		display: none; /* shown on mobile via media query */
		background: none;
		border: none;
		padding: 4px;
		color: var(--color-leaf-dark);
		cursor: pointer;
	}

	.menu-btn:hover {
		color: var(--color-bark);
	}

	/* Below 620px: swap the inline desktop nav for a hamburger button. The
	   header collapses to one row: hamburger · brand · cart. */
	@media (max-width: 620px) {
		.desktop-nav {
			display: none;
		}
		.menu-btn {
			display: inline-flex;
			align-items: center;
			justify-content: center;
		}
		.brand {
			font-size: 1.15rem;
		}
	}

	/* Invisible backdrop that captures taps outside the popup so we can
	   close it without a visual dimming layer — we want a subtle popup,
	   not a modal. */
	.mobile-nav-backdrop {
		position: fixed;
		inset: 0;
		background: transparent;
		z-index: 50;
		border: none;
		cursor: default;
	}

	/* Small popup anchored below the header, near the hamburger on the
	   left. Cream background, soft shadow, pill-cornered — feels like a
	   floating card rather than a full-screen takeover. */
	.mobile-nav {
		position: absolute;
		top: calc(100% + 0.5rem);
		left: var(--space-2);
		z-index: 60;
		min-width: 180px;
		background: var(--color-surface);
		border: 1px solid var(--color-rule);
		border-radius: 4px;
		box-shadow: 0 10px 28px rgba(20, 30, 15, 0.18);
		padding: 0.5rem 0;
	}

	.mobile-nav nav ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
	}

	.mobile-nav nav a {
		display: block;
		padding: 0.6rem var(--space-2);
		font-family: var(--font-body);
		font-size: 0.95rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-ink);
		border-bottom: none;
		transition: background-color 120ms ease, color 120ms ease;
	}

	.mobile-nav nav a:hover {
		background: var(--color-bg);
		color: var(--color-bark);
	}

	.mobile-nav nav a.active {
		color: var(--color-leaf-dark);
		font-weight: 500;
	}

	nav a {
		font-size: 0.95rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-ink-soft);
	}

	nav a.active {
		color: var(--color-leaf-dark);
		border-bottom-color: var(--color-leaf);
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.cart-btn {
		position: relative;
		background: none;
		border: none;
		color: var(--color-leaf-dark);
		cursor: pointer;
		padding: 4px;
		transition: color 0.15s;
	}

	.cart-btn:hover {
		color: var(--color-leaf);
	}

	.cart-badge {
		position: absolute;
		top: -4px;
		right: -6px;
		background: var(--color-leaf-dark);
		color: #f6f4ee;
		font-size: 0.65rem;
		font-weight: 700;
		min-width: 16px;
		height: 16px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 4px;
	}

	main {
		flex: 1;
	}

	.site-footer {
		background: var(--color-leaf-dark);
		color: #e8ece1;
		padding: var(--space-4) 0;
		margin-top: var(--space-6);
		text-align: center;
		font-size: 0.9rem;
	}

	.footer-trust {
		list-style: none;
		padding: 0;
		margin: 0 0 var(--space-3);
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 0.6rem 1rem;
		font-size: 0.78rem;
		letter-spacing: 0.08em;
		color: #e8ece1;
	}

	.footer-trust li {
		padding: 0.3rem 0.9rem;
		border: 1px solid rgba(232, 236, 225, 0.35);
		border-radius: 999px;
	}

	.footer-copyright {
		padding-top: var(--space-3);
		border-top: 1px solid rgba(232, 236, 225, 0.18);
	}

	.footer-links {
		display: flex;
		justify-content: center;
		gap: 0.6rem;
		margin: 0.25rem 0;
		font-size: 0.85rem;
	}

	.footer-links a {
		color: #e8ece1;
		border-bottom-color: transparent;
	}

	.footer-links a:hover {
		color: #fff;
		border-bottom-color: rgba(246, 244, 238, 0.6);
	}

	.footer-links span {
		color: rgba(232, 236, 225, 0.5);
	}

	.site-footer p {
		margin: 0.25rem 0;
	}

	.site-footer .muted {
		color: #b7c0ae;
		font-style: italic;
	}

	.usa-badge {
		display: block;
		width: 140px;
		height: auto;
		margin: var(--space-2) auto 0;
	}
</style>
