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

    // font choices ride along for the same reason the theme does:
    // set before first paint so nothing flashes or reflows
    const font = localStorage.getItem('font');
    const fontSize = localStorage.getItem('font-size');

    if (font) document.documentElement.setAttribute('data-font', font);
    if (fontSize) document.documentElement.setAttribute('data-font-size', fontSize);
})();
