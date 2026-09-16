import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		}),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			includeAssets: ['apple-touch-icon.png', 'favicon-64.png', 'robots.txt'],
			manifest: {
				name: 'Are 70.3',
				short_name: 'Are 70.3',
				description: 'Treningsplan mot Efjord Extreme 70.3',
				lang: 'nb',
				start_url: '/',
				scope: '/',
				display: 'standalone',
				background_color: '#ffffff',
				theme_color: '#1F3864',
				icons: [
					{ src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
					{ src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
					{ src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
				]
			},
			workbox: {
				globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,woff,woff2}'],
				// Sider: nett først, siste kjente versjon uten nett.
				runtimeCaching: [
					{
						urlPattern: ({ request }) => request.mode === 'navigate',
						handler: 'NetworkFirst',
						options: { cacheName: 'sider', networkTimeoutSeconds: 5, expiration: { maxEntries: 30 } }
					},
					{
						urlPattern: ({ url }) => url.pathname.startsWith('/__data.json') || url.search.includes('x-sveltekit-invalidated'),
						handler: 'NetworkFirst',
						options: { cacheName: 'sveltekit-data', networkTimeoutSeconds: 5, expiration: { maxEntries: 50 } }
					},
					{
						urlPattern: ({ url, request }) => url.hostname.endsWith('.supabase.co') && request.method === 'GET',
						handler: 'NetworkFirst',
						options: { cacheName: 'supabase', networkTimeoutSeconds: 5, expiration: { maxEntries: 100, maxAgeSeconds: 7 * 86400 } }
					},
					{
						urlPattern: ({ url }) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com',
						handler: 'StaleWhileRevalidate',
						options: { cacheName: 'fonter', expiration: { maxEntries: 20, maxAgeSeconds: 365 * 86400 } }
					}
				]
			},
			devOptions: { enabled: false }
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
