export const featureFlags = {
    modes: {
        Browse: { status: 'ready' },
        Research: { status: 'ready' },
        Trade: { status: 'beta', description: 'TradingView integration in preview' },
        Games: { status: 'hidden' },
        Docs: { status: 'soon', description: 'Coming soon: workspace view' },
        Images: { status: 'soon', description: 'AI image search coming soon' },
        Threats: { status: 'soon', description: 'Threat intelligence dashboard' },
        GraphMind: { status: 'hidden' },
    },
};
export function getModeFlag(mode) {
    return featureFlags.modes[mode] ?? { status: 'soon' };
}
