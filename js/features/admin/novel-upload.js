





import { API, FILES, PATHS } from '../../constants.js';
import { Result, tryCatch } from '../../utils/result.js';
import { getEl } from '../../utils/dom.js';
import { adminState, setNovelsCache } from './state.js';
import { Toast } from '../../components/toast.js';
import { refreshNovelData } from './novel-dashboard.js';
import { naturalSort, sleep } from '../../utils/helpers.js';






export function cleanMarkdown(content) {
    return content
        
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        
        .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
        
        .split('\n')
        .map(line => line.trimEnd())
        .join('\n')
        
        .replace(/\n{3,}/g, '\n\n')
        
        .trim() + '\n';
}







export function renderMarkdownPreview(markdown) {
    if (!markdown) return '<p class="empty-preview">No content to preview</p>';

    const lines = markdown.split('\n');
    const html = [];
    let inBlockquote = false;
    let blockquoteLines = [];

    const flushBlockquote = () => {
        if (blockquoteLines.length) {
            html.push(`<blockquote>${blockquoteLines.join('<br>')}</blockquote>`);
            blockquoteLines = [];
        }
        inBlockquote = false;
    };

    const processInline = (text) => {
        return text
            
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/__(.+?)__/g, '<strong>$1</strong>')
            
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/_(.+?)_/g, '<em>$1</em>');
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        
        if (!line) {
            flushBlockquote();
            continue;
        }

        
        if (/^(---|\*\*\*|___)$/.test(line)) {
            flushBlockquote();
            html.push('<hr class="scene-break">');
            continue;
        }

        
        if (line.startsWith('# ')) {
            flushBlockquote();
            html.push(`<h1>${processInline(line.slice(2))}</h1>`);
            continue;
        }
        if (line.startsWith('## ')) {
            flushBlockquote();
            html.push(`<h2>${processInline(line.slice(3))}</h2>`);
            continue;
        }
        if (line.startsWith('### ')) {
            flushBlockquote();
            html.push(`<h3>${processInline(line.slice(4))}</h3>`);
            continue;
        }

        
        if (line.startsWith('> ')) {
            inBlockquote = true;
            blockquoteLines.push(processInline(line.slice(2)));
            continue;
        }

        
        flushBlockquote();
        html.push(`<p>${processInline(line)}</p>`);
    }

    flushBlockquote();
    return html.join('\n');
}







export async function handleBulkNovelChapterUpload(novelId, files) {
    Toast.info(`Processing ${files.length} chapters...`);

    const uploadTask = async () => {
        const unwrap = (r) => { if (!r.ok) throw r.error; return r.value; };

        
        const latestCommit = unwrap(await adminState.github.getLatestCommit());
        const jsonRes = await adminState.github.request(`${API.CONTENT_BASE}/${FILES.NOVELS_JSON}?ref=${latestCommit}`);

        let novels = [];
        if (jsonRes.ok && jsonRes.value.content) {
            try {
                const raw = atob(jsonRes.value.content);
                novels = JSON.parse(decodeURIComponent(escape(raw)));
            } catch (e) {
                console.warn('Failed to parse novels.json', e);
            }
        }

        
        const slug = novelId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        let novelIdx = novels.findIndex(n => n.id === slug);

        if (novelIdx === -1) {
            novels.push({
                id: slug,
                title: novelId,
                cover: '',
                chapters: [],
                chapter_roots: {}
            });
            novelIdx = novels.length - 1;
        }

        const treeItems = [];
        const processedChapters = [];

        
        for (const file of files) {
            
            const match = file.name.match(/^(\d+)/);
            if (!match) {
                console.warn(`Skipping ${file.name}: No chapter number found`);
                continue;
            }
            const chapterNum = String(parseInt(match[1], 10)); 

            
            const content = await readMarkdownFile(file);
            const cleaned = cleanMarkdown(content);

            
            const blob = unwrap(await adminState.github.createBlob(cleaned, 'utf-8'));

            
            const fileName = chapterNum.padStart(3, '0') + '.md';
            const filePath = `${PATHS.NOVEL_CONTENT}/${slug}/${fileName}`;
            treeItems.push({ path: filePath, mode: '100644', type: 'blob', sha: blob });

            
            const existingChild = novels[novelIdx].chapters.find(c => c.number === chapterNum);
            const title = `Chapter ${chapterNum}`; 

            if (existingChild) {
                existingChild.file = fileName;
                
                
                
                if (!existingChild.title) existingChild.title = title;
            } else {
                novels[novelIdx].chapters.push({
                    number: chapterNum,
                    title: title,
                    file: fileName
                });
            }
            processedChapters.push(chapterNum);
        }

        if (treeItems.length === 0) throw new Error('No valid chapters found in selection');

        
        novels[novelIdx].chapters.sort((a, b) => naturalSort(a.number, b.number));
        novels[novelIdx].updated = new Date().toISOString();

        
        const jsonBlob = unwrap(await adminState.github.createBlob(JSON.stringify(novels, null, 4), 'utf-8'));
        treeItems.push({ path: FILES.NOVELS_JSON, mode: '100644', type: 'blob', sha: jsonBlob });

        
        const baseTree = unwrap(await adminState.github.getTreeSha(latestCommit));
        const newTree = unwrap(await adminState.github.createTree(baseTree, treeItems));
        const commitMsg = `Add ${processedChapters.length} chapters to ${novels[novelIdx].title} [skip ci]`;
        const newCommit = unwrap(await adminState.github.createCommit(commitMsg, newTree, latestCommit));
        unwrap(await adminState.github.updateRef(newCommit));

        return Result.success({ count: processedChapters.length });
    };

    const result = await tryCatch(uploadTask)();

    if (result.ok) {
        Toast.success(`Uploaded ${result.value.count} chapters!`);
        await refreshNovelData();
        return Result.success(result.value);
    } else {
        Toast.error(result.error?.message || 'Bulk upload failed');
        return Result.failure(result.error);
    }
}






export async function initiateNovelCreation(novelData, coverFile = null) {
    Toast.info('Creating novel...');

    
    const slug = novelData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    const createTask = async () => {
        const unwrap = (r) => { if (!r.ok) throw r.error; return r.value; };

        const latestCommit = unwrap(await adminState.github.getLatestCommit());

        
        const jsonRes = await adminState.github.request(`${API.CONTENT_BASE}/${FILES.NOVELS_JSON}?ref=${latestCommit}`);
        let novels = [];
        if (jsonRes.ok && jsonRes.value.content) {
            try {
                const rawContent = atob(jsonRes.value.content);
                const decoded = decodeURIComponent(escape(rawContent));
                novels = JSON.parse(decoded);
            } catch (e) {
                console.warn('Failed to parse novel.json, assuming empty');
            }
        }

        
        if (novels.find(n => n.id === slug)) {
            throw new Error('A novel with this title already exists');
        }

        
        const newNovel = {
            id: slug,
            title: novelData.title,
            cover: '',
            chapters: [],
            chapter_roots: {}
        };

        novels.push(newNovel);

        const treeItems = [];

        
        if (coverFile) {
            const { processImage } = await import('../../utils/image-processor.js');
            const processed = await processImage(coverFile, 'cover');

            const coverPath = `${PATHS.NOVEL_CONTENT}/${slug}/cover.webp`;
            const coverBlob = unwrap(await adminState.github.createBlob(processed[0].data));
            treeItems.push({ path: coverPath, mode: '100644', type: 'blob', sha: coverBlob });

            newNovel.cover = coverPath;
        }

        
        const jsonBlob = unwrap(await adminState.github.createBlob(JSON.stringify(novels, null, 4), 'utf-8'));
        treeItems.push({ path: FILES.NOVELS_JSON, mode: '100644', type: 'blob', sha: jsonBlob });

        
        const baseTree = unwrap(await adminState.github.getTreeSha(latestCommit));
        const newTree = unwrap(await adminState.github.createTree(baseTree, treeItems));
        const newCommit = unwrap(await adminState.github.createCommit(`Create novel: ${novelData.title} [skip ci]`, newTree, latestCommit));
        unwrap(await adminState.github.updateRef(newCommit));

        return Result.success({ novelId: slug });
    };

    const result = await tryCatch(createTask)();

    if (result.ok) {
        Toast.success(`Novel "${novelData.title}" created!`);
        await refreshNovelData();
        return result;
    } else {
        Toast.error(result.error?.message || 'Failed to create novel');
        return result;
    }
}






export function readMarkdownFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}
