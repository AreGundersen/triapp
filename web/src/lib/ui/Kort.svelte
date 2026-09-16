<script lang="ts">
	let { lab, val, sub = '' }: { lab: string; val: string; sub?: string } = $props();
</script>

<div class="kort">
	<div class="text-xs text-dim">{lab}</div>
	<div class="font-cond text-2xl leading-tight font-extrabold">{val}</div>
	{#if sub}<div class="mt-0.5 text-xs text-dim">{sub}</div>{/if}
</div>
