<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { StyrkeRad } from '$lib/plan/model';
	import { lagreStyrkeVekt, type Klient } from '$lib/supabase/queries';

	let {
		rader,
		supabase,
		kompakt = false
	}: { rader: StyrkeRad[]; supabase: Klient; kompakt?: boolean } = $props();

	let rediger = $state<string | null>(null);
	let nyVekt = $state('');
	let feil = $state('');
	let jobber = $state(false);

	function start(r: StyrkeRad) {
		rediger = r.ovelse;
		nyVekt = r.vekt ?? '';
		feil = '';
	}

	async function lagre(ovelse: string) {
		jobber = true;
		feil = '';
		try {
			await lagreStyrkeVekt(supabase, ovelse, nyVekt);
			rediger = null;
			await invalidateAll();
		} catch (e) {
			feil = `Kunne ikke lagre: ${(e as Error).message}`;
		} finally {
			jobber = false;
		}
	}
</script>

<ul class="flex flex-col {kompakt ? 'gap-1' : 'divide-y divide-line'}">
	{#each rader as r (r.ovelse)}
		<li class="flex items-center gap-2 text-sm {kompakt ? '' : 'py-1'}">
			<div class="min-w-0 flex-1">
				<span class="font-semibold">{r.ovelse}</span>
				<span class="text-dim"> {r.sett_rep}</span>
			</div>
			{#if rediger === r.ovelse}
				<form class="flex items-center gap-1" onsubmit={(e) => { e.preventDefault(); lagre(r.ovelse); }}>
					<input class="felt w-24 py-0.5 text-sm" bind:value={nyVekt} inputmode="decimal" aria-label="Vekt for {r.ovelse}" />
					<button class="rounded-md bg-blaa px-2 py-1 text-xs font-semibold text-white" type="submit" disabled={jobber}>Lagre</button>
					<button class="px-1 text-xs text-dim underline" type="button" onclick={() => (rediger = null)}>Avbryt</button>
				</form>
			{:else}
				<button
					class="shrink-0 rounded-md border border-line px-2 py-0.5 text-sm {r.vekt ? '' : 'text-dim'}"
					onclick={() => start(r)}
					aria-label="Endre vekt for {r.ovelse}"
					title="Trykk for å endre vekt"
				>
					{r.vekt ?? '—'}
				</button>
			{/if}
		</li>
	{/each}
</ul>
{#if feil}<p class="mt-1 text-xs text-rod" role="alert">{feil}</p>{/if}
