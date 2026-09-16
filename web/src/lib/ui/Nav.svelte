<script lang="ts">
	import { page } from '$app/state';

	const lenker = [
		{ href: '/', navn: 'I dag', ikon: '🏁' },
		{ href: '/logg', navn: 'Logg', ikon: '📓' },
		{ href: '/fremdrift', navn: 'Fremdrift', ikon: '📈' },
		{ href: '/prognose', navn: 'Prognose', ikon: '🎯' },
		{ href: '/plan', navn: 'Plan', ikon: '🗓️' }
	];
	const aktiv = (href: string) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
</script>

<nav
	class="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur"
	style="padding-bottom: env(safe-area-inset-bottom)"
>
	<ul class="mx-auto flex max-w-lg">
		{#each lenker as l (l.href)}
			<li class="flex-1">
				<a
					href={l.href}
					class="flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold {aktiv(l.href)
						? 'text-blaa'
						: 'text-dim'}"
					aria-current={aktiv(l.href) ? 'page' : undefined}
				>
					<span class="text-xl leading-none" aria-hidden="true">{l.ikon}</span>
					{l.navn}
				</a>
			</li>
		{/each}
	</ul>
</nav>
