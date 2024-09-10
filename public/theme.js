(function () {
    // Set the data-theme attribute
    const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme');
    const theme = savedTheme === 'system'
        ? (systemDarkMode ? 'dark' : 'light')
        : savedTheme || (systemDarkMode ? 'dark' : 'light');

    document.documentElement.setAttribute('data-theme', theme);

    // Set PWA theme color
    const themeColor = theme === 'dark' ? '#1e1e1e' : '#ffffff';
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');

    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', themeColor);
    }
})();