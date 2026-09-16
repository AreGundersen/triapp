<script lang="ts">
	import Diagram from '$lib/ui/Diagram.svelte';
	import Fremgang from '$lib/ui/Fremgang.svelte';
	import { UKEPLAN, idag, mandag, merker, ukeFor, xp } from '$lib/plan/model';

	let { data } = $props();

	const i = idag();
	const ukeNa = ukeFor(i);
	const uker = UKEPLAN.map((r) => r.uke);

	/** Sum per uke (nøkkel = mandag) for en type og et felt. */
	function perUke(type: string, felt: 'km' | 'minutter', div = 1) {
		const m = new Map<string, number>();
		for (const r of data.logg) {
			if (type && r.type !== type) continue;
			const k = mandag(r.dato);
			m.set(k, (m.get(k) ?? 0) + Number(r[felt]) / div);
		}
		return UKEPLAN.map((u) => (u.mandag > i ? null : Math.round((m.get(u.mandag) ?? 0) * 10) / 10));
	}

	const serier = [
		{ navn: 'Løp', felt: 'km' as const, plan: 'lop_km' as const, enh: 'km', div: 1, farge: '#4E9A3D' },
		{ navn: 'Sykkel', felt: 'minutter' as const, plan: 'sykkel_t' as const, enh: 'timer', div: 60, farge: '#D97A2B' },
		{ navn: 'Svøm', felt: 'km' as const, plan: 'svom_km' as const, enh: 'km', div: 1, farge: '#2E75B6' }
	];

	const niva = $derived(xp(data.logg));
	const merkeliste = $derived(merker(data.logg, ukeNa));
</script>

<svelte:head><title>Fremdrift · Are 70.3</title></svelte:head>

<div class="tittel">Fremdrift</div>

{#each serier as s (s.navn)}
	<section class="kort mt-3">
		<h2 class="font-cond text-lg font-bold">{s.navn} – {s.enh} per uke</h2>
		<Diagram
			config={{
				type: 'bar',
				data: {
					labels: uker,
					datasets: [
						{ label: 'Plan', data: UKEPLAN.map((u) => u[s.plan]), backgroundColor: '#d9d9d9' },
						{ label: 'Utført', data: perUke(s.navn, s.felt, s.div), backgroundColor: s.farge }
					]
				},
				options: { scales: { x: { ticks: { maxTicksLimit: 12 } } } }
			}}
			hoyde={220}
		/>
	</section>
{/each}

<section class="kort mt-3">
	<h2 class="font-cond text-lg font-bold">Timer per uke</h2>
	<Diagram
		config={{
			type: 'line',
			data: {
				labels: uker,
				datasets: [
					{ label: 'Plan', data: UKEPLAN.map((u) => u.timer), borderColor: '#9ca3af', pointRadius: 0 },
					{ label: 'Utført', data: perUke('', 'minutter', 60), borderColor: '#1F3864', pointRadius: 2 }
				]
			},
			options: { scales: { x: { ticks: { maxTicksLimit: 12 } } } }
		}}
		hoyde={220}
	/>
</section>

<h2 class="font-cond mt-6 text-xl font-bold">Nivå {niva.niva} – {niva.navn}</h2>
<div class="mt-2"><Fremgang andel={niva.andel} tekst="{niva.xp} XP · {niva.til_neste} til neste nivå" /></div>

<ul class="mt-4 flex flex-col gap-2">
	{#each merkeliste as m (m.navn)}
		<li class="flex items-center gap-2 text-sm">
			<span class="text-lg" aria-hidden="true">{m.ok ? '🟢' : '⚪'}</span>
			<span class="font-semibold">{m.navn}</span>
			<span class="text-dim">— {m.krav}</span>
		</li>
	{/each}
</ul>
