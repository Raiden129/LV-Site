import { ICONS } from '../../constants.js';

export function createAdminSeriesListItem({
    title,
    coverUrl,
    metaText,
    action,
    payload
}) {
    const item = document.createElement('div');
    item.className = 'series-list-item';
    item.dataset.adminAction = action;
    if (payload !== undefined) {
        item.dataset.adminPayload = JSON.stringify(payload);
    }

    const coverWrap = document.createElement('div');
    coverWrap.className = 'series-list-cover';

    if (coverUrl) {
        const img = document.createElement('img');
        img.loading = 'lazy';
        img.src = coverUrl;
        img.alt = title;
        coverWrap.appendChild(img);
    }

    const info = document.createElement('div');
    info.className = 'series-list-info';

    const heading = document.createElement('div');
    heading.className = 'series-list-title';
    heading.textContent = title;

    const meta = document.createElement('div');
    meta.className = 'series-list-meta';
    meta.textContent = metaText;

    const arrow = document.createElement('div');
    arrow.className = 'series-list-arrow';
    arrow.insertAdjacentHTML('beforeend', ICONS.CHEVRON_RIGHT);

    info.append(heading, meta);
    item.append(coverWrap, info, arrow);
    return item;
}

