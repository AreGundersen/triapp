<script lang="ts">
	import { invalidateAll } from '$app/navigation';

	let { konfigurert, tilkoblet }: { konfigurert: boolean; tilkoblet: boolean } = $props();
	let melding = $state('');
	let feil = $state('');
	let jobber = $state(false);

	async function synk(dager: number) {
		jobber = true;
		melding = '';
		feil = '';
		try {
			const r = await fetch(`/api/strava/sync?dager=${dager}`, { method: 'POST' });
			const j = (await r.json()) as { nye?: number; hopp?: number; feil?: string };
			if (!r.ok || j.feil) throw new Error(j.feil ?? `HTTP ${r.status}`);
			melding = `${j.nye} nye økter lagt inn (${j.hopp} fantes allerede).`;
			await invalidateAll();
		} catch (e) {
			feil = `Synk feilet: ${(e as Error).message}`;
		} finally {
			jobber = false;
		}
	}

	let bekreftFra = $state(false);

	async function kobleFra() {
		bekreftFra = false;
		await fetch('/api/strava/sync', { method: 'DELETE' });
		await invalidateAll();
	}
</script>

{#if !konfigurert}
	<p class="text-xs text-dim">Strava er ikke konfigurert – legg inn STRAVA_CLIENT_ID og STRAVA_CLIENT_SECRET (se README).</p>
{:else if !tilkoblet}
	<a class="knapp" href="/api/strava/connect" data-sveltekit-reload>Koble til Strava</a>
{:else}
	<div class="grid grid-cols-2 gap-2">
		<button class="knapp" onclick={() => synk(30)} disabled={jobber}>Synk siste 30 dager</button>
		<button class="knapp knapp-lys" onclick={() => synk(365)} disabled={jobber}>Synk hele året</button>
	</div>
	{#if melding}<p class="mt-2 text-sm text-gronn">{melding}</p>{/if}
	{#if feil}<p class="mt-2 text-sm text-rod" role="alert">{feil}</p>{/if}
	{#if bekreftFra}
		<div class="mt-2 flex items-center gap-3 text-xs">
			<button class="rounded-md bg-rod px-2 py-1 font-semibold text-white" onclick={kobleFra}>Ja, koble fra</button>
			<button class="text-dim underline" onclick={() => (bekreftFra = false)}>Avbryt</button>
		</div>
	{:else}
		<button class="mt-2 text-xs text-dim underline" onclick={() => (bekreftFra = true)}>Koble fra Strava</button>
	{/if}
{/if}
