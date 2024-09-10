import path from 'path';
import { copyFileSync } from 'fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import ViteRestart from 'vite-plugin-restart';

export default defineConfig(() => {
    const args = process.argv;
    const isExtension = args.includes('--ext');

    const publicDir = path.resolve(__dirname, 'public');
    const manifestsDir = path.resolve(__dirname, 'manifests');
    const targetManifest = isExtension
        ? 'manifest-extension.json'
        : 'manifest-pwa.json';

    copyFileSync(
        path.resolve(manifestsDir, targetManifest),
        path.resolve(publicDir, 'manifest.json')
    );

    console.log(`Copied ${targetManifest} to manifest.json`);

    return {
        plugins: [
            react(),
            ViteRestart({
                restart: ['manifests/manifest-pwa.json'],
            }),
        ],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        server: {
            port: 3000,
            host: true,
        },
    };
});
