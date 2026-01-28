
import { formatFileSize } from '../utils/helpers.js';
import { ICONS } from '../constants.js';

export const FilePreviewItem = (file, index) => `
    <div class="preview-item">
        <div class="preview-info">
            <div class="preview-name">${file.name}</div>
            <div class="preview-size">${formatFileSize(file.size)}</div>
        </div>
        <button class="preview-remove" onclick="removeFile(${index})">×</button>
    </div>
`;

export const UploadLogItem = (msg, type = 'pending') =>
    `<div class="log-item ${type}">${msg}</div>`;

export const AdminImageItem = ({ name, url, isSelected, onClick }) => `
    <div class="image-item ${isSelected ? 'selected' : ''}" onclick="${onClick}" data-name="${name}">
        <img src="${url}" loading="lazy">
        <div class="image-name">${name}</div>
        <div class="selection-overlay">
            ${ICONS.CHECK || '✓'}
        </div>
    </div>
`;
