






const adminActionHandlers = new Map();

export function registerAdminAction(actionName, handler) {
    if (!actionName || typeof handler !== 'function') return;
    adminActionHandlers.set(actionName, handler);
}

export function invokeAdminAction(actionName, ...args) {
    const handler = adminActionHandlers.get(actionName);
    if (!handler) return;
    return handler(...args);
}

function parsePayload(rawPayload) {
    if (!rawPayload) return undefined;
    try {
        return JSON.parse(rawPayload);
    } catch {
        return undefined;
    }
}

export function dispatchDelegatedAdminAction(event) {
    const actionEl = event.target?.closest?.('[data-admin-action]');
    if (!actionEl) return false;

    const actionName = actionEl.dataset.adminAction;
    if (!actionName) return false;

    const payload = parsePayload(actionEl.dataset.adminPayload);
    invokeAdminAction(actionName, {
        event,
        element: actionEl,
        payload
    });
    return true;
}

export function createAdminActionsShim() {
    return new Proxy({}, {
        get(target, prop) {
            if (prop in target) return target[prop];
            return (...args) => invokeAdminAction(String(prop), ...args);
        },
        set(target, prop, value) {
            if (typeof value === 'function') {
                registerAdminAction(String(prop), value);
            }
            target[prop] = value;
            return true;
        }
    });
}
