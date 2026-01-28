
import { API, CONFIG, FILES } from '../../constants.js';
import { Result, tryCatch } from '../../utils/result.js';
import { getEl } from '../../utils/dom.js';
import { adminState, setSeriesCache } from './state.js';
import { processImage } from '../../utils/image-processor.js';
import { FilePreviewItem, UploadLogItem } from '../../components/admin-ui.js';
import { Toast } from '../../components/toast.js';
import { refreshSeriesData } from './dashboard.js';
import { naturalSort, sleep } from '../../utils/helpers.js';

export function loadUploadView() {
    refreshSeriesData().then(() => {
        const list = getEl('upload-series-list');
        if (list) {
            list.innerHTML = adminState.series.map(s => `<option value="${s.name}">`).join('');
        }
    });
    adminState.uploadFiles = [];
    renderFilePreview();
    const progress = getEl('upload-progress');
    if (progress) progress.classList.add('hidden');
}

export function addFiles(files) {
    adminState.uploadFiles = [...adminState.uploadFiles, ...files];
    renderFilePreview();
    updateUploadButton();
}

export function removeFile(index) {
    adminState.uploadFiles.splice(index, 1);
    renderFilePreview();
    updateUploadButton();
}

export function clearFiles() {
    adminState.uploadFiles = [];
    renderFilePreview();
    updateUploadButton();
    const fileInput = getEl('upload-files');
    if (fileInput) fileInput.value = '';
}

function renderFilePreview() {
    const list = getEl('preview-list');
    const container = getEl('file-preview');

    if (!adminState.uploadFiles.length) {
        if (container) container.classList.add('hidden');
        return;
    }

    if (container) container.classList.remove('hidden');
    const countEl = getEl('file-count');
    if (countEl) countEl.textContent = adminState.uploadFiles.length;

    if (list) {
        list.innerHTML = adminState.uploadFiles.map((f, i) => FilePreviewItem(f, i)).join('');
    }
}

export function updateUploadButton() {
    const btn = getEl('btn-start-upload');
    const series = getEl('upload-series')?.value.trim();
    const isCover = document.querySelector('input[name="upload-type"]:checked')?.value === 'cover';
    const chapter = getEl('upload-chapter')?.value.trim();

    if (btn) btn.disabled = !series || adminState.uploadFiles.length === 0 || (!isCover && !chapter);
}

export function updateUploadType() {
    const isCover = document.querySelector('input[name="upload-type"]:checked')?.value === 'cover';
    const grp = getEl('chapter-num-group');
    if (grp) {
        grp.style.opacity = isCover ? '0.5' : '1';
        const input = grp.querySelector('input');
        if (input) input.disabled = isCover;
    }
    updateUploadButton();

    document.querySelectorAll('.radio-option').forEach(opt => {
        const input = opt.querySelector('input');
        opt.classList.toggle('active', input && input.checked);
    });
}


export async function handleUpload() {
    const series = getEl('upload-series').value.trim();
    const isCover = document.querySelector('input[name="upload-type"]:checked')?.value === 'cover';
    const chapter = getEl('upload-chapter').value.trim();

    const btn = getEl('btn-start-upload');
    const progressDiv = getEl('upload-progress');
    const log = getEl('upload-log');

    btn.disabled = true;
    progressDiv.classList.remove('hidden');
    log.innerHTML = '';

    const addLog = (msg, type = 'pending') => {
        const el = document.createElement('div');
        el.className = `log-item ${type}`;
        el.innerHTML = msg; 
        log.appendChild(el);
        
        log.scrollTop = log.scrollHeight;
        return el;
    };

    
    const treeItems = [];

    for (const file of adminState.uploadFiles) {
        addLog(`Processing ${file.name}...`);

        const processFn = () => processImage(file, isCover ? 'cover' : 'page');
        const processResult = await tryCatch(processFn)();

        if (!processResult.ok) {
            addLog(`Failed to process ${file.name}: ${processResult.error}`, 'error');
            btn.disabled = false;
            return;
        }

        const baseName = file.name.replace(/\.[^.]+$/, '');
        const items = processResult.value;

        for (const p of items) {
            const name = isCover ? 'cover.webp' : `${baseName}${p.suffix}.webp`;
            const path = isCover ? `content/${series}/${name}` : `content/${series}/${chapter}/${name}`;

            const blobResult = await adminState.github.createBlob(p.data);
            if (!blobResult.ok) {
                addLog(`Failed to upload blob for ${name}`, 'error');
                btn.disabled = false;
                return;
            }

            treeItems.push({ path, mode: '100644', type: 'blob', sha: blobResult.value });
        }
        addLog(`✓ ${file.name} staged`, 'success');
    }

    
    addLog('Committing...');

    const commitTask = async () => {
        
        const unwrap = (r) => { if (!r.ok) throw r.error; return r.value; };

        try {
            const latestCommit = unwrap(await adminState.github.getLatestCommit());

            
            let library = [];
            const jsonPath = FILES.MANGA_JSON;
            const jsonRes = await adminState.github.request(`${API.CONTENT_BASE}/${jsonPath}?ref=${latestCommit}`);

            if (jsonRes.ok) {
                library = JSON.parse(atob(jsonRes.value.content));
            }

            
            let s = library.find(x => x.id === series);
            if (!s) {
                s = { id: series, title: series, cover: '', chapters: [], chapter_roots: {} };
                library.push(s);
            }

            if (isCover) s.cover = `content/${series}/cover.webp`;
            if (!isCover && !s.chapters.includes(chapter)) {
                s.chapters.push(chapter);
                s.chapters.sort(naturalSort);
            }

            const jsonBlob = unwrap(await adminState.github.createBlob(JSON.stringify(library, null, 2), 'utf-8'));

            const finalTree = [...treeItems, {
                path: jsonPath, mode: '100644', type: 'blob', sha: jsonBlob
            }];

            const baseTree = unwrap(await adminState.github.getTreeSha(latestCommit));
            const newTree = unwrap(await adminState.github.createTree(baseTree, finalTree));
            const newCommit = unwrap(await adminState.github.createCommit(`Update ${series} [skip ci]`, newTree, latestCommit));
            unwrap(await adminState.github.updateRef(newCommit));

            return Result.success({ success: true });

        } catch (e) {
            return Result.failure(e);
        }
    };

    let result;
    
    for (let i = 0; i < 3; i++) {
        result = await commitTask();
        if (result.ok) break;
        await sleep(1000);
    }

    if (result && result.ok) {
        Toast.success('Upload Successful!');
        clearFiles();
        await refreshSeriesData(); 
    } else {
        addLog('Failed to commit', 'error');
        Toast.error('Upload Failed');
    }

    btn.disabled = false;
}
