import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest';

export default defineConfig(() => {
	return {
		plugins: [react({
			// Enable React Fast Refresh for better development experience
			fastRefresh: true,
			// Optimize JSX runtime
			jsxRuntime: 'automatic'
		}), crx({ manifest })],
		build: {
			target: 'es2020',
			minify: 'terser',
			sourcemap: true,
			// Optimize chunk splitting for better caching
			rollupOptions: {
				output: {
					assetFileNames: 'assets/[name]-[hash][extname]',
					chunkFileNames: 'chunks/[name]-[hash].js',
					entryFileNames: '[name]-[hash].js'
				}
			},
			// Enable tree shaking
			treeShake: true,
			// Reduce bundle size
			reportCompressedSize: false
		},
		// Optimize development experience
		server: {
			port: 5173,
			open: false,
			cors: true
		},
		// Optimize dependencies
		optimizeDeps: {
			include: ['react', 'react-dom', '@mui/material', 'chart.js'],
			exclude: ['@crxjs/vite-plugin']
		},
		// Add CSS optimization
		css: {
			devSourcemap: true
		}
	};
});


