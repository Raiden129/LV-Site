import { READER_DEFAULTS, STORAGE_KEYS, VIEW, DOM_IDS, TIMING } from '../../constants.js';

export function createReaderSettings(els) {
    const state = {
        fontSize: READER_DEFAULTS.FONT_SIZE,
        fontFamily: READER_DEFAULTS.FONT_FAMILY,
        lineHeight: READER_DEFAULTS.LINE_HEIGHT,
        contentWidth: READER_DEFAULTS.CONTENT_WIDTH,
        theme: READER_DEFAULTS.THEME,
        themeConfigs: {
            paper: { fontSize: READER_DEFAULTS.FONT_SIZE, lineHeight: READER_DEFAULTS.LINE_HEIGHT },
            default: { fontSize: READER_DEFAULTS.FONT_SIZE, lineHeight: READER_DEFAULTS.LINE_HEIGHT }
        }
    };

    let hasScrollBehavior = false;

    function syncUI() {
        if (els.inputFontSize) {
            els.inputFontSize.value = state.fontSize;
            if (els.valFontSize) els.valFontSize.textContent = `${state.fontSize}px`;
        }

        if (els.inputLineHeight) {
            els.inputLineHeight.value = state.lineHeight;
            if (els.valLineHeight) els.valLineHeight.textContent = state.lineHeight;
        }

        document.querySelectorAll('.setting-btn[data-font]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.font === state.fontFamily);
        });
        document.querySelectorAll('.setting-btn[data-width]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.width === state.contentWidth);
        });
        document.querySelectorAll('.setting-btn[data-theme-val]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.themeVal === state.theme);
        });
    }

    function applySettings() {
        const root = document.documentElement;

        root.style.setProperty('--font-size', `${state.fontSize}px`);
        root.style.setProperty('--line-height', state.lineHeight);

        if (state.fontFamily === 'serif') {
            root.style.setProperty('--font-body', "'Merriweather', 'Georgia', serif");
            root.style.setProperty('--font-serif', "'Merriweather', serif");
        } else if (state.fontFamily === 'sans') {
            root.style.setProperty('--font-body', "'Nunito Sans', 'Inter', system-ui, sans-serif");
            root.style.setProperty('--font-serif', "'Nunito Sans', 'Inter', system-ui, sans-serif");
        } else {
            root.style.setProperty('--font-body', 'system-ui, -apple-system, sans-serif');
            root.style.setProperty('--font-serif', 'system-ui, -apple-system, sans-serif');
        }

        const container = els.container;
        if (container) {
            container.classList.remove('width-narrow', 'width-medium', 'width-wide');
            container.classList.add(`width-${state.contentWidth}`);
        }

        if (state.theme === 'paper') {
            document.body.classList.add('novel-theme-paper');
        } else {
            document.body.classList.remove('novel-theme-paper');
        }

        syncUI();
    }

    function persistSettings() {
        localStorage.setItem(STORAGE_KEYS.READER_SETTINGS, JSON.stringify(state));
    }

    function updateSettings() {
        applySettings();
        persistSettings();
    }

    function loadSavedSettings() {
        const saved = localStorage.getItem(STORAGE_KEYS.READER_SETTINGS);
        if (!saved) return;

        try {
            const parsed = JSON.parse(saved);
            if (!parsed.themeConfigs) {
                parsed.themeConfigs = {
                    paper: { fontSize: READER_DEFAULTS.FONT_SIZE, lineHeight: READER_DEFAULTS.LINE_HEIGHT },
                    default: { fontSize: READER_DEFAULTS.FONT_SIZE, lineHeight: READER_DEFAULTS.LINE_HEIGHT }
                };

                if (parsed.fontSize) {
                    parsed.themeConfigs.paper.fontSize = parsed.fontSize;
                    parsed.themeConfigs.default.fontSize = parsed.fontSize;
                }
                if (parsed.lineHeight) {
                    parsed.themeConfigs.paper.lineHeight = parsed.lineHeight;
                    parsed.themeConfigs.default.lineHeight = parsed.lineHeight;
                }
            }

            Object.assign(state, parsed);

            const currentConfig = state.themeConfigs[state.theme];
            if (currentConfig) {
                state.fontSize = currentConfig.fontSize;
                state.lineHeight = currentConfig.lineHeight;
            }
        } catch (error) {
            console.error('Failed to parse settings', error);
        }
    }

    function initScrollBehavior() {
        if (hasScrollBehavior) return;
        hasScrollBehavior = true;

        const btn = document.getElementById(DOM_IDS.NOVEL_SETTINGS_BTN);
        if (!btn) return;

        if (!localStorage.getItem(STORAGE_KEYS.HAS_OPENED_SETTINGS)) {
            btn.classList.add('hint-pulse');
        }

        let timeout;
        window.addEventListener('scroll', () => {
            const readerView = document.getElementById(VIEW.NOVEL_READER);
            if (!readerView || readerView.classList.contains('hidden')) {
                return;
            }

            if (els.settingsPanel && !els.settingsPanel.classList.contains('hidden')) {
                return;
            }

            btn.classList.add('hidden-scroll');
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                btn.classList.remove('hidden-scroll');
            }, TIMING.SETTINGS_HIDE_DELAY_MS);
        }, { passive: true });
    }

    return {
        init() {
            loadSavedSettings();
            applySettings();
            initScrollBehavior();
        },
        applySettings,
        cleanup() {
            document.body.classList.remove('novel-theme-paper');
        },
        toggleSettings() {
            els.settingsPanel.classList.toggle('hidden');

            const btn = document.getElementById(DOM_IDS.NOVEL_SETTINGS_BTN);
            if (btn && btn.classList.contains('hint-pulse')) {
                btn.classList.remove('hint-pulse');
                localStorage.setItem(STORAGE_KEYS.HAS_OPENED_SETTINGS, 'true');
            }
        },
        updateFontSize(value) {
            state.fontSize = parseInt(value, 10);
            if (state.themeConfigs[state.theme]) {
                state.themeConfigs[state.theme].fontSize = state.fontSize;
            }
            updateSettings();
        },
        updateLineHeight(value) {
            state.lineHeight = parseFloat(value);
            if (state.themeConfigs[state.theme]) {
                state.themeConfigs[state.theme].lineHeight = state.lineHeight;
            }
            updateSettings();
        },
        setWidth(width) {
            state.contentWidth = width;
            updateSettings();
        },
        setFont(type) {
            state.fontFamily = type;
            updateSettings();
        },
        setTheme(theme) {
            state.theme = theme;
            const newConfig = state.themeConfigs[theme];
            if (newConfig) {
                state.fontSize = newConfig.fontSize;
                state.lineHeight = newConfig.lineHeight;
            }
            updateSettings();
        }
    };
}
