




import { Toast } from '../components/toast.js';
import { ImgBB } from '../client-api/imgbb.js';
import { TOAST_TYPE, GISCUS, VIEW, GISCUS_THEME, GISCUS_CONFIG, DRAG_DROP_EVENTS } from '../constants.js';

export const Comments = {
    bindUIActions(root = document) {
        root.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-comment-action]');
            if (!actionEl) return;

            const action = actionEl.dataset.commentAction;
            if (!action) return;

            if (action === 'toggle-help') {
                event.preventDefault();
                this.toggleHelp();
                return;
            }

            if (action === 'copy-spoiler') {
                event.preventDefault();
                this.copySpoilerTemplate();
                return;
            }

            if (action === 'copy-snippet') {
                event.preventDefault();
                this.copyToComment(actionEl.dataset.commentText || '');
            }
        });
    },

    clearAll() {
        document.querySelectorAll('.comments-container').forEach(el => {
            el.innerHTML = '';
        });
    },

    



    load(viewId = null) {
        
        requestAnimationFrame(() => {
            const section = viewId
                ? document.getElementById(viewId)
                : document.querySelector('section:not(.hidden)');

            if (!section) return;

            const container = section.querySelector('.comments-container');
            if (!container) return;

            this.initUpload(section);

            
            container.innerHTML = '';
            const script = document.createElement('script');
            Object.entries({
                src: GISCUS.SCRIPT_URL,
                "data-repo": GISCUS.REPO,
                "data-repo-id": GISCUS.REPO_ID,
                "data-category": GISCUS.CATEGORY,
                "data-category-id": GISCUS.CATEGORY_ID,
                "data-mapping": GISCUS_CONFIG.MAPPING,
                "data-strict": GISCUS_CONFIG.STRICT,
                "data-reactions-enabled": GISCUS_CONFIG.REACTIONS_ENABLED,
                "data-emit-metadata": GISCUS_CONFIG.EMIT_METADATA,
                "data-input-position": GISCUS_CONFIG.INPUT_POSITION,
                "data-theme": this.getTheme(),
                "data-lang": GISCUS_CONFIG.LANG,
                crossorigin: GISCUS_CONFIG.CROSSORIGIN,
                async: true
            }).forEach(([k, v]) => script.setAttribute(k, v));

            container.appendChild(script);
        });
    },

    getTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        return current === 'light' ? GISCUS_THEME.LIGHT : GISCUS_THEME.DARK;
    },

    updateTheme(theme) {
        const iframe = document.querySelector('iframe.giscus, iframe.giscus-frame');
        if (!iframe?.contentWindow) return;

        iframe.contentWindow.postMessage({
            giscus: { setConfig: { theme: theme === 'light' ? GISCUS_THEME.LIGHT : GISCUS_THEME.DARK } }
        }, GISCUS.ORIGIN);
    },

    toggleHelp() {
        const visibleSection = document.querySelector('section:not(.hidden)');
        const panel = visibleSection?.querySelector('.comment-help-panel');
        if (panel) panel.classList.toggle('hidden');
    },

    copySpoilerTemplate() {
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText("<details><summary>Spoiler</summary>\n\nTYPE SPOILER HERE\n\n</details>");
    },

    copyToComment(text) {
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(text);
    },

    initUpload(section) {
        const wrapper = section.querySelector('.comments-wrapper');
        const fileInput = section.querySelector('input[type="file"]');
        const uploadBtn = section.querySelector('button[title="Upload Image"]');
        const toastEl = section.querySelector('.upload-status-toast');

        if (!wrapper || !fileInput) return;

        
        const newBtn = uploadBtn.cloneNode(true);
        uploadBtn.parentNode.replaceChild(newBtn, uploadBtn);
        const newInput = fileInput.cloneNode(true);
        fileInput.parentNode.replaceChild(newInput, fileInput);

        newBtn.onclick = () => newInput.click();
        newInput.onchange = (e) => this.handleFiles(e.target.files, toastEl);

        
        [DRAG_DROP_EVENTS.ENTER, DRAG_DROP_EVENTS.OVER, DRAG_DROP_EVENTS.LEAVE, DRAG_DROP_EVENTS.DROP].forEach(evt => {
            wrapper.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        wrapper.addEventListener(DRAG_DROP_EVENTS.ENTER, () => wrapper.classList.add('drag-active'));
        wrapper.addEventListener(DRAG_DROP_EVENTS.LEAVE, () => wrapper.classList.remove('drag-active'));
        wrapper.addEventListener(DRAG_DROP_EVENTS.DROP, (e) => {
            wrapper.classList.remove('drag-active');
            this.handleFiles(e.dataTransfer.files, toastEl);
        });
    },

    async handleFiles(files, toastEl) {
        if (!files?.length) return;
        const file = files[0];

        if (!file.type.startsWith('image/')) {
            Toast.inline(toastEl, 'Error: Images only', TOAST_TYPE.ERROR);
            return;
        }

        Toast.inline(toastEl, 'Uploading...', TOAST_TYPE.LOADING);

        const result = await ImgBB.upload(file);

        result.match({
            success: (data) => {
                const markdown = `![Image](${data.url})`;
                if (navigator.clipboard) navigator.clipboard.writeText(markdown);
                Toast.inline(toastEl, '✓ Link copied! Paste it.', TOAST_TYPE.SUCCESS);
            },
            failure: () => Toast.inline(toastEl, 'Upload failed', TOAST_TYPE.ERROR)
        });
    }
};
