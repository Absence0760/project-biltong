<script lang="ts">
	import { onMount } from 'svelte';
	import { PUBLIC_API_URL } from '$env/static/public';
	import type { Testimonial } from '$lib/sanity';
	import Button from '$lib/Button.svelte';

	const apiUrl = PUBLIC_API_URL;

	let testimonials: Testimonial[] = [];

	onMount(async () => {
		const res = await fetch(`${apiUrl}/testimonials`).catch(() => null);
		if (res && res.ok) {
			try {
				const body = (await res.json()) as { testimonials?: Testimonial[] };
				testimonials = (body.testimonials ?? []).slice(0, 3);
			} catch {
				/* ignore */
			}
		}
	});

	const storyParagraphs: string[] = [
		'Thong Biltong started with a craving in the wrong hemisphere. A South African who landed in Virginia could not find biltong that tasted like home — so he and his wife started curing their own. Friends asked for a bag, then friends-of-friends, and eventually we put a cheeky mascot on the label and called it a brand.',
		'Every batch is still hand-cured in our home kitchen, right here in Virginia. The beef comes fresh from the local butcher down the road — proper cuts, trimmed the same week. Coriander, cracked black pepper, and our house spiced vinegar do the rest. No nitrates, no preservatives, no mystery meat.',
		'Shipped straight from our kitchen to yours. Keep your thong on. Lose your manners.'
	];

	const promisePoints: { title: string; body: string }[] = [
		{
			title: 'Free-range silverside',
			body: 'South African grass-fed beef from farms we\u2019ve actually visited. No feedlot nonsense.'
		},
		{
			title: 'Cured slow, eaten fast',
			body: 'Three-to-five day air-dry in our Cape Town curing room. Tender on the outside, chewy in the middle.'
		},
		{
			title: 'No fillers, no shame',
			body: 'Beef, salt, pepper, coriander, vinegar. That\u2019s it. Read the label — it\u2019s all there.'
		}
	];

	const benefitPoints: { title: string; body: string }[] = [
		{
			title: 'High protein, low sugar',
			body: 'Roughly 50% protein by weight with virtually no added sugar. Fits keto, carnivore, and the 3pm desk-slump crowd.'
		},
		{
			title: 'Nothing synthetic',
			body: 'No nitrates, no preservatives, no liquid smoke, no MSG. Air-dried the old way — five ingredients, all pronounceable.'
		},
		{
			title: 'Real beef, real iron',
			body: 'Grass-fed silverside is a natural source of iron, zinc, and B12 — no fortification, no marketing gymnastics.'
		},
		{
			title: 'Shelf-stable and portable',
			body: 'Chuck a bag in your gym kit, glove box, or hiking pack. No fridge, no crumbs, no regrets.'
		}
	];
</script>

<section class="hero">
	<div class="hero-inner container">
		<div class="hero-text">
			<p class="eyebrow">Cheekily cured biltong</p>
			<h1>Keep your thong on.<br />Lose your manners.</h1>
			<p class="tagline">
				Slow-dried South African biltong from free-range beef — packed by hand,
				shipped nationwide, devoured embarrassingly fast.
			</p>
			<div class="hero-cta">
				<Button href="/shop" variant="ghost-primary">Shop the cuts</Button>
			</div>
		</div>
		<div class="hero-mascot" aria-hidden="true">
			<img src="/logo.svg" alt="" width="280" height="280" />
		</div>
	</div>
</section>

<svelte:head>
	<title>Thong Biltong — Cheekily Cured</title>
	<meta
		name="description"
		content="Slow-dried South African biltong from free-range beef. Coriander, cracked pepper, house spiced vinegar. Shipped nationwide."
	/>
	<meta property="og:title" content="Thong Biltong — Cheekily Cured" />
	<meta
		property="og:description"
		content="Slow-dried South African biltong from free-range beef. Coriander, cracked pepper, house spiced vinegar. Shipped nationwide."
	/>
</svelte:head>

<section class="section">
	<div class="container narrow">
		<p class="eyebrow">Our story</p>
		<h2>How it all began</h2>
		{#each storyParagraphs as paragraph}
			<p class="story-paragraph">{paragraph}</p>
		{/each}
	</div>
</section>

<section class="section">
	<div class="container">
		<p class="eyebrow">Why biltong</p>
		<h2>A snack that earns its keep</h2>
		<div class="promise-grid">
			{#each benefitPoints as point}
				<article class="promise-card">
					<h3>{point.title}</h3>
					<p>{point.body}</p>
				</article>
			{/each}
		</div>
	</div>
</section>

<section class="section section--alt">
	<div class="container">
		<p class="eyebrow">What’s in the bag</p>
		<div class="promise-grid">
			{#each promisePoints as point}
				<article class="promise-card">
					<h3>{point.title}</h3>
					<p>{point.body}</p>
				</article>
			{/each}
		</div>
	</div>
</section>

{#if testimonials.length > 0}
	<section class="section testimonials" aria-label="What customers are saying">
		<div class="container">
			<p class="eyebrow">In their words</p>
			<div class="testimonials__grid">
				{#each testimonials as t (t._id)}
					<blockquote class="testimonial">
						<p class="testimonial__quote">{t.quote}</p>
						<footer class="testimonial__author">
							— {t.author}{#if t.location}<span class="testimonial__loc">, {t.location}</span>{/if}
						</footer>
					</blockquote>
				{/each}
			</div>
		</div>
	</section>
{/if}

<style>
	.hero {
		background: linear-gradient(180deg, #f6f1e6 0%, #e6d7bb 100%);
		padding: var(--space-5) 0 var(--space-4);
	}

	.hero-inner {
		display: grid;
		grid-template-columns: 1.3fr 1fr;
		gap: var(--space-4);
		align-items: center;
	}

	@media (max-width: 720px) {
		.hero-inner {
			grid-template-columns: 1fr;
			text-align: center;
		}
		.hero-mascot {
			order: -1;
		}
	}

	.hero-text :global(h1) {
		color: #2a1a10;
		font-size: clamp(2rem, 5vw, 3.2rem);
		line-height: 1.1;
		margin: 0 0 var(--space-2);
	}

	.tagline {
		font-family: var(--font-display);
		font-style: italic;
		font-size: 1.15rem;
		max-width: 42ch;
		margin: 0 0 var(--space-3);
		color: #4a3021;
	}

	@media (max-width: 720px) {
		.tagline {
			margin-inline: auto;
		}
	}

	.hero-cta {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	@media (max-width: 720px) {
		.hero-cta {
			justify-content: center;
		}
	}

	.hero-mascot {
		display: flex;
		justify-content: center;
	}

	.hero-mascot img {
		max-width: 100%;
		height: auto;
		filter: drop-shadow(0 12px 20px rgba(42, 26, 16, 0.18));
	}

	.narrow {
		max-width: 680px;
	}

	.story-paragraph {
		margin: 0 0 var(--space-2);
		font-size: 1rem;
		line-height: 1.75;
		color: var(--color-ink);
	}

	.promise-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: var(--space-3);
		margin-top: var(--space-2);
	}

	.promise-card {
		background: var(--color-surface);
		border: 1px solid var(--color-rule);
		border-radius: 6px;
		padding: var(--space-3);
	}

	.promise-card h3 {
		margin: 0 0 var(--space-1);
		font-size: 1.1rem;
	}

	.promise-card p {
		margin: 0;
		color: var(--color-ink-soft);
		font-size: 0.95rem;
	}

	.testimonials {
		padding-bottom: var(--space-5);
		padding-top: var(--space-3);
	}

	.testimonials__grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: var(--space-3);
		margin-top: var(--space-2);
	}

	.testimonial {
		margin: 0;
		padding: var(--space-2) 0 0;
		border-top: 1px solid var(--color-rule);
	}

	.testimonial__quote {
		font-family: var(--font-display);
		font-size: 1.05rem;
		line-height: 1.7;
		color: var(--color-ink);
		margin: 0 0 var(--space-2);
		position: relative;
	}

	.testimonial__quote::before {
		content: '\201C';
		font-family: var(--font-display);
		font-size: 3rem;
		line-height: 0.5;
		color: var(--color-bark);
		margin-right: 0.15rem;
		vertical-align: -0.6rem;
	}

	.testimonial__author {
		font-size: 0.85rem;
		color: var(--color-ink-soft);
		letter-spacing: 0.04em;
	}

	.testimonial__loc {
		font-style: italic;
	}

</style>
