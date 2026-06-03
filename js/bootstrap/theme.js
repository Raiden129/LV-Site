import { GISCUS_THEME } from '../constants.js';

export function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
}

export function initTheme({ storageKey, onThemeChange } = {}) {
    const savedTheme = localStorage.getItem(storageKey) || GISCUS_THEME.DARK;
    applyTheme(savedTheme);

    const toggleTheme = () => {
        const current = document.documentElement.getAttribute('data-theme');
        const nextTheme = current === GISCUS_THEME.DARK ? GISCUS_THEME.LIGHT : GISCUS_THEME.DARK;
        applyTheme(nextTheme);
        if (storageKey) localStorage.setItem(storageKey, nextTheme);
        if (typeof onThemeChange === 'function') onThemeChange(nextTheme);
        return nextTheme;
    };

    return {
        ok: true,
        theme: savedTheme,
        toggleTheme
    };
}

export function bindThemeActions(toggleTheme, root = document) {
    root.addEventListener('click', (event) => {
        const trigger = event.target.closest('[data-action="toggle-theme"]');
        if (!trigger) return;
        event.preventDefault();
        toggleTheme();
    });
}
