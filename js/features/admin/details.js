
import { API, CONFIG, ICONS, FILES } from '../../constants.js';
import { Result, tryCatch } from '../../utils/result.js';
import { getEl } from '../../utils/dom.js';
import { adminState, setCurrentSeries, setCurrentChapter, setSeriesCache } from './state.js';
import { AdminChapterItem } from '../../components/cards.js';
import { Toast } from '../../components/toast.js';
import { refreshSeriesData } from './dashboard.js';
import { naturalSort, encodePath } from '../../utils/helpers.js';
import { processImage } from '../../utils/image-processor.js';


import { AdminImageItem } from '../../components/admin-ui.js';



export async function loadSeriesDetail(name) {
    
    window.switchView('series-detail');

    const s = adminState.series.find(x => x.name === name);
    if (!s) return;

    const titleEl = getEl('detail-title');
    if (titleEl) titleEl.textContent = s.name;

    const coverEl = getEl('detail-cover');
    if (coverEl) coverEl.src = s.cover ? `${CONFIG.MAIN_SITE_URL}/${encodePath(s.cover)}` : '';

    const countEl = getEl('detail-chapters-count');
    if (countEl) countEl.textContent = `${s.chapters.length} Chapters`;

    const chapters = [...s.chapters].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

    const container = document.querySelector('#view-series-detail .chapter-list');
    if (container) {
        container.innerHTML = chapters.map(ch => {
            const isArchived = s.chapter_roots[ch];
            return AdminChapterItem({
                chapter: ch,
                seriesName: name,
                isArchived: !!isArchived,
                onClickHandler: `openChapterDetail('${name}', '${ch}')`,
                onDeleteHandler: `event.stopPropagation(); deleteChapter('${name}', '${ch}', ${!!isArchived})`
            });
        }).join('');
    }
}

export async function handleDeleteChapter(series, chapter, isArchived) {
    if (!confirm(`Delete Chapter ${chapter}?`)) return;

    const deleteOp = async () => {
        if (isArchived) {
            return await addToPendingDeletes(`MIGRATE:${series}/${chapter}`);
        } else {
            const filesRes = await adminState.github.getContents(`content/${series}/${chapter}`);
            if (!filesRes.ok) return Result.failure(filesRes.error);

            for (const f of filesRes.value) {
                if (f.type === 'file') await adminState.github.deleteFile(f.path, f.sha);
            }
            return Result.success();
        }
    };

    const result = await deleteOp();

    if (result.ok) {
        Toast.success('Deleted');
        await refreshSeriesData();
        loadSeriesDetail(series);
    } else {
        console.error(result.error);
        Toast.error('Delete failed');
    }
}

async function addToPendingDeletes(targetPath) {
    const FILE_PATH = FILES.PENDING_DELETES;

    
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const fileRes = await adminState.github.getContents(FILE_PATH);
            let list = [];
            let sha = null;

            if (fileRes.ok) {
                list = JSON.parse(atob(fileRes.value.content));
                sha = fileRes.value.sha;
            }

            if (list.includes(targetPath)) return Result.success();
            list.push(targetPath);

            const res = await adminState.github.request(`${API.CONTENT_BASE}/${FILE_PATH}`, {
                method: 'PUT',
                body: JSON.stringify({
                    message: `Admin: Queue delete ${targetPath}`,
                    content: btoa(JSON.stringify(list, null, 2)),
                    sha: sha
                })
            });

            if (res.ok) return Result.success();
        } catch (e) {
            if (attempt === 3) return Result.failure(e);
        }
    }
    return Result.failure(new Error("Timeout adding to pending deletes"));
}



export async function loadChapterDetail(seriesName, chapterNum) {
    setCurrentSeries(seriesName);
    setCurrentChapter(chapterNum);

    getEl('breadcrumb-series-name').textContent = seriesName;

    
    const backLink = getEl('back-to-series-link');
    if (backLink) {
        backLink.onclick = (e) => {
            e.preventDefault();
            
            window.openSeriesDetail(seriesName);
            return false;
        };
    }

    getEl('detail-chapter-num').textContent = chapterNum;

    adminState.selectedImages.clear();
    updateSelectionUI();

    const grid = getEl('image-grid');
    grid.innerHTML = '<div class="loading">Loading...</div>';

    let images = [];
    const series = adminState.series.find(s => s.name === seriesName);
    const archived = series?.chapter_roots?.[chapterNum];

    if (archived) {
        const baseUrl = archived.url || archived;
        if (typeof archived === 'object' && archived.mode === 'count') {
            images = Array.from({ length: archived.data }, (_, i) => {
                const name = `${String(i + 1).padStart(2, '0')}.webp`;
                return { name, download_url: `${baseUrl}/${name}` };
            });
        } else if (typeof archived === 'object' && Array.isArray(archived.data)) {
            images = archived.data.map(name => ({
                name: name,
                download_url: `${baseUrl}/${name}`
            }));
        } else {
            grid.innerHTML = '<div class="empty-state">Archived (Legacy Format)</div>';
            return;
        }
    } else {
        const contentsResult = await adminState.github.getContents(`content/${seriesName}/${chapterNum}`);
        if (contentsResult.ok) {
            images = contentsResult.value.filter(f => f.name.match(/\.(webp|jpg|png)$/));
        }
    }

    if (images.length) {
        images.sort((a, b) => naturalSort(a.name, b.name));
        grid.innerHTML = images.map(img => AdminImageItem({
            name: img.name,
            url: img.download_url,
            isSelected: adminState.selectedImages.has(img.name),
            onClick: 'window.toggleImageSelection(this)'
        })).join('');
        getEl('detail-image-count').textContent = `${images.length} images`;
    } else {
        grid.innerHTML = '<div class="empty-state">Failed to load images or empty chapter.</div>';
    }
}

export function toggleImageSelection(el) {
    const name = el.getAttribute('data-name');
    if (adminState.selectedImages.has(name)) {
        adminState.selectedImages.delete(name);
        el.classList.remove('selected');
    } else {
        adminState.selectedImages.add(name);
        el.classList.add('selected');
    }
    updateSelectionUI();
}

export function updateSelectionUI() {
    const count = adminState.selectedImages.size;
    const countEl = getEl('selected-count');
    if (countEl) countEl.textContent = count;

    const bulkBar = getEl('bulk-actions');
    const deleteBtn = getEl('btn-delete-selected');

    if (count > 0) {
        if (bulkBar) bulkBar.classList.remove('hidden');
        if (deleteBtn) deleteBtn.disabled = false;
    } else {
        if (bulkBar) bulkBar.classList.add('hidden');
        if (deleteBtn) deleteBtn.disabled = true;
    }
}

export function toggleSelectAll() {
    const all = document.querySelectorAll('.image-item');
    const checkbox = getEl('select-all-images');

    if (checkbox && checkbox.checked) {
        all.forEach(el => {
            const name = el.getAttribute('data-name');
            adminState.selectedImages.add(name);
            el.classList.add('selected');
        });
    } else {
        adminState.selectedImages.clear();
        all.forEach(el => el.classList.remove('selected'));
    }
    updateSelectionUI();
}

export function clearSelection() {
    adminState.selectedImages.clear();
    document.querySelectorAll('.image-item.selected').forEach(el => el.classList.remove('selected'));
    const checkbox = getEl('select-all-images');
    if (checkbox) checkbox.checked = false;
    updateSelectionUI();
}

export async function deleteSelectedImages() {
    if (!adminState.selectedImages.size) return;
    if (!confirm(`Delete ${adminState.selectedImages.size} images?`)) return;

    Toast.info('Deleting images...');

    const contentsRes = await adminState.github.getContents(`content/${adminState.currentSeries}/${adminState.currentChapter}`);
    if (!contentsRes.ok) return Toast.error("Failed to fetch contents");

    const toDelete = contentsRes.value.filter(f => adminState.selectedImages.has(f.name));
    let deleted = 0;

    for (const file of toDelete) {
        await adminState.github.deleteFile(file.path, file.sha);
        deleted++;
    }

    Toast.success(`Deleted ${deleted} images`);
    await loadChapterDetail(adminState.currentSeries, adminState.currentChapter);
}


export function setupDetailsHandlers() {
    window.toggleImageSelection = toggleImageSelection;
    window.handleDeleteChapter = handleDeleteChapter;
}



export async function deleteSeries() {
    const currentSeries = adminState.currentSeries;
    if (!confirm(`Delete "${currentSeries}"? All chapters and images will be permanently removed.`)) return;

    const series = adminState.series.find(s => s.name === currentSeries);
    const hasCloudChapters = series?.chapter_roots && Object.keys(series.chapter_roots).length > 0;

    if (hasCloudChapters) {
        Toast.warning('Deleting series...');
        const result = await addToPendingDeletes(`DELETE_SERIES:${currentSeries}`);
        if (result.ok) {
            Toast.success('Deletion queued for maintenance robot');
            await refreshSeriesData();
            
            window.switchView('series');
        } else {
            Toast.error('Delete failed');
        }
    } else {
        
        
        
        
        

        
        
        Toast.info("Queueing delete...");
        await addToPendingDeletes(`DELETE_SERIES:${currentSeries}`);
        window.switchView('series');
    }
}

export function changeCover() {
    window.openModal('modal-change-cover');
}

export async function uploadNewCover() {
    const file = getEl('modal-cover-file')?.files[0];
    if (!file) return Toast.error('Select file');

    Toast.info('Processing cover...');
    window.closeModal();

    const processRes = await tryCatch(() => processImage(file, 'cover'))();
    if (!processRes.ok) return Toast.error('Failed to process image');

    const parts = processRes.value;
    const currentSeries = adminState.currentSeries;

    const commitRes = await adminState.github.atomicCommit(`Update cover: ${currentSeries}`, [{
        path: `content/${currentSeries}/cover.webp`,
        mode: '100644',
        type: 'blob',
        content: parts[0].data
    }]);

    if (commitRes.ok) {
        Toast.success('Cover updated');
        await refreshSeriesData();
        loadSeriesDetail(currentSeries);
    } else {
        Toast.error('Upload failed');
    }
}

export function uploadMoreImages() {
    window.openModal('modal-upload-images');
    const log = getEl('modal-upload-log');
    const input = getEl('modal-upload-files');
    if (log) log.innerHTML = '';
    if (input) input.value = '';
}

export async function uploadModalImages() {
    const files = Array.from(getEl('modal-upload-files')?.files || []);
    if (!files.length) return Toast.error('Select files');

    const logDiv = getEl('modal-upload-log');
    const uploadBtn = getEl('modal-upload-btn');
    if (uploadBtn) uploadBtn.disabled = true;
    if (logDiv) logDiv.innerHTML = '';

    const addLog = (msg, type = 'pending') => {
        const icon = type === 'success' ? ICONS.SUCCESS : type === 'error' ? ICONS.ERROR : ICONS.SPINNER;
        if (logDiv) {
            logDiv.innerHTML += `<div class="log-item ${type}">${icon} <span>${msg}</span></div>`;
            logDiv.scrollTop = logDiv.scrollHeight;
        }
    };

    const task = async () => {
        const treeItems = [];
        const currentSeries = adminState.currentSeries;
        const currentChapter = adminState.currentChapter;

        for (const file of files) {
            addLog(`Processing ${file.name}...`);

            const processRes = await tryCatch(() => processImage(file, 'page'))();
            if (!processRes.ok) {
                addLog(`Failed: ${file.name}`, 'error');
                continue;
            }

            for (const part of processRes.value) {
                const name = file.name.replace(/\.[^.]+$/, '') + part.suffix + '.webp';
                const blobRes = await adminState.github.createBlob(part.data, 'base64');
                if (blobRes.ok) {
                    treeItems.push({
                        path: `content/${currentSeries}/${currentChapter}/${name}`,
                        mode: '100644',
                        type: 'blob',
                        sha: blobRes.value
                    });
                    addLog(`Processed ${name}`, 'success');
                }
            }
        }

        if (!treeItems.length) throw new Error('No files processed');

        addLog('Committing...');
        return await adminState.github.atomicCommit(`Add images to ${currentSeries} Ch${currentChapter}`, treeItems);
    };

    const result = await tryCatch(task)();

    if (uploadBtn) uploadBtn.disabled = false;

    if (result.ok) {
        addLog('Upload complete!', 'success');
        setTimeout(() => {
            window.closeModal();
            loadChapterDetail(adminState.currentSeries, adminState.currentChapter);
        }, 1000);
    } else {
        addLog('Upload failed', 'error');
    }
}

export async function triggerMigration(series, chapter) {
    series = series || adminState.currentSeries;
    chapter = chapter || adminState.currentChapter;

    if (!series || !chapter) return Toast.error("No chapter selected");

    if (!confirm(`Queue migration for ${series} Ch ${chapter}?`)) return;

    Toast.info('Queueing migration...');
    const result = await addToPendingDeletes(`MIGRATE:${series}/${chapter}`);

    if (result.ok) Toast.success('Migration queued');
    else Toast.error('Failed to queue migration');
}
