




import { VIEW } from '../constants.js';

export const ViewMachine = {
    current: VIEW.HOME,
    handlers: {},

    



    init(handlers) {
        this.handlers = handlers;
        window.addEventListener('popstate', () => this.syncFromURL());
    },

    states: {
        [VIEW.HOME]: {
            transitions: { OPEN_SERIES: VIEW.CHAPTERS, OPEN_NOVEL: VIEW.NOVEL_SERIES },
            enter: (ctx) => ViewMachine.handlers.home?.(ctx),
            exit: () => ViewMachine.handlers.cleanup?.()
        },
        [VIEW.CHAPTERS]: {
            transitions: { OPEN_CHAPTER: VIEW.READER, GO_HOME: VIEW.HOME },
            enter: (ctx) => ViewMachine.handlers.chapters?.(ctx),
            exit: () => ViewMachine.handlers.cleanup?.()
        },
        [VIEW.READER]: {
            transitions: { GO_CHAPTERS: VIEW.CHAPTERS, GO_HOME: VIEW.HOME, OPEN_CHAPTER: VIEW.READER },
            enter: (ctx) => ViewMachine.handlers.reader?.(ctx),
            exit: () => ViewMachine.handlers.cleanup?.()
        },
        [VIEW.NOVEL_SERIES]: {
            transitions: { OPEN_CHAPTER: VIEW.NOVEL_READER, GO_HOME: VIEW.HOME },
            enter: (ctx) => ViewMachine.handlers.novelSeries?.(ctx),
            exit: () => ViewMachine.handlers.cleanup?.()
        },
        [VIEW.NOVEL_READER]: {
            transitions: { GO_SERIES: VIEW.NOVEL_SERIES, GO_HOME: VIEW.HOME, OPEN_CHAPTER: VIEW.NOVEL_READER },
            enter: (ctx) => ViewMachine.handlers.novelReader?.(ctx),
            exit: () => ViewMachine.handlers.cleanup?.()
        }
    },

    




    send(event, context = {}) {
        const currentState = this.states[this.current];
        const nextView = currentState?.transitions[event];

        if (!nextView) {
            console.warn(`No transition '${event}' from '${this.current}'`);
            return;
        }

        this._transitionTo(nextView, context, true);
    },

    




    goTo(view, context = {}) {
        if (!this.states[view]) {
            console.warn(`Unknown view: ${view}`);
            return;
        }
        this._transitionTo(view, context, false);
    },

    _transitionTo(view, context, pushState) {
        
        this.states[this.current]?.exit?.();

        
        this._updateDOM(view, context.noScroll);

        
        this.current = view;

        
        if (pushState) {
            
            if (context.replaceUrl) {
                this._replaceURL(view, context);
            } else {
                this._pushURL(view, context);
            }
        }

        
        this.states[view].enter?.(context);
    },

    _updateDOM(viewName, noScroll = false) {
        
        Object.values(VIEW).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });

        
        const target = document.getElementById(viewName);
        if (target) target.classList.remove('hidden');

        if (!noScroll) {
            window.scrollTo(0, 0);
        }
    },

    _replaceURL(view, context) {
        const params = new URLSearchParams();
        if (context.seriesId) params.set('series', context.seriesId);
        if (context.novelId) params.set('novel', context.novelId);
        if (context.chapterId) params.set('ch', context.chapterId);

        const url = params.toString()
            ? `${window.location.pathname}?${params}`
            : window.location.pathname;

        window.history.replaceState({ view, ...context }, '', url);
    },

    _pushURL(view, context) {
        const params = new URLSearchParams();
        if (context.seriesId) params.set('series', context.seriesId);
        if (context.novelId) params.set('novel', context.novelId);
        if (context.chapterId) params.set('ch', context.chapterId);

        const url = params.toString()
            ? `${window.location.pathname}?${params}`
            : window.location.pathname;

        window.history.pushState({ view, ...context }, '', url);
    },

    



    syncFromURL() {
        const params = new URLSearchParams(window.location.search);
        const series = params.get('series');
        const novel = params.get('novel');
        const chapter = params.get('ch');

        if (novel && chapter) {
            this.goTo(VIEW.NOVEL_READER, { novelId: novel, chapterId: chapter });
        } else if (novel) {
            this.goTo(VIEW.NOVEL_SERIES, { novelId: novel });
        } else if (series && chapter) {
            this.goTo(VIEW.READER, { seriesId: series, chapterId: chapter });
        } else if (series) {
            this.goTo(VIEW.CHAPTERS, { seriesId: series });
        } else {
            this.goTo(VIEW.HOME, {});
        }
    }
};
