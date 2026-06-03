




import { TOAST_TYPE, ICONS, CSS_CLASSES, ANIMATION, TOAST_DURATION } from '../constants.js';


let container = null;

function getContainer() {
    if (!container) {
        container = document.getElementById(CSS_CLASSES.TOAST_CONTAINER);
        if (!container) {
            container = document.createElement('div');
            container.id = CSS_CLASSES.TOAST_CONTAINER;
            container.className = CSS_CLASSES.TOAST_CONTAINER;
            document.body.appendChild(container);
        }
    }
    return container;
}

const ICON_MAP = {
    [TOAST_TYPE.SUCCESS]: ICONS.SUCCESS,
    [TOAST_TYPE.ERROR]: ICONS.ERROR,
    [TOAST_TYPE.WARNING]: ICONS.WARNING,
    [TOAST_TYPE.INFO]: ICONS.INFO,
    [TOAST_TYPE.LOADING]: ICONS.SPINNER
};

export const Toast = {
    show(message, type = TOAST_TYPE.INFO, duration = TOAST_DURATION.DEFAULT_MS) {
        const toast = document.createElement('div');
        toast.className = `${CSS_CLASSES.TOAST} ${type}`;
        toast.innerHTML = `
            <span class="${CSS_CLASSES.TOAST_ICON}">${ICON_MAP[type] || ICONS.INFO}</span>
            <span class="${CSS_CLASSES.TOAST_MESSAGE}">${message}</span>
        `;

        getContainer().appendChild(toast);

        if (type !== TOAST_TYPE.LOADING && duration > 0) {
            setTimeout(() => {
                toast.style.animation = ANIMATION.FADE_OUT;
                setTimeout(() => toast.remove(), ANIMATION.FADE_DURATION_MS);
            }, duration);
        }

        return toast; 
    },

    inline(element, message, type = TOAST_TYPE.INFO, duration = TOAST_DURATION.DEFAULT_MS) {
        if (!element) return;

        element.textContent = message;
        element.className = `${CSS_CLASSES.UPLOAD_STATUS_TOAST} ${type}`;
        element.classList.remove(CSS_CLASSES.HIDDEN);

        if (type !== TOAST_TYPE.LOADING && duration > 0) {
            setTimeout(() => element.classList.add(CSS_CLASSES.HIDDEN), duration);
        }
    },

    
    success: (msg) => Toast.show(msg, TOAST_TYPE.SUCCESS),
    error: (msg) => Toast.show(msg, TOAST_TYPE.ERROR),
    warning: (msg) => Toast.show(msg, TOAST_TYPE.WARNING),
    info: (msg) => Toast.show(msg, TOAST_TYPE.INFO),
    loading: (msg) => Toast.show(msg, TOAST_TYPE.LOADING, TOAST_DURATION.LOADING)
};


window.showToast = (msg, type) => Toast.show(msg, type);
