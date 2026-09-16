<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Diagram from '$lib/ui/Diagram.svelte';
	import Kort from '$lib/ui/Kort.svelte';
	import { TEST_UKER, fmtHms, fmtMs, idag, parseTid, prognose, ukeFor } from '$lib/plan/model';
	import { lagreTest } from '$lib/supabase/queries';

	let { data } = $props();

	const ukeNa = ukeFor(idag());
	const pr = $derived(prognose(data.tester, ukeNa));

	const naermest = TEST_UKER.reduce((a, b) => (Math.abs(b[0] - ukeNa) < Math.abs(a[0] - ukeNa) ? b : a))[0];
	let uke = $state(naermest);
	let css = $state('');
	let ftp = $state('');
	let kg = $state('');
	let k5 = $state('');
	let hm = $state('');
	let kommentar = $state('');
	let melding = $state('');
	let feil = $state('');
	let jobber = $state(false);

	const tall = (s: string) => (s.trim() ? parseFloat(s.replace(',', '.')) : null);

	async function lagre(e: SubmitEvent) {
		e.preventDefault();
		jobber = true;
		feil = '';
		melding = '';
		try {
			await lagreTest(data.supabase, {
				uke,
				dato: idag(),
				css_sek: parseTid(css),
				ftp: tall(ftp),
				kg: tall(kg),
				k5_sek: parseTid(k5),
				hm_sek: parseTid(hm),
				kommentar: kommentar || null
			});
			css = ftp = kg = k5 = hm = kommentar = '';
			melding = 'Test lagret.';
			await invalidateAll();
		} catch (err) {
			feil = (err as Error).message;
		} finally {
			jobber = false;
		}
	}

	const rader = $derived(
		TEST_UKER.map(([u, navn]) => {
			const p = prognose(data.tester, u);
			return { uke: u, navn, css: fmtMs(p.css), ftp: Math.round(p.ftp), svom: fmtHms(p.svom), sykkel: fmtHms(p.sykkel), lop: fmtHms(p.lop), total: fmtHms(p.total), timer: p.total / 3600 };
		})
	);
</script>

<svelte:head><title>Prognose · Are 70.3</title></svelte:head>

<div class="tittel">Prognose</div>
<div class="mt-1 text-dim">Efjord Extreme 70.3 · oppdateres etter hver test</div>

<div class="mt-3 grid grid-cols-3 gap-2">
	<Kort lab="Svøm" val={fmtHms(pr.svom)} />
	<Kort lab="Sykkel" val={fmtHms(pr.sykkel)} />
	<Kort lab="Løp" val={fmtHms(pr.lop)} />
	<Kort lab="T1 + T2" val={fmtHms(pr.t1 + pr.t2)} />
	<div class="col-span-2"><Kort lab="Totalt" val={fmtHms(pr.total)} sub="mål under 7:00 · godt løp 6:30 · drøm 6:15 · ±20 min" /></div>
</div>

<h2 class="font-cond mt-6 text-xl font-bold">Registrer test</h2>
<form class="kort mt-2 flex flex-col gap-2" onsubmit={lagre}>
	<select class="felt" bind:value={uke} aria-label="Uke / test">
		{#each TEST_UKER as [u, navn] (u)}<option value={u}>Uke {u} – {navn}</option>{/each}
	</select>
	<div class="grid grid-cols-3 gap-2">
		<input class="felt" placeholder="CSS m:ss" bind:value={css} aria-label="CSS per 100 m" />
		<input class="felt" inputmode="numeric" placeholder="FTP W" bind:value={ftp} aria-label="FTP" />
		<input class="felt" inputmode="decimal" placeholder="Vekt kg" bind:value={kg} aria-label="Vekt" />
	</div>
	<div class="grid grid-cols-2 gap-2">
		<input class="felt" placeholder="5 km mm:ss" bind:value={k5} aria-label="5 km" />
		<input class="felt" placeholder="Halvmaraton h:mm:ss" bind:value={hm} aria-label="Halvmaraton" />
	</div>
	<input class="felt" placeholder="Kommentar" bind:value={kommentar} aria-label="Kommentar" />
	<button class="knapp" type="submit" disabled={jobber}>Lagre</button>
	{#if melding}<p class="text-sm text-gronn">{melding}</p>{/if}
	{#if feil}<p class="text-sm text-rod" role="alert">{feil}</p>{/if}
</form>

<div class="mt-4 overflow-x-auto">
	<table class="w-full text-left text-sm whitespace-nowrap">
		<thead class="text-xs text-dim">
			<tr><th class="py-1 pr-2">Uke</th><th class="pr-2">Test</th><th class="pr-2">CSS</th><th class="pr-2">FTP</th><th class="pr-2">Svøm</th><th class="pr-2">Sykkel</th><th class="pr-2">Løp</th><th>Totalt</th></tr>
		</thead>
		<tbody class="divide-y divide-line">
			{#each rader as r (r.uke)}
				<tr class={r.uke === ukeNa ? 'bg-lys' : ''}>
					<td class="py-1 pr-2">{r.uke}</td><td class="pr-2">{r.navn}</td><td class="pr-2">{r.css}</td><td class="pr-2">{r.ftp}</td>
					<td class="pr-2">{r.svom}</td><td class="pr-2">{r.sykkel}</td><td class="pr-2">{r.lop}</td><td class="font-semibold">{r.total}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<section class="kort mt-3">
	<h2 class="font-cond text-lg font-bold">Prognose totaltid</h2>
	<Diagram
		config={{
			type: 'line',
			data: { labels: rader.map((r) => `Uke ${r.uke}`), datasets: [{ label: 'timer', data: rader.map((r) => r.timer), borderColor: '#B42318', pointRadius: 3 }] },
			options: { plugins: { legend: { display: false } } }
		}}
		hoyde={220}
	/>
</section>

<details class="kort mt-3 text-sm">
	<summary class="cursor-pointer font-semibold">Modellen</summary>
	<ul class="mt-2 flex list-disc flex-col gap-1 pl-5">
		<li>Svøm = 19 × CSS × 1,08 (åpent, kaldt vann). Uten test: 2:30/100 m.</li>
		<li>Sykkel = 90 km / fart, fart = 24,5 km/t × (W/kg ÷ 2,225)^0,6 — kalibrert mot 25 km/t på kupert Agder med 178 W / 80 kg.</li>
		<li>Løp = snitt av fersk halvmaraton og 5 km (Riegel) × 1,22 for bakker og fire timer i beina.</li>
		<li>T1 6 min, T2 3 min.</li>
	</ul>
</details>
