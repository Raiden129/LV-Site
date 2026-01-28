
import { TOAST_TYPE, ICONS } from '../constants.js';


let container = null;

function getContainer() {
    if (!container) {
        container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
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
    show(message, type = TOAST_TYPE.INFO, duration = 4000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${ICON_MAP[type] || ICONS.INFO}</span>
            <span class="toast-message">${message}</span>
        `;

        getContainer().appendChild(toast);

        if (type !== TOAST_TYPE.LOADING && duration > 0) {
            setTimeout(() => {
                toast.style.animation = 'fadeIn 0.3s ease reverse';
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }

        return toast; 
    },

    inline(element, message, type = TOAST_TYPE.INFO, duration = 4000) {
        if (!element) return;

        element.textContent = message;
        element.className = `upload-status-toast ${type}`;
        element.classList.remove('hidden');

        if (type !== TOAST_TYPE.LOADING && duration > 0) {
            setTimeout(() => element.classList.add('hidden'), duration);
        }
    },

    
    success: (msg) => Toast.show(msg, TOAST_TYPE.SUCCESS),
    error: (msg) => Toast.show(msg, TOAST_TYPE.ERROR),
    warning: (msg) => Toast.show(msg, TOAST_TYPE.WARNING),
    info: (msg) => Toast.show(msg, TOAST_TYPE.INFO),
    loading: (msg) => Toast.show(msg, TOAST_TYPE.LOADING, 0)
};


window.showToast = (msg, type) => Toast.show(msg, type);
