const commandMap = new Map();
const sources = new Map();
const listeners = new Set();
let isHydrated = false;
function emitChange() {
    listeners.forEach((listener) => {
        try {
            listener();
        }
        catch (error) {
            console.error('[CommandRegistry] Listener error', error);
        }
    });
}
export function registerCommand(command) {
    if (commandMap.has(command.id)) {
        console.warn(`[CommandRegistry] Command with id "${command.id}" already registered. Overwriting.`);
    }
    commandMap.set(command.id, command);
    emitChange();
    return () => {
        if (commandMap.delete(command.id)) {
            emitChange();
        }
    };
}
export function registerCommandSource(source) {
    if (sources.has(source.id)) {
        console.warn(`[CommandRegistry] Command source with id "${source.id}" already registered. Overwriting.`);
    }
    sources.set(source.id, source);
    emitChange();
    return () => {
        if (sources.delete(source.id)) {
            emitChange();
        }
    };
}
export async function getAllCommands() {
    const staticCommands = Array.from(commandMap.values());
    const dynamicResults = await Promise.all(Array.from(sources.values()).map(async (source) => {
        try {
            const results = await source.getCommands();
            return results;
        }
        catch (error) {
            console.error(`[CommandRegistry] Failed to load commands from source "${source.id}":`, error);
            return [];
        }
    }));
    return [...staticCommands, ...dynamicResults.flat()];
}
export function onCommandsChanged(listener) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
export function markHydrated() {
    isHydrated = true;
}
export function commandsHydrated() {
    return isHydrated;
}
export function notifyCommandsChanged() {
    emitChange();
}
