

export const CONFIG = Object.freeze({
    USERNAME: "YOUR_USERNAME",
    REPO: "YOUR_REPO",
    MAIN_SITE_URL: 'https://your-site-url.com',
    WORKER_URL: "https://your-worker-url.workers.dev/",
    BACKUP_URL: "https://your-backup-url.r2.dev"
});

export const API = Object.freeze({
    CONTENT_BASE: `https://api.github.com/repos/${CONFIG.USERNAME}/${CONFIG.REPO}/contents`,
    GIT_API_BASE: `https://api.github.com/repos/${CONFIG.USERNAME}/${CONFIG.REPO}/git`,
    ACTIONS_BASE: `https://api.github.com/repos/${CONFIG.USERNAME}/${CONFIG.REPO}/actions`,
    IMGBB_UPLOAD: 'https://api.imgbb.com/1/upload',
    IMGBB_KEY: 'YOUR_IMGBB_KEY'
});

export const FILES = Object.freeze({
    MANGA_JSON: 'dummy_manga.json',
    PENDING_DELETES: 'dummy_pending_deletes.json'
});

export const FIREBASE_CONFIG = Object.freeze({
    apiKey: "YOUR_API_KEY",
    authDomain: "your-app.firebaseapp.com",
    databaseURL: "https://your-app-default-rtdb.region.firebasedatabase.app",
    projectId: "your-project-id",
    storageBucket: "your-app.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
});

export const VIEW = Object.freeze({
    HOME: 'view-home',
    CHAPTERS: 'view-chapters',
    READER: 'view-reader',
    
    DASHBOARD: 'view-dashboard',
    SERIES: 'view-series',
    SERIES_DETAIL: 'view-series-detail',
    CHAPTER_DETAIL: 'view-chapter-detail',
    UPLOAD: 'view-upload'
});

export const TOAST_TYPE = Object.freeze({
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
    LOADING: 'loading'
});

export const SORT_ORDER = Object.freeze({
    ASC: 'asc',
    DESC: 'desc'
});

export const STORAGE_KEYS = Object.freeze({
    THEME: 'theme',
    LIBRARY_CACHE: 'manga_library_cache',
    GH_TOKEN: 'gh_token'
});

export const LIMITS = Object.freeze({
    MAX_PAGES: 80,
    CHAPTERS_PER_PAGE: 5,
    VIEW_COOLDOWN_MS: 24 * 60 * 60 * 1000,
    MAX_LOCAL_CHAPTERS: 120,
    LOCAL_CAPACITY: 120
});

export const TIMING = Object.freeze({
    FIREBASE_TIMEOUT_MS: 3000,
    FIREBASE_POLL_INTERVAL_MS: 50,
    PRESENCE_POLL_INTERVAL_MS: 60000,
    PRELOAD_DELAY_MS: 1000,
    SCROLL_DEBOUNCE_MS: 300,
    SCROLL_THRESHOLD_PX: 200
});

export const DOM_IDS = Object.freeze({
    ERROR_BOX: 'error-box',
    SCROLL_TOP_BTN: 'btn-scroll-top',
    LIVE_COUNT: 'live-count-text',
    LOAD_MORE_BTN: 'btn-load-more-chapters'
});

export const GISCUS = Object.freeze({
    SCRIPT_URL: 'https://giscus.app/client.js',
    REPO: 'your-username/your-repo',
    REPO_ID: 'YOUR_REPO_ID',
    CATEGORY: 'General',
    CATEGORY_ID: 'YOUR_CATEGORY_ID',
    ORIGIN: 'https://giscus.app'
});

export const ICONS = Object.freeze({
    
    SUCCESS: `<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#22c55e"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    ERROR: `<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#ef4444"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    PENDING: `<svg class="icon-sm" style="color:var(--text-muted)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>`,
    SPINNER: `<svg class="icon-sm" style="animation:spin 1s linear infinite" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`,
    WARNING: `<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    INFO: `<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    CHECK: `<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,


    BOOK_SPINE: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`,
    EYE: `<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
    CHEVRON_RIGHT: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`,
    CHEVRON_LEFT: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>`,
    CHEVRON_UP: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>`,
    SERIES_BADGE: `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`,
    EMPTY_STATE: `<svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="opacity: 0.5; margin-bottom: 16px;"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
    SORT: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M7 15l5 5 5-5M7 9l5-5 5 5"/></svg>`,


    TRASH: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
    ROCKET: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path></svg>`
});

export const FIREBASE_PATHS = Object.freeze({
    STATUS_CONNECTIONS: 'status/connections',
    INFO_CONNECTED: '.info/connected',
    STATUS_VIEWING: 'status/viewing',
    VIEWS: 'views'
});

export const GISCUS_THEME = Object.freeze({
    LIGHT: 'light',
    DARK: 'transparent_dark'
});


