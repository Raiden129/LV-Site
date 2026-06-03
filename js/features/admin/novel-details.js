





import { AdminImageItem } from '../../components/admin-ui.js';

let chapterEditor = null;


import { API, CONFIG, FILES, PATHS, ICONS } from '../../constants.js';
import { Result, tryCatch, getErrorMessage } from '../../utils/result.js';
import { getEl } from '../../utils/dom.js';
import { adminState, setCurrentNovel } from './state.js';
import { Toast } from '../../components/toast.js';
import { naturalSort } from '../../utils/helpers.js';
import { refreshNovelData } from './novel-dashboard.js';





export async function loadNovelSeriesDetail(novelId) {
    setCurrentNovel(novelId);

    
    if (!adminState.novels.length) {
        await refreshNovelData();
    }

    const novel = adminState.novels.find(n => n.id === novelId);
    if (!novel) {
        Toast.error('Novel not found');
        return;
    }

    
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    getEl('view-novel-series-detail')?.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector('.nav-item[data-view="novel-admin-series"]')?.classList.add('active');

    
    const coverEl = getEl('novel-detail-cover');
    if (coverEl) coverEl.src = novel.cover ? `${CONFIG.MAIN_SITE_URL}/${novel.cover}` : 'favicon.png';

    const titleEl = getEl('novel-detail-title');
    if (titleEl) titleEl.textContent = novel.title;

    const countEl = getEl('novel-detail-chapters-count');
    if (countEl) countEl.textContent = `${novel.chapters?.length || 0} Chapters`;

    
    renderNovelChapterList(novel);
}





function renderNovelChapterList(novel) {
    const container = getEl('novel-chapter-list');
    if (!container) return;

    const chapters = novel.chapters || [];

    if (!chapters.length) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No chapters yet. Upload your first chapter!</p>
            </div>
        `;
        return;
    }

    
    const sorted = [...chapters].sort((a, b) => naturalSort(a.number, b.number));

    container.innerHTML = sorted.map(ch => NovelChapterItem(novel.id, ch)).join('');
}






function NovelChapterItem(novelId, chapter) {
    const title = chapter.title || `Chapter ${chapter.number}`;

    return `
        <div class="chapter-item" onclick="AdminActions.editNovelChapter('${novelId}', '${chapter.number}')">
            <div class="chapter-item-info">
                <div class="chapter-icon">${chapter.number}</div>
                <div class="chapter-title">${title}</div>
            </div>
            <div class="chapter-actions" onclick="event.stopPropagation()">
                <button class="btn btn-icon btn-sm" title="Edit" onclick="AdminActions.editNovelChapter('${novelId}', '${chapter.number}')">
                    <svg class="icon-xs"><use href="#icon-file" /></svg>
                </button>
                <button class="btn btn-icon btn-danger btn-sm" title="Delete" onclick="AdminActions.deleteNovelChapter('${novelId}', '${chapter.number}')">
                    ${ICONS.TRASH.replace('<svg', '<svg class="icon-xs"')}
                </button>
            </div>
        </div>
    `;
}






export async function deleteNovelChapter(novelId, chapterNum) {
    const novel = adminState.novels.find(n => n.id === novelId);
    if (!novel) return Toast.error('Novel not found');

    const confirmResult = confirm(`Delete Chapter ${chapterNum} from "${novel.title}"?`);
    if (!confirmResult) return;

    Toast.info('Deleting chapter...');

    const deleteTask = async () => {
        const unwrap = (r) => { if (!r.ok) throw r.error; return r.value; };

        
        const latestCommit = unwrap(await adminState.github.getLatestCommit());

        
        const jsonRes = await adminState.github.request(`${API.CONTENT_BASE}/${FILES.NOVELS_JSON}?ref=${latestCommit}`);
        if (!jsonRes.ok) throw new Error('Failed to fetch novel.json');

        const novels = JSON.parse(atob(jsonRes.value.content));
        const novelIdx = novels.findIndex(n => n.id === novelId);
        if (novelIdx === -1) throw new Error('Novel not found in database');

        
        novels[novelIdx].chapters = novels[novelIdx].chapters.filter(c => c.number !== chapterNum);

        
        const treeItems = [];

        
        const chapterPath = `${PATHS.NOVEL_CONTENT}/${novelId}/${chapterNum.padStart(3, '0')}.md`;
        treeItems.push({ path: chapterPath, mode: '100644', type: 'blob', sha: null });

        
        const jsonBlob = unwrap(await adminState.github.createBlob(JSON.stringify(novels, null, 4), 'utf-8'));
        treeItems.push({ path: FILES.NOVELS_JSON, mode: '100644', type: 'blob', sha: jsonBlob });

        
        const baseTree = unwrap(await adminState.github.getTreeSha(latestCommit));
        const newTree = unwrap(await adminState.github.createTree(baseTree, treeItems));
        const newCommit = unwrap(await adminState.github.createCommit(`Delete ${novel.title} Ch.${chapterNum} [skip ci]`, newTree, latestCommit));
        unwrap(await adminState.github.updateRef(newCommit));

        return Result.success({ success: true });
    };

    const result = await tryCatch(deleteTask)();

    if (result.ok) {
        Toast.success('Chapter deleted');
        await refreshNovelData();
        loadNovelSeriesDetail(novelId);
    } else {
        Toast.error('Failed to delete chapter');
        console.error(result.error);
    }
}




export async function deleteNovel() {
    const novelId = adminState.currentNovel;
    const novel = adminState.novels.find(n => n.id === novelId);
    if (!novel) return Toast.error('No novel selected');

    const confirmResult = confirm(`Delete "${novel.title}" and all its chapters? This cannot be undone.`);
    if (!confirmResult) return;

    Toast.info('Deleting novel...');

    const deleteTask = async () => {
        const unwrap = (r) => { if (!r.ok) throw r.error; return r.value; };

        const latestCommit = unwrap(await adminState.github.getLatestCommit());

        
        const jsonRes = await adminState.github.request(`${API.CONTENT_BASE}/${FILES.NOVELS_JSON}?ref=${latestCommit}`);
        if (!jsonRes.ok) throw new Error('Failed to fetch novel.json');

        const novels = JSON.parse(atob(jsonRes.value.content));
        const updatedNovels = novels.filter(n => n.id !== novelId);

        
        const treeItems = [];

        
        const dirPath = `${PATHS.NOVEL_CONTENT}/${novelId}`;
        
        const dirRes = await adminState.github.request(`${API.CONTENT_BASE}/${dirPath}?ref=${latestCommit}`);

        if (dirRes.ok && Array.isArray(dirRes.value)) {
            
            for (const file of dirRes.value) {
                treeItems.push({ path: file.path, mode: '100644', type: 'blob', sha: null });
            }
        } else {
            console.warn('Could not list novel directory, falling back to known files');
            
            for (const ch of (novel.chapters || [])) {
                const chapterPath = `${PATHS.NOVEL_CONTENT}/${novelId}/${ch.file || ch.number.padStart(3, '0') + '.md'}`;
                treeItems.push({ path: chapterPath, mode: '100644', type: 'blob', sha: null });
            }
            if (novel.cover && novel.cover.startsWith('content/')) {
                treeItems.push({ path: novel.cover, mode: '100644', type: 'blob', sha: null });
            }
        }

        
        const jsonBlob = unwrap(await adminState.github.createBlob(JSON.stringify(updatedNovels, null, 4), 'utf-8'));
        treeItems.push({ path: FILES.NOVELS_JSON, mode: '100644', type: 'blob', sha: jsonBlob });

        
        const baseTree = unwrap(await adminState.github.getTreeSha(latestCommit));
        const newTree = unwrap(await adminState.github.createTree(baseTree, treeItems));
        const newCommit = unwrap(await adminState.github.createCommit(`Delete novel: ${novel.title} [skip ci]`, newTree, latestCommit));
        unwrap(await adminState.github.updateRef(newCommit));

        return Result.success({ success: true });
    };

    const result = await tryCatch(deleteTask)();

    if (result.ok) {
        Toast.success('Novel deleted');
        window.AdminActions?.switchView('novel-admin-series');
    } else {
        Toast.error('Failed to delete novel');
        console.error(result.error);
    }
}




export function editNovelMetadata() {
    const novel = adminState.novels.find(n => n.id === adminState.currentNovel);
    if (!novel) return Toast.error('No novel selected');

    
    const newTitle = prompt('Novel Title:', novel.title);
    if (newTitle === null) return;

    updateNovelMetadata(novel.id, {
        title: newTitle || novel.title
    });
}






async function updateNovelMetadata(novelId, updates) {
    Toast.info('Updating novel...');

    const updateTask = async () => {
        const unwrap = (r) => { if (!r.ok) throw r.error; return r.value; };

        const latestCommit = unwrap(await adminState.github.getLatestCommit());

        const jsonRes = await adminState.github.request(`${API.CONTENT_BASE}/${FILES.NOVELS_JSON}?ref=${latestCommit}`);
        if (!jsonRes.ok) throw new Error('Novel database not found. Please create a novel first.');

        const novels = JSON.parse(atob(jsonRes.value.content));
        const novelIdx = novels.findIndex(n => n.id === novelId);
        if (novelIdx === -1) throw new Error('Novel not found');

        
        Object.assign(novels[novelIdx], updates);

        const jsonBlob = unwrap(await adminState.github.createBlob(JSON.stringify(novels, null, 4), 'utf-8'));

        const result = await adminState.github.atomicCommit(
            `Update ${novels[novelIdx].title} metadata [skip ci]`,
            [{ path: FILES.NOVELS_JSON, mode: '100644', type: 'blob', sha: jsonBlob }]
        );

        if (!result.ok) throw result.error;
        return Result.success({ success: true });
    };

    const result = await tryCatch(updateTask)();

    if (result.ok) {
        Toast.success('Novel updated');
        await refreshNovelData();
        loadNovelSeriesDetail(novelId);
    } else {
        Toast.error('Failed to update novel');
        console.error(result.error);
    }
}




export function changeNovelCover() {
    window.AdminActions?.openModal('modal-change-novel-cover');
}




export async function uploadNewNovelCover() {
    const file = getEl('modal-novel-cover-file')?.files[0];
    if (!file) return Toast.error('Select file');

    Toast.info('Processing cover...');
    window.AdminActions?.closeModal();

    
    const { processImage } = await import('../../utils/image-processor.js');

    const task = async () => {
        const processRes = await tryCatch(() => processImage(file, 'cover'))();
        if (!processRes.ok) throw new Error('Failed to process image');

        const parts = processRes.value;
        const novelId = adminState.currentNovel;
        const unwrap = (r) => { if (!r.ok) throw r.error; return r.value; };

        
        const latestCommit = unwrap(await adminState.github.getLatestCommit());
        const jsonRes = await adminState.github.request(`${API.CONTENT_BASE}/${FILES.NOVELS_JSON}?ref=${latestCommit}`);
        if (!jsonRes.ok) throw new Error('Novel DB not found');

        const novels = JSON.parse(atob(jsonRes.value.content));
        const novelIdx = novels.findIndex(n => n.id === novelId);
        if (novelIdx === -1) throw new Error('Novel not found');

        
        
        const coverPath = `${PATHS.NOVEL_CONTENT}/${novelId}/cover.webp`;
        novels[novelIdx].cover = coverPath;
        novels[novelIdx].updated = new Date().toISOString();

        
        const jsonBlob = unwrap(await adminState.github.createBlob(JSON.stringify(novels, null, 4), 'utf-8'));
        
        const imgBlob = unwrap(await adminState.github.createBlob(parts[0].data, 'base64'));

        
        const commitRes = await adminState.github.atomicCommit(
            `Update novel cover: ${novels[novelIdx].title} [skip ci]`,
            [
                { path: FILES.NOVELS_JSON, mode: '100644', type: 'blob', sha: jsonBlob },
                { path: coverPath, mode: '100644', type: 'blob', sha: imgBlob }
            ]
        );

        if (!commitRes.ok) throw commitRes.error;
        return commitRes;
    };

    const result = await tryCatch(task)();

    if (result.ok) {
        Toast.success('Cover updated');
        await refreshNovelData();
        loadNovelSeriesDetail(adminState.currentNovel);
        if (getEl('modal-novel-cover-file')) getEl('modal-novel-cover-file').value = '';
    } else {
        Toast.error('Upload failed');
        console.error(result.error);
    }
}






export async function editNovelChapter(novelId, chapterNum) {
    const novel = adminState.novels.find(n => n.id === novelId);
    if (!novel) return Toast.error('Novel not found');

    const chapter = novel.chapters.find(c => c.number === chapterNum);
    if (!chapter) return Toast.error('Chapter not found');

    Toast.info('Loading chapter content...');

    
    const fileName = `${chapterNum.padStart(3, '0')}.md`;
    
    const path = `${API.CONTENT_BASE}/${PATHS.NOVEL_CONTENT}/${novelId}/${fileName}`;

    
    const res = await adminState.github.request(path);
    if (!res.ok) {
        console.error(res.error);
        return Toast.error('Failed to load chapter content');
    }

    let content = '';
    try {
        const raw = atob(res.value.content);
        content = decodeURIComponent(escape(raw));
    } catch (e) {
        console.warn('Failed to decode chapter content', e);
        return Toast.error('Content decoding failed');
    }

    
    getEl('modal-edit-novel-chapter-id').value = novelId;
    getEl('modal-edit-novel-chapter-num').value = chapterNum;
    getEl('modal-edit-novel-chapter-title').value = chapter.title || '';

    
    const modal = getEl('modal-edit-novel-chapter');
    modal.classList.remove('hidden');

    
    if (!chapterEditor) {
        chapterEditor = new EasyMDE({
            element: getEl('modal-edit-novel-chapter-content'),
            spellChecker: false,
            autosave: { enabled: false },
            toolbar: [
                'bold', 'italic', 'heading', '|',
                'quote', 'unordered-list', 'ordered-list', '|',
                'link', 'image',
                {
                    name: "center",
                    action: (editor) => {
                        const cm = editor.codemirror;
                        const selection = cm.getSelection();
                        cm.replaceSelection(`<center>${selection}</center>`);
                    },
                    className: "fa fa-align-center",
                    title: "Center Text",
                },
                '|',
                'preview', 'side-by-side', 'fullscreen', '|',
                'guide'
            ]
        });
    }

    chapterEditor.value(content);

    
    setTimeout(() => {
        if (chapterEditor) chapterEditor.codemirror.refresh();
    }, 50);
}





export async function saveNovelChapterEdit() {
    const novelId = getEl('modal-edit-novel-chapter-id').value;
    const chapterNum = getEl('modal-edit-novel-chapter-num').value;
    const newContent = chapterEditor ? chapterEditor.value() : getEl('modal-edit-novel-chapter-content').value;
    const newTitle = getEl('modal-edit-novel-chapter-title').value;

    if (!newContent) return Toast.error('Content cannot be empty');

    Toast.info('Saving changes...');
    window.AdminActions?.closeModal();

    const saveTask = async () => {
        
        const novelsRes = await refreshNovelData();
        if (!novelsRes.ok) {
            throw new Error(`Failed to sync database: ${getErrorMessage(novelsRes.error)}`, { cause: novelsRes.error });
        }

        const novels = novelsRes.value;
        const novelIdx = novels.findIndex(n => n.id === novelId);
        if (novelIdx === -1) throw new Error('Novel not found in DB');

        
        const chapterIdx = novels[novelIdx].chapters.findIndex(c => c.number === chapterNum);
        if (chapterIdx === -1) throw new Error('Chapter not found in DB');

        novels[novelIdx].chapters[chapterIdx].title = newTitle || `Chapter ${chapterNum}`;
        novels[novelIdx].updated = new Date().toISOString();

        
        const fileName = `${chapterNum.padStart(3, '0')}.md`;
        const filePath = `${PATHS.NOVEL_CONTENT}/${novelId}/${fileName}`;

        
        const unwrap = (r) => { if (!r.ok) throw r.error; return r.value; };

        const jsonContent = JSON.stringify(novels, null, 2);
        const jsonBlob = unwrap(await adminState.github.createBlob(jsonContent, 'utf-8'));
        const contentBlob = unwrap(await adminState.github.createBlob(newContent, 'utf-8'));

        
        const result = await adminState.github.atomicCommit(
            `Edit ${novels[novelIdx].title} Ch.${chapterNum}`,
            [
                { path: FILES.NOVELS_JSON, mode: '100644', type: 'blob', sha: jsonBlob },
                { path: filePath, mode: '100644', type: 'blob', sha: contentBlob }
            ]
        );

        if (!result.ok) throw result.error;
        return novels;
    };

    const result = await tryCatch(saveTask)();

    if (result.ok) {
        Toast.success('Chapter saved successfully');
        
        adminState.novels = result.value;
        loadNovelSeriesDetail(novelId);
    } else {
        Toast.error('Failed to save chapter');
        console.error(result.error);
    }
}






export function setupNovelDetailsHandlers(adminActions = window.AdminActions) {
    if (!adminActions) return;
    adminActions.openNovelDetail = loadNovelSeriesDetail;
    adminActions.deleteNovel = deleteNovel;
    adminActions.deleteNovelChapter = deleteNovelChapter;
    adminActions.editNovelMetadata = editNovelMetadata;
    adminActions.saveNovelChapterEdit = saveNovelChapterEdit;
    adminActions.editNovelChapter = editNovelChapter;
    adminActions.changeNovelCover = changeNovelCover;
    adminActions.uploadNewNovelCover = uploadNewNovelCover;
}
