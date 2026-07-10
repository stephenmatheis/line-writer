(function () {
    const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme');
    const theme =
        savedTheme === 'system'
            ? systemDarkMode
                ? 'dark'
                : 'light'
            : savedTheme || (systemDarkMode ? 'dark' : 'light');

    document.documentElement.setAttribute('data-theme', theme);
})();
