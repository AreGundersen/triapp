<script lang="ts">
	import { DAGER_KORT, FASER, STYRKE, UKEPLAN, UKESTRUKTUR, faseFor, formatDatoKort, idag, medVekter, strukturKolonne, ukeFor, type StrukturKolonne } from '$lib/plan/model';
	import StyrkeListe from '$lib/ui/StyrkeListe.svelte';

	let { data } = $props();

	const ukeNa = ukeFor(idag());
	const faseNa = faseFor(ukeNa);
	const faner = ['Ukeplan', 'Ukestruktur', 'Faser', 'Styrke'] as const;
	let fane = $state<(typeof faner)[number]>('Ukeplan');
	let kol = $state<StrukturKolonne>(strukturKolonne(faseNa));
	const kolNavn: Record<StrukturKolonne, string> = { base: 'Overgang / Grunnlag', bygg1: 'Bygg 1', bygg2: 'Bygg 2 / Topp' };
	const okter = [...new Set(STYRKE.map((s) => s.okt))];
	const fmt = (n: number) => String(n).replace('.', ',');
</script>

<svelte:head><title>Plan · Are 70.3</title></svelte:head>

<div class="tittel">Plan</div>

<div class="mt-3 flex gap-1 rounded-xl bg-flate p-1" role="tablist">
	{#each faner as f (f)}
		<button
			role="tab"
			aria-selected={fane === f}
			class="flex-1 rounded-lg py-1.5 text-sm font-semibold {fane === f ? 'bg-white shadow-sm' : 'text-dim'}"
			onclick={() => (fane = f)}
		>
			{f}
		</button>
	{/each}
</div>

{#if fane === 'Ukeplan'}
	<div class="mt-3 overflow-x-auto">
		<table class="w-full text-left text-sm whitespace-nowrap">
			<thead class="text-xs text-dim">
				<tr><th class="py-1 pr-2">Uke</th><th class="pr-2">Man</th><th class="pr-2">Fase</th><th class="pr-2">Svøm</th><th class="pr-2">Sykkel</th><th class="pr-2">Løp</th><th class="pr-2">Styrke</th><th>Timer</th></tr>
			</thead>
			<tbody class="divide-y divide-line">
				{#each UKEPLAN as u (u.uke)}
					<tr class={u.uke === ukeNa ? 'bg-lys font-semibold' : ''}>
						<td class="py-1 pr-2">{u.uke}</td><td class="pr-2">{formatDatoKort(u.mandag)}</td><td class="pr-2">{u.fase}</td>
						<td class="pr-2">{fmt(u.svom_km)} km</td><td class="pr-2">{fmt(u.sykkel_t)} t</td><td class="pr-2">{u.lop_km} km</td>
						<td class="pr-2">{fmt(u.styrke_okter)}</td><td>{fmt(u.timer)}</td>
					</tr>
					{#if u.fokus && u.fokus !== '–'}
						<tr class="text-xs text-dim"><td></td><td colspan="7" class="pb-1 whitespace-normal">{u.fokus}</td></tr>
					{/if}
				{/each}
			</tbody>
		</table>
	</div>
{:else if fane === 'Ukestruktur'}
	<div class="mt-3 flex gap-1.5">
		{#each Object.entries(kolNavn) as [k, navn] (k)}
			<button class="rounded-full border px-3 py-1 text-xs font-semibold {kol === k ? 'border-blaa bg-blaa text-white' : 'border-line text-dim'}" onclick={() => (kol = k as StrukturKolonne)}>{navn}</button>
		{/each}
	</div>
	<ul class="mt-3 divide-y divide-line">
		{#each DAGER_KORT as dag, i (dag)}
			{@const m = UKESTRUKTUR.find((r) => r.ukedag === i + 1 && r.slot === 'morgen')}
			{@const k = UKESTRUKTUR.find((r) => r.ukedag === i + 1 && r.slot === 'kveld')}
			<li class="py-2 text-sm">
				<div class="font-cond text-base font-bold">{dag}</div>
				{#if m}<div><span class="text-dim">{m.tid}</span> {m[kol]}</div>{/if}
				{#if k}<div><span class="text-dim">{k.tid}</span> {k[kol]}</div>{/if}
			</li>
		{/each}
	</ul>
{:else if fane === 'Faser'}
	<div class="mt-3 flex flex-col gap-2">
		{#each FASER as f (f.fase)}
			<details class="kort text-sm" open={f.fase === faseNa}>
				<summary class="cursor-pointer font-semibold">{f.fase} <span class="font-normal text-dim">— {f.uker}</span></summary>
				<p class="mt-2"><span class="font-semibold">Svøm:</span> {f.svom}</p>
				<p class="mt-1"><span class="font-semibold">Sykkel:</span> {f.sykkel}</p>
				<p class="mt-1"><span class="font-semibold">Løp:</span> {f.lop}</p>
				<p class="mt-1 text-dim">{f.tester}</p>
			</details>
		{/each}
	</div>
{:else}
	<div class="mt-3 flex flex-col gap-2">
		{#each okter as okt (okt)}
			<details class="kort text-sm">
				<summary class="cursor-pointer font-semibold">{okt}</summary>
				<div class="mt-2"><StyrkeListe rader={medVekter(STYRKE.filter((s) => s.okt === okt), data.vekter)} supabase={data.supabase} /></div>
			</details>
		{/each}
		<p class="text-xs text-dim">Trykk på vekten for å endre. Endringer lagres i databasen og vises også på forsiden.</p>
		{#if data.historikk.length}
			<details class="kort text-sm">
				<summary class="cursor-pointer font-semibold">Siste endringer</summary>
				<ul class="mt-2 divide-y divide-line">
					{#each data.historikk as h (h.id)}
						<li class="flex gap-3 py-1"><span class="w-16 shrink-0 text-dim">{formatDatoKort(h.dato)}</span><span class="flex-1">{h.ovelse}</span><span class="font-semibold">{h.vekt ?? '—'}</span></li>
					{/each}
				</ul>
			</details>
		{/if}
	</div>
{/if}
