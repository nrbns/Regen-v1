import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Skeleton, SkeletonText, SkeletonCard, SkeletonList, SkeletonTable } from './skeleton';
const meta = {
    title: 'Components/Skeleton',
    component: Skeleton,
};
export default meta;
export const Default = {
    render: () => _jsx(Skeleton, { variant: "rectangular", width: 200, height: 40 }),
};
export const Text = {
    render: () => _jsx(SkeletonText, { lines: 3 }),
};
export const Circular = {
    render: () => _jsx(Skeleton, { variant: "circular", width: 40, height: 40 }),
};
export const Card = {
    render: () => _jsx(SkeletonCard, { "data-testid": "skeleton-card" }),
};
export const List = {
    render: () => _jsx(SkeletonList, { items: 5 }),
};
export const Table = {
    render: () => _jsx(SkeletonTable, { rows: 5, cols: 4 }),
};
export const MultipleCards = {
    render: () => (_jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }, children: [_jsx(SkeletonCard, {}), _jsx(SkeletonCard, {}), _jsx(SkeletonCard, {})] })),
};
