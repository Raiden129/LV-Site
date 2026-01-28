
import { ICONS } from '../constants.js';
import { encodePath, formatViewCount, naturalSort } from '../utils/helpers.js';

const html = (strings, ...values) => {
    return strings.reduce((result, str, i) =>
        result + str + (values[i] ?? ''), ''
    );
};

export const Card = {
    series(series, onClick) {
        const encodedCover = encodePath(series.cover);

        const cover = series.cover
            ? html`<img src="${encodedCover}" class="card-cover" loading="lazy" alt="${series.title}">`
            : html`<div class="card-cover"></div>`;

        
        const latestChapter = series.chapters?.length
            ? [...series.chapters].sort(naturalSort).pop()
            : null;

        const el = document.createElement('article');
        el.className = 'card-series';
        el.onclick = onClick;
        el.innerHTML = html`
            <div class="card-cover-wrapper">
                ${cover}
                <div class="card-cover-overlay"></div>
            </div>
            <div class="card-info">
                <h3 class="card-title">${series.title}</h3>
                <div class="card-meta">
                    <span class="chapter-badge">
                        ${ICONS.SERIES_BADGE} Chapter ${latestChapter || '—'}
                    </span>
                </div>
            </div>
        `;
        return el;
    },


    chapter(chapter, seriesId, viewCount, onClick) {
        const el = document.createElement('div');
        el.className = 'card-chapter';
        el.dataset.chapter = chapter;
        el.onclick = onClick;
        el.innerHTML = html`
            <div class="card-chapter-icon">${ICONS.BOOK_SPINE}</div>
            <div class="card-chapter-info">
                <span class="card-chapter-title">Chapter ${chapter}</span>
                <span class="card-chapter-meta">
                    <span class="meta-item">
                        ${ICONS.EYE}
                        <span class="view-count-text">${formatViewCount(viewCount)}</span>
                    </span>
                </span>
            </div>
            <div class="card-chapter-arrow">${ICONS.CHEVRON_RIGHT}</div>
        `;
        return el;
    },

    empty(icon, title, subtitle = '') {
        const el = document.createElement('div');
        el.className = 'empty-state';
        el.style.gridColumn = '1 / -1';
        el.innerHTML = html`
            ${icon}
            <div class="empty-title">${title}</div>
            ${subtitle ? html`<div class="empty-text">${subtitle}</div>` : ''}
        `;
        return el;
    }
};

export const AdminChapterItem = ({ chapter, seriesName, isArchived, onClickHandler, onDeleteHandler }) => {
    const archivedTag = isArchived ? '<span class="tag tag-archived">Archived</span>' : '';

    return html`
        <div class="chapter-item" onclick="${onClickHandler}">
            <div class="chapter-item-info">
                <div class="chapter-icon">${chapter}</div>
                <div class="chapter-title">Chapter ${chapter}</div>
                ${archivedTag}
            </div>
            <button class="btn-danger btn-sm" onclick="${onDeleteHandler}">Delete</button>
        </div>
    `;
};

export const AdminSeriesCard = (s, siteUrl) => {
    const coverUrl = s.cover ? `${siteUrl}/${encodePath(s.cover)}` : '';
    const coverHtml = coverUrl
        ? `<img src="${coverUrl}" class="card-cover" loading="lazy">`
        : `<div class="card-cover"></div>`;

    return html`
        <article class="card-series" onclick="openSeriesDetail('${s.name}')">
            <div class="card-cover-wrapper">
                ${coverHtml}
                <div class="card-cover-overlay"></div>
            </div>
            <div class="card-info">
                <h3 class="card-title">${s.name}</h3>
                <div class="card-meta">
                    <span class="chapter-badge">${ICONS.SERIES_BADGE} ${s.chapters.length} Ch</span>
                </div>
            </div>
        </article>
    `;
};

export const AdminSeriesListItem = (s, siteUrl) => {
    const coverUrl = s.cover ? `${siteUrl}/${encodePath(s.cover)}` : '';
    const coverHtml = coverUrl
        ? `<img src="${coverUrl}" loading="lazy">`
        : ``;

    return html`
        <div class="series-list-item" onclick="openSeriesDetail('${s.name}')">
            <div class="series-list-cover">
                ${coverHtml}
            </div>
            <div class="series-list-info">
                <div class="series-list-title">${s.name}</div>
                <div class="series-list-meta">
                   ${s.chapters.length} Chapters • ${Object.keys(s.chapter_roots || {}).length} Archived
                </div>
            </div>
            <div class="series-list-arrow">${ICONS.CHEVRON_RIGHT}</div>
        </div>
    `;
};
