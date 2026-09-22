<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Fremgang from '$lib/ui/Fremgang.svelte';
	import Kort from '$lib/ui/Kort.svelte';
	import StyrkeListe from '$lib/ui/StyrkeListe.svelte';
	import {
		DAGER,
		DAGER_KORT,
		LOP,
		dagensOkter,
		dagerMellom,
		ernaering,
		faseFor,
		fmtHms,
		formatDato,
		formatDatoKort,
		idag,
		kommendeLop,
		leggTilDager,
		mandag,
		medVekter,
		prognose,
		styrkeoktI,
		ukedag,
		ukeFor,
		ukeplanRad,
		xp,
		type Okt
	} from '$lib/plan/model';
	import { settAvhuking, type Avhuking } from '$lib/supabase/queries';

	let { data } = $props();

	let dato = $state(idag());
	let feil = $state('');
	// Optimistiske overstyringer legges oppå data fra databasen, så avkryssing føles umiddelbar
	// og siden er riktig allerede ved første tegning (ingen blink).
	let lokalt = $state<Record<string, Avhuking>>({});
	const avh = $derived<Record<string, Avhuking>>({ ...data.avhuking, ...lokalt });

	const uke = $derived(ukeFor(dato));
	const fase = $derived(faseFor(uke));
	const okter = $derived(dagensOkter(dato));
	const man = $derived(mandag(dato));
	const up = $derived(ukeplanRad(uke));
	const dagensAvh = $derived(avh[dato] ?? { morgen: false, kveld: false });
	const planAndel = $derived(Math.min(1, Math.max(0, (uke - 1) / 47)));
	const delmaal = $derived(kommendeLop(dato).filter((l) => l.dato !== LOP));

	const ukeLogg = $derived(data.logg.filter((r) => r.dato >= man && r.dato < leggTilDager(man, 7)));
	const sumUke = (type: string, felt: 'km' | 'minutter') =>
		ukeLogg.filter((r) => r.type === type).reduce((s, r) => s + Number(r[felt]), 0);

	const niva = $derived(xp(data.logg));
	const pr = $derived(prognose(data.tester, uke));
	const ern = $derived(ernaering(okter, pr.kg));

	async function huk(slot: 'morgen' | 'kveld', verdi: boolean) {
		const d = dato;
		const ny = { ...dagensAvh, [slot]: verdi };
		lokalt = { ...lokalt, [d]: ny };
		feil = '';
		try {
			await settAvhuking(data.supabase, d, ny);
			await invalidateAll();
		} catch (e) {
			feil = `Kunne ikke lagre: ${(e as Error).message}`;
		} finally {
			// Databasen er fasit igjen (ved feil faller avkryssingen tilbake).
			const { [d]: _, ...rest } = lokalt;
			lokalt = rest;
		}
	}

	const ukesrad = $derived([
		{ navn: 'Svøm', utf: Math.round(sumUke('Svøm', 'km') * 10) / 10, mal: up?.svom_km ?? 0, enh: 'km', farge: 'var(--color-svom)' },
		{ navn: 'Sykkel', utf: Math.round((sumUke('Sykkel', 'minutter') / 60) * 10) / 10, mal: up?.sykkel_t ?? 0, enh: 't', farge: 'var(--color-oransje)' },
		{ navn: 'Løp', utf: Math.round(sumUke('Løp', 'km')), mal: up?.lop_km ?? 0, enh: 'km', farge: 'var(--color-gronn)' },
		{ navn: 'Styrke', utf: ukeLogg.filter((r) => r.type === 'Styrke').length, mal: up?.styrke_okter ?? 0, enh: 'økter', farge: 'var(--color-blaa)' }
	]);
	const fmtTall = (n: number) => String(n).replace('.', ',');
</script>

<svelte:head><title>I dag · Are 70.3</title></svelte:head>

<header class="flex items-start justify-between gap-3">
	<div>
		<div class="tittel">{DAGER[ukedag(dato)]}</div>
		<div class="mt-1 text-dim">{formatDato(dato)} · uke {uke} · {fase}</div>
	</div>
	<div class="text-right">
		<div class="font-cond text-4xl leading-none font-extrabold text-rod">{dagerMellom(dato, LOP)}</div>
		<div class="text-xs text-dim">dager til Efjord</div>
	</div>
</header>

<div class="mt-3 flex items-center gap-2">
	<button class="knapp knapp-lys w-auto px-3 py-1.5" onclick={() => (dato = leggTilDager(dato, -1))} aria-label="Forrige dag">‹</button>
	<input type="date" class="felt flex-1 py-1.5" bind:value={dato} aria-label="Velg dato" />
	<button class="knapp knapp-lys w-auto px-3 py-1.5" onclick={() => (dato = leggTilDager(dato, 1))} aria-label="Neste dag">›</button>
	{#if dato !== idag()}
		<button class="knapp knapp-lys w-auto px-3 py-1.5" onclick={() => (dato = idag())}>I dag</button>
	{/if}
</div>

<div class="mt-3">
	<Fremgang andel={planAndel} tekst="{Math.round(planAndel * 100)} % av planen" />
</div>
{#if delmaal.length}
	<p class="mt-2 text-xs text-dim">
		{#each delmaal as l, i (l.navn)}{i ? ' · ' : ''}<span class="font-semibold text-ink">{l.navn}</span> om {l.dager} dager ({formatDatoKort(l.dato)}){/each}
	</p>
{/if}

{#if feil}<p class="mt-3 text-sm text-rod" role="alert">{feil}</p>{/if}

{#snippet oktkort(slot: 'morgen' | 'kveld', okt: Okt, farge: string, done: boolean)}
	{@const styrke = medVekter(styrkeoktI(okt.tekst) ?? [], data.vekter)}
	<section class="kort mt-3">
		<div class="flex items-start justify-between gap-3">
			<div class="min-w-0">
				<div class="font-cond text-base font-bold tracking-wide" style="color:{farge}">
					{slot === 'morgen' ? 'Morgen' : 'Kveld'} · kl. {okt.tid}
				</div>
				<div class="font-cond mt-0.5 text-2xl leading-tight font-semibold">{okt.tekst}</div>
			</div>
			<label class="flex shrink-0 items-center gap-2 text-sm font-semibold">
				<input
					type="checkbox"
					class="size-6 accent-gronn"
					checked={done}
					onchange={(e) => huk(slot, e.currentTarget.checked)}
				/>
				Utført
			</label>
		</div>
		{#if styrke.length}
			<details class="mt-2" open={!done}>
				<summary class="cursor-pointer text-sm font-semibold text-dim">Øvelser · trykk på vekten for å endre</summary>
				<div class="mt-1"><StyrkeListe rader={styrke} supabase={data.supabase} kompakt /></div>
			</details>
		{/if}
	</section>
{/snippet}

{@render oktkort('morgen', okter.morgen, 'var(--color-gronn)', dagensAvh.morgen)}
{@render oktkort('kveld', okter.kveld, 'var(--color-oransje)', dagensAvh.kveld)}

<h2 class="font-cond mt-6 text-xl font-bold">Denne uka</h2>
{#if up}
	<div class="mt-2 flex flex-col gap-3">
		{#each ukesrad as r (r.navn)}
			<div>
				<div class="flex justify-between text-sm">
					<span class="font-semibold">{r.navn}</span>
					<span class="text-dim">{fmtTall(r.utf)} / {fmtTall(r.mal)} {r.enh}</span>
				</div>
				<div class="mt-1"><Fremgang andel={r.mal ? r.utf / r.mal : 0} farge={r.farge} /></div>
			</div>
		{/each}
	</div>
	{#if up.fokus && up.fokus !== '–'}
		<p class="mt-3 rounded-xl bg-lys px-3 py-2 text-sm">{up.fokus}</p>
	{/if}
{:else}
	<p class="mt-2 text-sm text-dim">Denne datoen er utenfor planen.</p>
{/if}

<div class="mt-4 grid grid-cols-7 gap-1">
	{#each DAGER_KORT as navn, i (navn)}
		{@const d = leggTilDager(man, i)}
		{@const a = avh[d] ?? { morgen: false, kveld: false }}
		<button
			class="rounded-lg py-1.5 text-center text-xs {d === dato ? 'bg-lys font-semibold text-ink' : 'text-dim'} {d < idag() && d !== dato ? 'opacity-60' : ''}"
			onclick={() => (dato = d)}
		>
			<div>{navn}</div>
			<div class="text-base tracking-widest text-gronn">{a.morgen ? '●' : '○'}{a.kveld ? '●' : '○'}</div>
		</button>
	{/each}
</div>

<div class="mt-4 grid grid-cols-2 gap-3">
	<Kort lab="Nivå" val="{niva.niva} · {niva.navn}" sub="{niva.xp} XP · {niva.til_neste} til neste" />
	<Kort lab="Prognose" val={fmtHms(pr.total)} sub="svøm {fmtHms(pr.svom)} · sykkel {fmtHms(pr.sykkel)} · løp {fmtHms(pr.lop)}" />
</div>

<details class="kort mt-3">
	<summary class="cursor-pointer font-semibold">Ernæring i dag</summary>
	<p class="mt-2 text-sm"><span class="font-semibold">{ern.dagstype}</span> · karbo {ern.karbo} · protein {ern.protein} · væske {ern.vaeske}</p>
	<ul class="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm">
		<li><span class="font-semibold">Før morgenøkt:</span> {ern.for_}</li>
		<li><span class="font-semibold">Under økt:</span> {ern.under}</li>
		<li><span class="font-semibold">Etter økt:</span> {ern.etter}</li>
		<li><span class="font-semibold">Kveld:</span> {ern.kveld}</li>
	</ul>
	<p class="mt-2 text-xs text-dim">Generelle retningslinjer for utholdenhetsidrett, ikke individuell kostholdsveiledning.</p>
</details>

<form method="POST" action="/logout" class="mt-8 text-center">
	<button class="text-xs text-dim underline" type="submit">Logg ut ({data.user?.email})</button>
</form>
