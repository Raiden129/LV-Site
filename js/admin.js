
import { CONFIG, STORAGE_KEYS, TOAST_TYPE, API } from './constants.js';
import { GitHubAPI } from './api/github.js';
import { Toast } from './components/toast.js';
import { getEl } from './utils/dom.js';
import { adminState } from './features/admin/state.js';


import { loadDashboard, filterSeries } from './features/admin/dashboard.js';
import { loadUploadView, handleUpload, addFiles, removeFile, clearFiles, updateUploadType } from './features/admin/upload.js';
import {
    loadSeriesDetail, loadChapterDetail, handleDeleteChapter,
    toggleImageSelection, toggleSelectAll, clearSelection, deleteSelectedImages,
    deleteSeries, changeCover, uploadNewCover, uploadMoreImages, uploadModalImages, setupDetailsHandlers,
    triggerMigration
} from './features/admin/details.js';
import { triggerMaintenance, triggerDeploy } from './features/admin/maintenance.js';



setupGlobalHandlers();
initTheme();

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();

    const token = localStorage.getItem(STORAGE_KEYS.GH_TOKEN);
    if (token) {
        initGithub(token);
    }
});

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
    
    adminState.github = new GitHubAPI(token);

    getEl('login-screen').classList.add('hidden');
    getEl('app').classList.remove('hidden');

    const result = await loadDashboard();

    if (!result.ok) {
        console.error('Dashboard load failed:', result.error);
        Toast.error('Failed to load dashboard');
    }
}

function setupGlobalHandlers() {
    
    window.toggleTheme = () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem(STORAGE_KEYS.THEME, next);
        updateThemeIcons(next);
    };

    
    window.login = () => {
        const token = getEl('gh-token').value.trim();
        if (!token) return Toast.error('Enter token');
        localStorage.setItem(STORAGE_KEYS.GH_TOKEN, token);
        initGithub(token);
    };

    window.logout = () => {
        localStorage.removeItem(STORAGE_KEYS.GH_TOKEN);
        location.reload();
    };

    window.toggleTokenVisibility = () => {
        const input = getEl('gh-token');
        input.type = input.type === 'password' ? 'text' : 'password';
        
    };

    
    window.switchView = switchView;
    window.openSeriesDetail = loadSeriesDetail;
    window.openChapterDetail = (s, c) => loadChapterDetail(s, c);

    
    setupDetailsHandlers(); 
    window.deleteChapter = handleDeleteChapter; 
    window.triggerMigration = triggerMigration;

    
    window.startUpload = handleUpload;
    window.removeFile = removeFile;
    window.clearFiles = clearFiles;
    window.updateUploadType = updateUploadType;
    window.filterSeries = filterSeries;

    
    window.showNewSeriesModal = () => window.openModal('modal-new-series'); 
    window.createNewSeries = createNewSeries; 
    window.triggerMaintenance = triggerMaintenance;
    window.triggerDeploy = triggerDeploy;
    window.deleteSeries = deleteSeries;
    window.changeCover = changeCover;
    window.uploadNewCover = uploadNewCover;
    window.uploadToSeries = () => {
        getEl('upload-series').value = adminState.currentSeries;
        switchView('upload');
        loadUploadView();
        const chRadio = document.querySelector('input[name="upload-type"][value="chapter"]');
        if (chRadio) chRadio.checked = true;
        updateUploadType();
    };
    window.uploadMoreImages = uploadMoreImages;
    window.uploadModalImages = uploadModalImages;

    
    window.openModal = (id) => {
        getEl(id).classList.remove('hidden');
        getEl('modal-overlay').classList.remove('hidden');
    };
    window.closeModal = () => {
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
        getEl('modal-overlay').classList.add('hidden');
    };
    window.showToast = (msg, type) => Toast.show(msg, type);

    
    window.toggleSelectAll = toggleSelectAll;
    window.clearSelection = clearSelection;
    window.deleteSelectedImages = deleteSelectedImages;
}

function switchView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const target = getEl(`view-${viewName}`);
    if (target) target.classList.add('active');

    const nav = document.querySelector(`.nav-item[data-view="${viewName}"]`);
    if (nav) nav.classList.add('active');

    if (viewName === 'dashboard') loadDashboard();
    if (viewName === 'series') filterSeries(); 
    if (viewName === 'upload') loadUploadView();
}


async function createNewSeries() {
    const name = getEl('new-series-name')?.value.trim();
    if (!name) return Toast.error('Enter series name');

    const coverFile = getEl('new-series-cover')?.files?.[0];
    window.closeModal();
    Toast.info('Creating series...');

    if (coverFile) {
        addFiles([coverFile]); 
        getEl('upload-series').value = name;
        const coverRadio = document.querySelector('input[name="upload-type"][value="cover"]');
        if (coverRadio) coverRadio.checked = true;
        updateUploadType();
        switchView('upload');
        await handleUpload();
    } else {
        const result = await adminState.github.atomicCommit(`Create series: ${name}`, []);
        Toast.success(`Series "${name}" created`);
    }
    
}

function setupEventListeners() {
    const dropZone = getEl('drop-zone');
    if (dropZone) {
        dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
        dropZone.addEventListener('dragleave', e => { e.preventDefault(); dropZone.classList.remove('dragover'); });
        dropZone.addEventListener('drop', e => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            addFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')));
        });
    }

    const fileInput = getEl('upload-files');
    if (fileInput) {
        fileInput.addEventListener('change', e => addFiles(Array.from(e.target.files)));
    }
}
