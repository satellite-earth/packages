import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
	build: {
		target: ['chrome89', 'edge89', 'firefox89', 'safari15'],
		sourcemap: true,
	},
	plugins: [
		react(),
		VitePWA({
			strategies: 'injectManifest',
			registerType: 'autoUpdate',
			injectRegister: null,
			srcDir: 'src',
			filename: 'worker.ts',
			injectManifest: { minify: false, sourcemap: true },
			workbox: {
				// This increase the cache limit to 3mB
				maximumFileSizeToCacheInBytes: 2097152 * 1.5,
			},
			manifest: {
				name: 'Satellite',
				short_name: 'Satellite',
				description: 'An interface for satellite',
				display: 'standalone',
				orientation: 'portrait-primary',
				theme_color: '#dbaa31',
				background_color: '#171819',
				categories: ['social'],
				lang: 'en',
				start_url: '/',
				scope: '/',
				icons: [
					{
						src: 'logo.svg',
						sizes: 'any',
						type: 'image/svg+xml',
					},
					{
						src: 'logo-64x64.png',
						sizes: '64x64',
						type: 'image/png',
					},
					{
						src: 'logo-192x192.png',
						sizes: '192x192',
						type: 'image/png',
					},
					{
						src: 'logo-512x512.png',
						sizes: '512x512',
						type: 'image/png',
					},
				],
			},
			devOptions: {
				enabled: true,
				type: 'module',
			},
		}),
	],
});
