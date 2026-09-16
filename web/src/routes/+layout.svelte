<script lang="ts">
	import './layout.css';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import Nav from '$lib/ui/Nav.svelte';

	let { data, children } = $props();

	// Når innlogging/utlogging skjer i nettleseren, last data på nytt.
	$effect(() => {
		const { data: lytter } = data.supabase.auth.onAuthStateChange((_, nySesjon) => {
			if (nySesjon?.expires_at !== data.session?.expires_at) invalidate('supabase:auth');
		});
		return () => lytter.subscription.unsubscribe();
	});

	const visNav = $derived(!!data.session && !page.url.pathname.startsWith('/login'));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Are 70.3</title>
</svelte:head>

<div class="mx-auto min-h-dvh w-full max-w-lg px-4 pt-4 {visNav ? 'pb-24' : 'pb-8'}">
	{@render children()}
</div>

{#if visNav}
	<Nav />
{/if}
