import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { LayoutEngine, LayoutHeader, LayoutBody, LayoutFooter, LayoutSection, LayoutGrid, } from './layout-engine';
import { SkeletonCard, SkeletonList } from './skeleton';
const meta = {
    title: 'Layout/LayoutEngine',
    component: LayoutEngine,
    parameters: {
        layout: 'fullscreen',
    },
};
export default meta;
export const Default = {
    render: () => (_jsxs(LayoutEngine, { sidebarWidth: 240, navHeight: 64, "data-testid": "layout-engine-root", children: [_jsx(LayoutHeader, { children: _jsx("div", { style: { padding: '1rem', borderBottom: '1px solid var(--surface-border)' }, children: _jsx("h2", { children: "Header" }) }) }), _jsx(LayoutBody, { sidebar: _jsx("div", { style: { padding: '1rem' }, children: "Sidebar" }), children: _jsxs(LayoutSection, { spacing: "md", padded: true, children: [_jsx("h1", { children: "Main Content" }), _jsx("p", { children: "This is the main content area with consistent spacing and padding." })] }) }), _jsx(LayoutFooter, { children: _jsx("div", { style: { padding: '1rem', borderTop: '1px solid var(--surface-border)' }, children: "Footer" }) })] })),
};
export const WithRightPanel = {
    render: () => (_jsxs(LayoutEngine, { sidebarWidth: 240, navHeight: 64, rightPanelWidth: 320, children: [_jsx(LayoutHeader, { children: _jsx("div", { style: { padding: '1rem' }, children: "Header" }) }), _jsx(LayoutBody, { sidebar: _jsx("div", { style: { padding: '1rem' }, children: "Left Sidebar" }), rightPanel: _jsx("div", { style: { padding: '1rem' }, children: "Right Panel" }), children: _jsxs(LayoutSection, { spacing: "md", padded: true, children: [_jsx("h1", { children: "Main Content" }), _jsx("p", { children: "Content with both sidebars." })] }) })] })),
};
export const WithSkeleton = {
    render: () => (_jsxs(LayoutEngine, { sidebarWidth: 240, navHeight: 64, children: [_jsx(LayoutHeader, { children: _jsx("div", { style: { padding: '1rem' }, children: "Header" }) }), _jsx(LayoutBody, { sidebar: _jsx(SkeletonList, { items: 5 }), children: _jsxs(LayoutSection, { spacing: "md", padded: true, children: [_jsx("h1", { children: "Loading Content" }), _jsxs(LayoutGrid, { cols: 3, gap: "md", children: [_jsx(SkeletonCard, {}), _jsx(SkeletonCard, {}), _jsx(SkeletonCard, {})] })] }) })] })),
};
export const ResponsiveGrid = {
    render: () => (_jsxs(LayoutEngine, { sidebarWidth: 240, navHeight: 64, children: [_jsx(LayoutHeader, { children: _jsx("div", { style: { padding: '1rem' }, children: "Header" }) }), _jsx(LayoutBody, { children: _jsxs(LayoutSection, { spacing: "lg", padded: true, children: [_jsx("h1", { children: "Responsive Grid" }), _jsx(LayoutGrid, { cols: 3, gap: "md", children: Array.from({ length: 6 }).map((_, i) => (_jsxs("div", { style: {
                                    padding: '1rem',
                                    background: 'var(--surface-panel)',
                                    border: '1px solid var(--surface-border)',
                                    borderRadius: 'var(--radius-lg)',
                                }, children: ["Card ", i + 1] }, i))) })] }) })] })),
};
