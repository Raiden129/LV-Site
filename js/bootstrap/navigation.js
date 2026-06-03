import { ViewMachine } from '../state/viewMachine.js';

function handleNavigationAction(event) {
    const homeAction = event.target.closest('[data-action="go-home"]');
    if (homeAction) {
        event.preventDefault();
        ViewMachine.send('GO_HOME');
        return;
    }
}

export function initNavigation(handlers) {
    ViewMachine.init(handlers);

    
    
    document.addEventListener('click', handleNavigationAction);

    return {
        ok: true,
        viewMachine: ViewMachine,
        syncFromURL: () => ViewMachine.syncFromURL()
    };
}
