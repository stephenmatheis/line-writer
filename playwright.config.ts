import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    fullyParallel: false,
    workers: 1,
    reporter: 'list',
    use: {
        baseURL: 'http://localhost:5199',
    },
    projects: [
        {
            name: 'chromium',
            use: {
                browserName: 'chromium',
                // clipboard access for the share-link tests (Chromium only;
                // WebKit has no equivalent permission API, so those tests skip)
                permissions: ['clipboard-read', 'clipboard-write'],
            },
        },
        {
            name: 'webkit',
            use: { browserName: 'webkit' },
        },
    ],
    webServer: {
        command: 'npm run dev -- --port 5199 --strictPort',
        url: 'http://localhost:5199',
        reuseExistingServer: true,
    },
});
