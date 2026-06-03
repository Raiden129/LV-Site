





import { STORAGE_KEYS } from '../../constants.js';
import { GitHubAPI } from '../../client-api/github.js';
import { Toast } from '../../components/toast.js';
import { getEl } from '../../utils/dom.js';
import { adminState, getGitHubClient, setGitHubClient, clearGitHubClient } from './state.js';
import { loadDashboard, filterSeries } from './dashboard.js';
import { loadUploadView, handleUpload, addFiles, removeFile, clearFiles, updateUploadType } from './upload.js';
import {
    loadSeriesDetail, loadChapterDetail, handleDeleteChapter,
    toggleSelectAll, clearSelection, deleteSelectedImages,
    deleteSeries, changeCover, uploadNewCover, uploadMoreImages, uploadModalImages, setupDetailsHandlers,
    triggerMigration
} from './details.js';
import { triggerMaintenance, triggerDeploy } from './maintenance.js';
import { loadNovelDashboard, filterNovels } from './novel-dashboard.js';
import { loadNovelSeriesDetail, setupNovelDetailsHandlers } from './novel-details.js';
import { initiateNovelCreation as createNovelEntry } from './novel-upload.js';
import { createAdminActionsShim, dispatchDelegatedAdminAction, registerAdminAction } from './action-controller.js';

let initialized = false;

export function initAdminApp() {
    if (initialized) return;
    initialized = true;

    setupGlobalHandlers();
    initTheme();

    document.addEventListener('DOMContentLoaded', () => {
        setupEventListeners();

        const token = localStorage.getItem(STORAGE_KEYS.GH_TOKEN);
        if (token) {
            initGithub(token);
        }
    });
}

function initTheme() {
    const theme = localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    if (document.body) updateThemeIcons(theme);
    else document.addEventListener('DOMContentLoaded', () => updateThemeIcons(theme));
}

function updateThemeIcons(theme) {
    const suns = document.querySelectorAll('.icon-sun');
    const moons = document.querySelectorAll('.icon-moon');

    if (theme === 'dark') {
        suns.forEach(el => el.classList.remove('hidden'));
        moons.forEach(el => el.classList.add('hidden'));
    } else {
        suns.forEach(el => el.classList.add('hidden'));
        moons.forEach(el => el.classList.remove('hidden'));
    }
}

async function initGithub(token) {
    setGitHubClient(new GitHubAPI(token));

    getEl('login-screen').classList.add('hidden');
    getEl('app').classList.remove('hidden');

    const result = await loadDashboard();

    if (!result.ok) {
        console.error('Dashboard load failed:', result.error);
        Toast.error('Failed to load dashboard');
    }
}

function setupGlobalHandlers() {
    window.AdminActions = createAdminActionsShim();

    registerAdminAction('toggleTheme', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem(STORAGE_KEYS.THEME, next);
        updateThemeIcons(next);
    });

    registerAdminAction('login', () => {
        const token = getEl('gh-token').value.trim();
        if (!token) return Toast.error('Enter token');
        localStorage.setItem(STORAGE_KEYS.GH_TOKEN, token);
        initGithub(token);
    });

    registerAdminAction('logout', () => {
        clearGitHubClient();
        localStorage.removeItem(STORAGE_KEYS.GH_TOKEN);
        location.reload();
    });

    registerAdminAction('toggleTokenVisibility', () => {
        const input = getEl('gh-token');
        input.type = input.type === 'password' ? 'text' : 'password';
    });

    registerAdminAction('switchView', switchView);
    registerAdminAction('openSeriesDetail', loadSeriesDetail);
    registerAdminAction('openNovelDetailFromPayload', ({ payload }) => loadNovelSeriesDetail(payload?.id));
    registerAdminAction('openSeriesDetailFromPayload', ({ payload }) => loadSeriesDetail(payload?.name));
    registerAdminAction('openChapterDetail', (s, c) => loadChapterDetail(s, c));

    setupDetailsHandlers(window.AdminActions);
    registerAdminAction('deleteChapter', handleDeleteChapter);
    registerAdminAction('triggerMigration', triggerMigration);

    registerAdminAction('startUpload', handleUpload);
    registerAdminAction('addFiles', addFiles);
    registerAdminAction('removeFile', removeFile);
    registerAdminAction('clearFiles', clearFiles);
    registerAdminAction('updateUploadType', updateUploadType);
    registerAdminAction('filterSeries', filterSeries);

    registerAdminAction('showNewSeriesModal', () => {
        window.AdminActions.switchView('upload');
        const coverRadio = document.querySelector('input[name="upload-type"][value="cover"]');
        if (coverRadio) coverRadio.checked = true;
        updateUploadType();
    });
    
    registerAdminAction('triggerMaintenance', triggerMaintenance);
    registerAdminAction('triggerDeploy', triggerDeploy);
    registerAdminAction('deleteSeries', deleteSeries);
    registerAdminAction('changeCover', changeCover);
    registerAdminAction('uploadNewCover', uploadNewCover);
    registerAdminAction('uploadToSeries', () => {
        getEl('upload-series').value = adminState.currentSeries;
        window.AdminActions.switchView('upload');
        const chRadio = document.querySelector('input[name="upload-type"][value="chapter"]');
        if (chRadio) chRadio.checked = true;
        updateUploadType();
    });
    registerAdminAction('uploadMoreImages', uploadMoreImages);
    registerAdminAction('uploadModalImages', uploadModalImages);

    registerAdminAction('openModal', (id) => {
        getEl(id).classList.remove('hidden');
        getEl('modal-overlay').classList.remove('hidden');
    });
    registerAdminAction('closeModal', () => {
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
        getEl('modal-overlay').classList.add('hidden');
    });
    registerAdminAction('showToast', (msg, type) => Toast.show(msg, type));

    registerAdminAction('toggleSelectAll', toggleSelectAll);
    registerAdminAction('clearSelection', clearSelection);
    registerAdminAction('deleteSelectedImages', deleteSelectedImages);

    setupNovelDetailsHandlers(window.AdminActions);
    registerAdminAction('showNewNovelModal', () => window.AdminActions.openModal('modal-new-novel'));
    registerAdminAction('runNovelCreation', handleCreateNewNovel);
    registerAdminAction('createNewNovel', handleCreateNewNovel);
    registerAdminAction('filterNovels', filterNovels);
    registerAdminAction('uploadToNovel', () => {
        getEl('upload-series').value = adminState.currentNovel;
        window.AdminActions.switchView('upload');
        const novelRadio = document.querySelector('input[name="upload-type"][value="novel-chapter"]');
        if (novelRadio) novelRadio.checked = true;
        updateUploadType();
    });
}

function updateActiveViewState(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const target = getEl(`view-${viewName}`);
    if (target) target.classList.add('active');

    const nav = document.querySelector(`.nav-item[data-view="${viewName}"]`);
    if (nav) nav.classList.add('active');
}

const VIEW_ENTER_HOOKS = {
    dashboard: () => loadDashboard(),
    'comic-series': () => filterSeries(),
    'novel-admin-series': () => loadNovelDashboard(),
    upload: () => loadUploadView()
};

function runViewEnterHook(viewName) {
    const enterHook = VIEW_ENTER_HOOKS[viewName];
    if (!enterHook) return;
    enterHook();
}

function switchView(viewName) {
    updateActiveViewState(viewName);
    runViewEnterHook(viewName);
}

async function createNewSeries() {
    const name = getEl('new-series-name')?.value.trim();
    if (!name) return Toast.error('Enter series name');

    const coverFile = getEl('new-series-cover')?.files?.[0];
    window.AdminActions?.closeModal();
    Toast.info('Creating series...');

    if (coverFile) {
        window.AdminActions?.switchView('upload');
        getEl('upload-series').value = name;
        const coverRadio = document.querySelector('input[name="upload-type"][value="cover"]');
        if (coverRadio) coverRadio.checked = true;
        updateUploadType();
        addFiles([coverFile]);
        await handleUpload();
    } else {
        const github = getGitHubClient();
        if (!github) return Toast.error('GitHub client not initialized');

        await github.atomicCommit(`Create series: ${name}`, []);
        Toast.success(`Series "${name}" created`);
    }
}

async function handleCreateNewNovel() {
    const title = getEl('new-novel-title')?.value.trim();
    if (!title) return Toast.error('Enter novel title');

    const coverFile = getEl('new-novel-cover')?.files?.[0];

    window.AdminActions?.closeModal();

    const result = await createNovelEntry(
        { title },
        coverFile
    );

    if (result.ok) {
        getEl('new-novel-title').value = '';
        if (getEl('new-novel-cover')) getEl('new-novel-cover').value = '';

        window.AdminActions?.switchView('novel-admin-series');
    }
}

function setupEventListeners() {
    document.body.addEventListener('click', dispatchDelegatedAdminAction);

    
    const dropZone = getEl('drop-zone');
    const fileInput = getEl('upload-files');

    if (dropZone && fileInput) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
        });

        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length) {
                window.AdminActions?.addFiles(Array.from(files));
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                window.AdminActions?.addFiles(Array.from(e.target.files));
                e.target.value = ''; 
            }
        });
    }
}
