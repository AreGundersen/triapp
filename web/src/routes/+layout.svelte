<script lang="ts">
	import './layout.css';
	import { browser } from '$app/environment';
	import { invalidate, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import Nav from '$lib/ui/Nav.svelte';
	import { pwaInfo } from 'virtual:pwa-info';

	let { data, children } = $props();
	const manifestTag = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : '');

	// Når innlogging/utlogging skjer i nettleseren, last data på nytt.
	$effect(() => {
		const { data: lytter } = data.supabase.auth.onAuthStateChange((_, nySesjon) => {
			if (nySesjon?.expires_at !== data.session?.expires_at) invalidate('supabase:auth');
		});
		return () => lytter.subscription.unsubscribe();
	});

	const visNav = $derived(!!data.session && !page.url.pathname.startsWith('/login'));

	// Automatisk Strava-synk når appen åpnes, høyst hver 6. time (tidsstempel i localStorage).
	$effect(() => {
		if (!browser || !data.stravaTilkoblet) return;
		let sist = 0;
		try {
			sist = Number(localStorage.getItem('sisteSynk') ?? 0);
		} catch {
			/* privat modus o.l. */
		}
		if (Date.now() - sist < 6 * 3600_000) return;
		try {
			localStorage.setItem('sisteSynk', String(Date.now()));
		} catch {
			/* ignorer */
		}
		fetch('/api/strava/sync?dager=14', { method: 'POST' })
			.then((r) => r.json())
			.then((j: { nye?: number; flettet?: number; avhuket?: number }) => {
				if (j.nye || j.flettet || j.avhuket) invalidateAll();
			})
			.catch(() => {});
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Are 70.3</title>
	{@html manifestTag}
</svelte:head>

<div class="mx-auto min-h-dvh w-full max-w-lg px-4 pt-4 {visNav ? 'pb-24' : 'pb-8'}">
	{@render children()}
</div>

{#if visNav}
	<Nav />
{/if}
