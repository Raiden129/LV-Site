
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
            transitions: { OPEN_SERIES: VIEW.CHAPTERS },
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

        
        this._updateDOM(view);

        
        this.current = view;

        
        if (pushState) {
            this._pushURL(view, context);
        }

        
        this.states[view].enter?.(context);
    },

    _updateDOM(viewName) {
        
        Object.values(VIEW).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });

        
        const target = document.getElementById(viewName);
        if (target) target.classList.remove('hidden');

        window.scrollTo(0, 0);
    },

    _pushURL(view, context) {
        const params = new URLSearchParams();
        if (context.seriesId) params.set('series', context.seriesId);
        if (context.chapterId) params.set('ch', context.chapterId);

        const url = params.toString()
            ? `${window.location.pathname}?${params}`
            : window.location.pathname;

        window.history.pushState({ view, ...context }, '', url);
    },

    
    syncFromURL() {
        const params = new URLSearchParams(window.location.search);
        const series = params.get('series');
        const chapter = params.get('ch');

        if (series && chapter) {
            this.goTo(VIEW.READER, { seriesId: series, chapterId: chapter });
        } else if (series) {
            this.goTo(VIEW.CHAPTERS, { seriesId: series });
        } else {
            this.goTo(VIEW.HOME, {});
        }
    }
};
