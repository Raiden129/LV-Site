





import { API, CONFIG, FILES } from '../../constants.js';
import { Result, tryCatch, getErrorMessage } from '../../utils/result.js';
import { getEl } from '../../utils/dom.js';
import { adminState, setSeriesCache } from './state.js';
import { processImage } from '../../utils/image-processor.js';
import { Toast } from '../../components/toast.js';
import { refreshSeriesData } from './dashboard.js';
import { refreshNovelData } from './novel-dashboard.js';
import { handleBulkNovelChapterUpload } from './novel-upload.js';
import { formatFileSize, naturalSort, sleep } from '../../utils/helpers.js';

export function loadUploadView() {
    
    Promise.all([refreshSeriesData(), refreshNovelData()]).then(() => {
        const list = getEl('upload-series-list');
        if (list) {
            list.textContent = '';

            adminState.series.forEach((series) => {
                const option = document.createElement('option');
                option.value = series.name;
                list.appendChild(option);
            });

            adminState.novels.forEach((novel) => {
                const option = document.createElement('option');
                option.value = novel.id;
                option.textContent = novel.title;
                list.appendChild(option);
            });
        }
    });
    adminState.uploadFiles = [];
    adminState.novelUploadFiles = [];
    renderFilePreview();
    const progress = getEl('upload-progress');
    if (progress) progress.classList.add('hidden');
}

export function addFiles(files) {
    const uploadType = document.querySelector('input[name="upload-type"]:checked')?.value;
    const isNovelChapter = uploadType === 'novel-chapter';

    if (isNovelChapter) {
        
        const mdFiles = files.filter(f => /\.(md|txt)$/i.test(f.name));
        adminState.novelUploadFiles = [...adminState.novelUploadFiles, ...mdFiles];
    } else {
        
        adminState.uploadFiles = [...adminState.uploadFiles, ...files];
    }

    renderFilePreview();
    updateUploadButton();
}

export function removeFile(index) {
    const uploadType = document.querySelector('input[name="upload-type"]:checked')?.value;
    const isNovelChapter = uploadType === 'novel-chapter';
    const files = isNovelChapter ? adminState.novelUploadFiles : adminState.uploadFiles;

    files.splice(index, 1);
    renderFilePreview();
    updateUploadButton();
}

export function clearFiles() {
    adminState.uploadFiles = [];
    adminState.novelUploadFiles = [];
    renderFilePreview();
    updateUploadButton();
    const fileInput = getEl('upload-files');
    if (fileInput) fileInput.value = '';
}

function renderFilePreview() {
    const list = getEl('preview-list');
    const container = getEl('file-preview');

    
    const uploadType = document.querySelector('input[name="upload-type"]:checked')?.value;
    const isNovelChapter = uploadType === 'novel-chapter';
    const files = isNovelChapter ? adminState.novelUploadFiles : adminState.uploadFiles;

    if (!files.length) {
        if (container) container.classList.add('hidden');
        return;
    }

    if (container) container.classList.remove('hidden');
    const countEl = getEl('file-count');
    if (countEl) countEl.textContent = files.length;

    if (!list) return;

    list.textContent = '';
    files.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'preview-item';

        const info = document.createElement('div');
        info.className = 'preview-info';

        const nameEl = document.createElement('div');
        nameEl.className = 'preview-name';
        nameEl.textContent = file.name;

        const sizeEl = document.createElement('div');
        sizeEl.className = 'preview-size';
        sizeEl.textContent = formatFileSize(file.size);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'preview-remove';
        removeBtn.type = 'button';
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', () => removeFile(index));

        info.append(nameEl, sizeEl);
        item.append(info, removeBtn);
        list.appendChild(item);
    });
}

export function updateUploadButton() {
    const btn = getEl('btn-start-upload');
    const series = getEl('upload-series')?.value.trim();
    const uploadType = document.querySelector('input[name="upload-type"]:checked')?.value;
    const isCover = uploadType === 'cover';
    const isNovelChapter = uploadType === 'novel-chapter';
    const chapter = getEl('upload-chapter')?.value.trim();

    const hasFiles = isNovelChapter ?
        adminState.novelUploadFiles.length > 0 :
        adminState.uploadFiles.length > 0;

    
    
    if (isNovelChapter) {
        if (btn) btn.disabled = !series || !hasFiles;
        return;
    }

    if (btn) btn.disabled = !series || !hasFiles || (!isCover && !chapter);
}

export function updateUploadType() {
    const uploadType = document.querySelector('input[name="upload-type"]:checked')?.value;
    const isCover = uploadType === 'cover';
    const isNovelChapter = uploadType === 'novel-chapter';

    
    const chapterGrp = getEl('chapter-num-group');
    if (chapterGrp) {
        chapterGrp.style.opacity = isCover ? '0.5' : '1';
        const input = chapterGrp.querySelector('input');
        if (input) input.disabled = isCover;
    }

    
    const titleGrp = getEl('chapter-title-group');
    if (titleGrp) {
        titleGrp.classList.toggle('hidden', !isNovelChapter);
    }

    
    const fileInput = getEl('upload-files');
    if (fileInput) {
        fileInput.accept = isNovelChapter ? '.md,.txt' : '.webp,.jpg,.png,.jpeg,.gif';
    }

    
    
    renderFilePreview();
    updateUploadButton();

    document.querySelectorAll('.radio-option').forEach(opt => {
        const input = opt.querySelector('input');
        opt.classList.toggle('active', input && input.checked);
    });
}







export async function handleUpload() {
    const series = getEl('upload-series').value.trim();
    const uploadType = document.querySelector('input[name="upload-type"]:checked')?.value;
    const isCover = uploadType === 'cover';
    const isNovelChapter = uploadType === 'novel-chapter';
    const chapter = getEl('upload-chapter').value.trim();

    const btn = getEl('btn-start-upload');
    const progressDiv = getEl('upload-progress');
    const log = getEl('upload-log');

    btn.disabled = true;
    progressDiv.classList.remove('hidden');
    log.textContent = '';

    const addLog = (msg, type = 'pending') => {
        const el = document.createElement('div');
        el.className = `log-item ${type}`;
        el.appendChild(document.createTextNode(msg));
        log.appendChild(el);
        
        log.scrollTop = log.scrollHeight;
        return el;
    };

    
    if (isNovelChapter) {
        if (!series) {
            Toast.error('Select a novel series');
            btn.disabled = false;
            return;
        }

        if (adminState.novelUploadFiles.length === 0) {
            Toast.error('No markdown files selected');
            btn.disabled = false;
            return;
        }

        addLog(`Processing ${adminState.novelUploadFiles.length} chapter(s)...`);

        const result = await handleBulkNovelChapterUpload(series, adminState.novelUploadFiles);

        if (result.ok) {
            addLog(`✓ Upload complete: ${result.value.count} chapter(s)`, 'success');
            clearFiles();
            adminState.novelUploadFiles = [];
        } else {
            addLog(`Upload failed: ${result.error.message}`, 'error');
        }

        btn.disabled = false;
        return;
    }

    
    const treeItems = [];

    for (const file of adminState.uploadFiles) {
        addLog(`Processing ${file.name}...`);

        const processFn = () => processImage(file, isCover ? 'cover' : 'page');
        const processResult = await tryCatch(processFn)();

        if (!processResult.ok) {
            addLog(`Failed to process ${file.name}: ${getErrorMessage(processResult.error)}`, 'error');
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
