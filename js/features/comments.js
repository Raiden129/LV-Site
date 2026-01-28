
import { Toast } from '../components/toast.js';
import { ImgBB } from '../api/imgbb.js';
import { TOAST_TYPE, GISCUS, VIEW, GISCUS_THEME } from '../constants.js';

export const Comments = {
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
                "data-mapping": "url",
                "data-strict": "0",
                "data-reactions-enabled": "1",
                "data-emit-metadata": "0",
                "data-input-position": "top",
                "data-theme": this.getTheme(),
                "data-lang": "en",
                crossorigin: "anonymous",
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

        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
            wrapper.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        wrapper.addEventListener('dragenter', () => wrapper.classList.add('drag-active'));
        wrapper.addEventListener('dragleave', () => wrapper.classList.remove('drag-active'));
        wrapper.addEventListener('drop', (e) => {
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
