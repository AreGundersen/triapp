<script lang="ts">
	import { Chart, type ChartConfiguration } from 'chart.js/auto';

	let { config, hoyde = 260 }: { config: ChartConfiguration; hoyde?: number } = $props();
	let canvas: HTMLCanvasElement;

	$effect(() => {
		const c = new Chart(canvas, {
			...config,
			options: {
				responsive: true,
				maintainAspectRatio: false,
				...config.options,
				plugins: { legend: { labels: { boxWidth: 12 } }, ...config.options?.plugins }
			}
		});
		return () => c.destroy();
	});
</script>

<div style="height:{hoyde}px" class="relative w-full">
	<canvas bind:this={canvas}></canvas>
</div>
