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

    // font choices ride along for the same reason the theme does: set
    // before first paint so nothing flashes or reflows. Always stamp the
    // defaults too - the per-font size rules in CSS match on both
    // attributes, so they need to be present even on a first visit
    document.documentElement.setAttribute('data-font', localStorage.getItem('font') || 'departure-mono');
    document.documentElement.setAttribute('data-font-size', localStorage.getItem('font-size') || 'medium');
    document.documentElement.setAttribute('data-line-height', localStorage.getItem('line-height') || '2');
    document.documentElement.setAttribute('data-width', localStorage.getItem('width') || 'normal');
    document.documentElement.setAttribute(
        'data-debug-guides',
        localStorage.getItem('debug-guides') === 'true' ? 'true' : 'false',
    );
})();
