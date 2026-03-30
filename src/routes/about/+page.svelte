<svelte:head>
	<title>About — Biltong Co.</title>
</svelte:head>

<div class="page">
	<div class="inner">
		<p class="eyebrow">Our story</p>
		<h1>Made the right way</h1>
		<p class="lead">
			Biltong Co. was born out of frustration with the pale imitations sold in supermarkets. We
			wanted the real thing — the kind you'd find hanging in a South African kitchen, made with
			proper cuts of beef and time-honoured spices.
		</p>

		<p>
			Every batch is hand-rubbed with a blend of coriander, black pepper, and a splash of apple cider
			vinegar, then slow air-dried over several days. No dehydrators, no shortcuts, no artificial
			preservatives. Just beef, spice, air, and patience.
		</p>

		<p>
			We work in small batches so every order is fresh. That means there's sometimes a short wait,
			but it also means you're never getting something that's been sitting in a warehouse.
		</p>

		<div class="pillars">
			<div class="pillar">
				<h3>Quality cuts</h3>
				<p>We use only silverside and topside beef — the traditional choice for biltong.</p>
			</div>
			<div class="pillar">
				<h3>Traditional recipe</h3>
				<p>Coriander, black pepper, salt, and vinegar. The same recipe for generations.</p>
			</div>
			<div class="pillar">
				<h3>Small batches</h3>
				<p>Made to order, not made to sit on a shelf. Every batch is fresh.</p>
			</div>
			<div class="pillar">
				<h3>No nasties</h3>
				<p>No MSG, no artificial colours or flavours, no preservatives beyond salt.</p>
			</div>
		</div>

		<div class="cta-row">
			<a href="/" class="cta">Browse Products</a>
			<a href="/faq" class="cta-secondary">Common Questions →</a>
		</div>
	</div>
</div>

<style>
	.page {
		max-width: 1100px;
		margin: 0 auto;
		padding: 64px 24px 80px;
	}

	.inner {
		max-width: 680px;
	}

	.eyebrow {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--accent);
		font-weight: 600;
		margin-bottom: 12px;
	}

	h1 {
		font-size: clamp(1.75rem, 4vw, 2.75rem);
		font-weight: 800;
		letter-spacing: -0.02em;
		margin-bottom: 24px;
		line-height: 1.1;
	}

	.lead {
		font-size: 1.1rem;
		color: var(--text-muted);
		line-height: 1.7;
		margin-bottom: 20px;
	}

	p {
		font-size: 0.975rem;
		color: var(--text-muted);
		line-height: 1.75;
		margin-bottom: 16px;
	}

	.pillars {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 12px;
		margin: 40px 0;
	}

	.pillar {
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 20px;
	}

	.pillar h3 {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--accent);
		margin-bottom: 8px;
	}

	.pillar p {
		font-size: 0.85rem;
		margin-bottom: 0;
	}

	.cta-row {
		display: flex;
		align-items: center;
		gap: 20px;
		flex-wrap: wrap;
		margin-top: 8px;
	}

	.cta {
		display: inline-flex;
		align-items: center;
		background: var(--accent);
		color: #0f0b06;
		font-weight: 700;
		padding: 12px 28px;
		border-radius: 8px;
		font-size: 0.9rem;
		transition: background 0.15s;
	}

	.cta:hover {
		background: var(--accent-hover);
	}

	.cta-secondary {
		font-size: 0.9rem;
		color: var(--text-muted);
		transition: color 0.15s;
	}

	.cta-secondary:hover {
		color: var(--text);
	}
</style>
