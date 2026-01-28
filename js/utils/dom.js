

export const getEl = (id) => document.getElementById(id);

export const createEl = (tag, className, htmlContent = '') => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (htmlContent) el.innerHTML = htmlContent;
    return el;
};
