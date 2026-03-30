<svelte:head>
	<title>FAQ — Biltong Co.</title>
</svelte:head>

<script lang="ts">
	type FAQ = { q: string; a: string };

	const faqs: FAQ[] = [
		{
			q: 'Where do you deliver?',
			a: 'We currently deliver nationwide. Orders are shipped in sealed, ventilated packaging to keep the biltong in perfect condition during transit.'
		},
		{
			q: 'How long does biltong keep?',
			a: 'Stored in a cool, dry place out of direct sunlight, biltong will keep for 4–6 weeks. Once opened, we recommend consuming within a week or two. Do not refrigerate — it causes condensation and speeds up mould. For longer storage, keep it in a paper bag or breathable container, never airtight.'
		},
		{
			q: "What's your turnaround time?",
			a: "Because we make in small batches, orders typically ship within 3–5 business days of confirmation. We'll always let you know the expected dispatch date when we confirm your order."
		},
		{
			q: 'How does ordering work?',
			a: "Add items to your cart and click \"Send Order via Email\". We'll review your order, confirm availability, and reply with a payment link. Once payment is received, we'll get your order into the next batch."
		},
		{
			q: 'How is the biltong made?',
			a: 'We use silverside and topside beef, hand-rubbed with coriander, black pepper, salt, and apple cider vinegar. The meat is hung and slow air-dried over 4–6 days depending on thickness and humidity. No dehydrators, no artificial preservatives.'
		},
		{
			q: 'Do you offer bulk or wholesale orders?',
			a: 'Yes — get in touch via the order email and mention you\'re interested in bulk pricing. We can accommodate larger orders with a bit more lead time.'
		},
		{
			q: 'Are there any allergens?',
			a: 'Our biltong contains beef, coriander, black pepper, salt, and apple cider vinegar. The droëwors contains pork and beef casings in addition to the same spice blend. We do not use any gluten, dairy, or nut-based ingredients, but our products are prepared in a kitchen that may handle these.'
		},
		{
			q: 'What cut of beef do you use?',
			a: 'We use silverside and topside — traditional biltong cuts. They have the right fat distribution and grain to produce well-textured biltong that\'s not too dry and not too wet.'
		}
	];

	let openIndex = $state<number | null>(null);

	function toggle(i: number) {
		openIndex = openIndex === i ? null : i;
	}
</script>

<div class="page">
	<div class="inner">
		<p class="eyebrow">Got questions?</p>
		<h1>Frequently Asked Questions</h1>
		<p class="lead">Everything you need to know before placing an order.</p>

		<div class="faq-list">
			{#each faqs as faq, i (faq.q)}
				<div class="faq-item" class:open={openIndex === i}>
					<button class="faq-question" onclick={() => toggle(i)} aria-expanded={openIndex === i}>
						<span>{faq.q}</span>
						<svg class="chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
							<polyline points="6 9 12 15 18 9"></polyline>
						</svg>
					</button>
					{#if openIndex === i}
						<p class="faq-answer">{faq.a}</p>
					{/if}
				</div>
			{/each}
		</div>

		<div class="still-stuck">
			<p>Still have a question? Just include it in your order email and we'll answer it when we confirm.</p>
			<a href="/" class="cta">Browse Products</a>
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
		max-width: 720px;
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
		margin-bottom: 12px;
		line-height: 1.1;
	}

	.lead {
		font-size: 1rem;
		color: var(--text-muted);
		margin-bottom: 40px;
	}

	.faq-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-bottom: 48px;
	}

	.faq-item {
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		overflow: hidden;
		transition: border-color 0.15s;
	}

	.faq-item.open {
		border-color: var(--border-accent);
	}

	.faq-question {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 18px 20px;
		text-align: left;
		font-size: 0.925rem;
		font-weight: 500;
		color: var(--text);
		transition: color 0.15s;
	}

	.faq-question:hover {
		color: var(--accent);
	}

	.chevron {
		flex-shrink: 0;
		color: var(--text-muted);
		transition: transform 0.2s;
	}

	.faq-item.open .chevron {
		transform: rotate(180deg);
	}

	.faq-answer {
		padding: 0 20px 18px;
		font-size: 0.875rem;
		color: var(--text-muted);
		line-height: 1.75;
		border-top: 1px solid var(--border);
		padding-top: 16px;
	}

	.still-stuck {
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 28px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.still-stuck p {
		font-size: 0.9rem;
		color: var(--text-muted);
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
		align-self: flex-start;
	}

	.cta:hover {
		background: var(--accent-hover);
	}
</style>
