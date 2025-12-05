import { aiEngine } from '../core/ai';
import { ipc } from '../lib/ipc-typed';
function buildDefaultActions(summary, citations) {
    const actions = [];
    if (summary.trim().length > 0) {
        actions.push({
            id: 'save-summary',
            type: 'save_summary',
            label: 'Save summary to notes',
            description: 'Store these key takeaways in the current research session.',
            payload: { summary },
            badge: 'Recommended',
        });
    }
    const topCitation = citations[0];
    if (topCitation?.url) {
        actions.push({
            id: 'open-source',
            type: 'open_url',
            label: `Open ${topCitation.label}`,
            description: 'Review the highest-confidence citation in a new tab.',
            payload: { url: topCitation.url },
        });
    }
    actions.push({
        id: 'follow-up',
        type: 'follow_up',
        label: 'Ask a follow-up question',
        description: 'Use the summary to draft a more specific research prompt.',
        payload: {
            prompt: `Give me 3 follow-up questions based on this summary:\n${summary}`,
        },
    });
    return actions;
}
function sanitizeContext(context) {
    if (!context)
        return {};
    return Object.entries(context).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            acc[key] = value;
        }
        return acc;
    }, {});
}
function coerceSources(sources) {
    if (!Array.isArray(sources))
        return undefined;
    const normalized = sources
        .map(item => {
        if (typeof item === 'string')
            return item;
        if (item && typeof item === 'object') {
            const maybeUrl = 'url' in item && typeof item.url === 'string'
                ? item.url
                : undefined;
            const maybeLabel = 'label' in item && typeof item.label === 'string'
                ? item.label
                : undefined;
            return maybeUrl || maybeLabel;
        }
        return undefined;
    })
        .filter((value) => Boolean(value));
    return normalized.length ? normalized : undefined;
}
function normalizeResponse(answer, sources, model) {
    const trimmed = answer.trim();
    const citations = sources?.map((source, index) => ({
        label: source.replace(/^https?:\/\//, '').split('/')[0] || `Source ${index + 1}`,
        url: source,
    })) || [];
    return {
        summary: trimmed || 'No summary available.',
        confidence: trimmed ? 0.78 : 0.4,
        actions: buildDefaultActions(trimmed, citations),
        citations,
        model,
    };
}
export async function runResearchAgent(request) {
    const contextPayload = {
        url: request.context.url,
        text: request.context.selection || request.context.notes,
    };
    try {
        const result = (await ipc.agent.ask(request.prompt, contextPayload));
        if (!result || !result.answer) {
            throw new Error('Agent returned an empty answer');
        }
        return normalizeResponse(result.answer, result.sources, result.model);
    }
    catch (error) {
        console.warn('[ResearchAgent] IPC agent failed, falling back to aiEngine', error);
        const fallback = await aiEngine.runTask({
            kind: 'agent',
            prompt: request.prompt,
            context: sanitizeContext(request.context),
            mode: 'research',
            llm: {
                temperature: 0.2,
                maxTokens: 600,
            },
        }, () => { });
        return normalizeResponse(fallback?.text || '', coerceSources(fallback?.citations), fallback?.model);
    }
}
export async function executeResearchAgentAction(action, context) {
    switch (action.type) {
        case 'open_url': {
            const targetUrl = action.payload?.url;
            if (targetUrl) {
                await ipc.tabs.create(targetUrl);
            }
            return;
        }
        case 'save_summary': {
            const summary = action.payload?.summary;
            if (!summary)
                return;
            const targetUrl = context.url || 'about:blank';
            await ipc.research.saveNotes(targetUrl, summary, []);
            return;
        }
        case 'follow_up': {
            return action.payload?.prompt;
        }
        default:
            return;
    }
}
