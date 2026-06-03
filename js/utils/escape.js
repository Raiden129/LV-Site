





const ESCAPE_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
};

export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ESCAPE_MAP[ch]);

export const escapeAttr = (value) => escapeHtml(value).replace(/`/g, '&#96;');
