<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();
	let sender = $state(false);
</script>

<svelte:head><title>Logg inn · Are 70.3</title></svelte:head>

<div class="flex min-h-[80dvh] flex-col justify-center">
	<div class="tittel">Are 70.3</div>
	<div class="mt-1 text-dim">Efjord Extreme · 7. august 2027</div>

	<form
		method="POST"
		class="mt-8 flex flex-col gap-3"
		use:enhance={() => {
			sender = true;
			return async ({ update }) => {
				await update();
				sender = false;
			};
		}}
	>
		<label class="text-sm font-semibold" for="epost">E-post</label>
		<input
			id="epost"
			name="epost"
			type="email"
			autocomplete="email"
			required
			class="felt"
			value={form?.epost ?? ''}
		/>
		<label class="text-sm font-semibold" for="passord">Passord</label>
		<input
			id="passord"
			name="passord"
			type="password"
			autocomplete="current-password"
			required
			class="felt"
		/>
		{#if form?.feil}
			<p class="text-sm text-rod" role="alert">{form.feil}</p>
		{/if}
		<button class="knapp mt-2" type="submit" disabled={sender}>
			{sender ? 'Logger inn…' : 'Logg inn'}
		</button>
	</form>
	<p class="mt-6 text-xs text-dim">
		Brukere opprettes i Supabase (Authentication → Users). Glemt passord? Sett nytt der.
	</p>
</div>
