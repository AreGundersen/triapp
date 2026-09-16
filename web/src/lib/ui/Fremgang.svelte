<script lang="ts">
	let {
		andel,
		farge = 'var(--color-blaa)',
		tekst = ''
	}: { andel: number; farge?: string; tekst?: string } = $props();
	const pst = $derived(Math.round(Math.min(1, Math.max(0, andel)) * 100));
</script>

<div class="h-2 w-full overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={pst} aria-valuemin="0" aria-valuemax="100" aria-label={tekst || undefined}>
	<div class="h-full rounded-full transition-[width]" style="width:{pst}%; background:{farge}"></div>
</div>
{#if tekst}<div class="mt-1 text-xs text-dim">{tekst}</div>{/if}
