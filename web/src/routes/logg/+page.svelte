<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import StravaSynk from '$lib/ui/StravaSynk.svelte';
	import seed from '$lib/plan/data/logg_seed.json';
	import { TYPER, formatDatoKort, idag } from '$lib/plan/model';
	import { importerSeed, leggTilLogg, slettLogg } from '$lib/supabase/queries';

	let { data } = $props();

	let dato = $state(idag());
	let type = $state('Løp');
	let km = $state('');
	let minutter = $state('');
	let navn = $state('');
	let filter = $state<string[]>(TYPER.filter((t) => t !== 'Annet'));
	let melding = $state('');
	let feil = $state('');
	let jobber = $state(false);

	const vis = $derived(data.logg.filter((r) => filter.includes(r.type)));
	const fmt = (n: number) => String(n).replace('.', ',');

	async function kjor(fn: () => Promise<string>) {
		jobber = true;
		feil = '';
		melding = '';
		try {
			melding = await fn();
			await invalidateAll();
		} catch (e) {
			feil = (e as Error).message;
		} finally {
			jobber = false;
		}
	}

	function leggTil(e: SubmitEvent) {
		e.preventDefault();
		kjor(async () => {
			await leggTilLogg(data.supabase, {
				dato,
				type,
				km: parseFloat(km.replace(',', '.')) || 0,
				minutter: parseFloat(minutter.replace(',', '.')) || 0,
				navn
			});
			km = '';
			minutter = '';
			navn = '';
			return 'Økt lagt til.';
		});
	}

	// To-trinns sletting i siden i stedet for nettleserens confirm(), som fryser siden
	// og oppfører seg dårlig i en installert PWA.
	let slettId = $state<number | null>(null);

	function slett(id: number) {
		slettId = null;
		kjor(async () => {
			await slettLogg(data.supabase, id);
			return 'Økt slettet.';
		});
	}

	function importer() {
		kjor(async () => `${await importerSeed(data.supabase, seed)} økter importert.`);
	}

	function toggle(t: string) {
		filter = filter.includes(t) ? filter.filter((x) => x !== t) : [...filter, t];
	}
</script>

<svelte:head><title>Logg · Are 70.3</title></svelte:head>

<div class="tittel">Logg</div>

<form class="kort mt-3 flex flex-col gap-2" onsubmit={leggTil}>
	<div class="grid grid-cols-2 gap-2">
		<input type="date" class="felt" bind:value={dato} required aria-label="Dato" />
		<select class="felt" bind:value={type} aria-label="Type">
			{#each TYPER as t (t)}<option value={t}>{t}</option>{/each}
		</select>
		<input class="felt" inputmode="decimal" placeholder="Km" bind:value={km} aria-label="Km" />
		<input class="felt" inputmode="numeric" placeholder="Minutter" bind:value={minutter} aria-label="Minutter" />
	</div>
	<input class="felt" placeholder="Notat, f.eks. 6x3 min Z4, følte meg sterk" bind:value={navn} aria-label="Notat" />
	<button class="knapp" type="submit" disabled={jobber}>Legg til økt</button>
</form>

{#if melding}<p class="mt-2 text-sm text-gronn">{melding}</p>{/if}
{#if feil}<p class="mt-2 text-sm text-rod" role="alert">{feil}</p>{/if}

<div class="mt-3">
	{#if page.url.searchParams.get('strava') === 'ok'}
		<p class="mb-2 text-sm text-gronn">Strava koblet til. Trykk «Synk» for å hente økter.</p>
	{:else if page.url.searchParams.get('strava') === 'feil'}
		<p class="mb-2 text-sm text-rod" role="alert">Kunne ikke koble til Strava. Prøv igjen.</p>
	{/if}
	<StravaSynk konfigurert={data.stravaKonfigurert} tilkoblet={data.stravaTilkoblet} />
</div>

{#if data.logg.length === 0}
	<div class="kort mt-4 text-sm">
		<p>Ingen økter ennå. Legg til over, eller importer utgangspunktet fra Strava-eksporten (juni–sep 2026).</p>
		<button class="knapp knapp-lys mt-3" onclick={importer} disabled={jobber}>Importer historikk</button>
	</div>
{:else}
	<div class="mt-4 flex flex-wrap gap-1.5">
		{#each TYPER as t (t)}
			<button
				class="rounded-full border px-3 py-1 text-xs font-semibold {filter.includes(t) ? 'border-blaa bg-blaa text-white' : 'border-line text-dim'}"
				onclick={() => toggle(t)}
				aria-pressed={filter.includes(t)}
			>
				{t}
			</button>
		{/each}
	</div>
	<ul class="mt-3 divide-y divide-line">
		{#each vis as r (r.id)}
			<li class="flex items-center gap-3 py-2 text-sm">
				<div class="w-14 shrink-0 text-dim">{formatDatoKort(r.dato)}</div>
				<div class="min-w-0 flex-1">
					<div class="font-semibold">{r.type} <span class="font-normal text-dim">· {fmt(r.km)} km · {fmt(r.minutter)} min</span></div>
					{#if r.navn}<div class="truncate text-dim">{r.navn}</div>{/if}
				</div>
				<div class="text-xs text-dim">{r.kilde}</div>
				{#if slettId === r.id}
					<button class="rounded-md bg-rod px-2 py-1 text-xs font-semibold text-white" onclick={() => slett(r.id)} disabled={jobber}>Slett</button>
					<button class="px-1 text-xs text-dim underline" onclick={() => (slettId = null)}>Avbryt</button>
				{:else}
					<button class="px-1 text-dim" onclick={() => (slettId = r.id)} aria-label="Slett økt" disabled={jobber}>✕</button>
				{/if}
			</li>
		{/each}
	</ul>
	<p class="mt-3 text-xs text-dim">{vis.length} av {data.logg.length} økter</p>
{/if}
