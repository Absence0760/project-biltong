<script lang="ts">
	const paragraphs = [
		'Thong Biltong started as a private joke between two friends in Muizenberg who could not stop arguing about whose biltong was better. Turns out: neither of ours. So we borrowed a third friend\u2019s grandmother\u2019s recipe, argued about that too, and eventually landed on something we were all willing to sign off on.',
		'We cure every batch in a small room above the workshop. Free-range silverside goes into a brine of sea salt, malt vinegar, coriander and cracked pepper, then hangs in controlled air for three to five days depending on the cut and the weather. No liquid smoke, no dextrose, no \u201Cnatural flavour\u201D hiding a syllabus of things you can\u2019t pronounce.',
		'The name is a joke. The biltong is serious.'
	];

	const values = [
		{ heading: 'Free-range beef', body: 'Grass-fed silverside from two family farms in the Eastern Cape. Named. Visited. Paid fairly.' },
		{ heading: 'Small batches', body: 'We cure roughly 40kg at a time. When it\u2019s gone, it\u2019s gone — keep an eye on the shop.' },
		{ heading: 'Plain labels', body: 'Every ingredient on the bag. If it\u2019s not on the bag it\u2019s not in the biltong.' }
	];
</script>

<svelte:head>
	<title>About — Thong Biltong</title>
	<meta
		name="description"
		content="The story behind Thong Biltong — a Cape Town biltong brand with a cartoon bull in a thong and absolutely no cornflour."
	/>
	<meta property="og:title" content="About — Thong Biltong" />
	<meta
		property="og:description"
		content="The story behind Thong Biltong — a Cape Town biltong brand with a cartoon bull in a thong and absolutely no cornflour."
	/>
</svelte:head>

<section class="section">
	<div class="container narrow">
		<p class="eyebrow">About</p>
		<h1>Our story</h1>
		{#each paragraphs as p}
			<p>{p}</p>
		{/each}
	</div>
</section>

<section class="section section--alt">
	<div class="container">
		<p class="eyebrow">What we stand for</p>
		<div class="values">
			{#each values as v}
				<article class="value-card">
					<h2>{v.heading}</h2>
					<p>{v.body}</p>
				</article>
			{/each}
		</div>
	</div>
</section>

<style>
	.narrow {
		max-width: 680px;
	}

	.narrow p {
		margin: 0 0 var(--space-2);
		font-size: 1rem;
		line-height: 1.75;
		color: var(--color-ink);
	}

	.values {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: var(--space-3);
		margin-top: var(--space-2);
	}

	.value-card {
		background: var(--color-surface);
		border: 1px solid var(--color-rule);
		border-radius: 6px;
		padding: var(--space-3);
	}

	.value-card h2 {
		font-size: 1.1rem;
		margin: 0 0 var(--space-1);
	}

	.value-card p {
		margin: 0;
		font-size: 0.95rem;
		color: var(--color-ink-soft);
	}
</style>
