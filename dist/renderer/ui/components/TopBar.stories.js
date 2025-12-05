/**
 * Storybook stories for TopBar component
 */
import { TopBar } from './TopBar';
const meta = {
    title: 'UI/TopBar',
    component: TopBar,
    parameters: {
        layout: 'fullscreen',
    },
    tags: ['autodocs'],
};
export default meta;
export const Default = {
    args: {
        showAddressBar: true,
        showQuickActions: true,
    },
};
export const Compact = {
    args: {
        compact: true,
        showAddressBar: true,
        showQuickActions: true,
    },
};
export const WithoutAddressBar = {
    args: {
        showAddressBar: false,
        showQuickActions: true,
    },
};
export const Minimal = {
    args: {
        showAddressBar: false,
        showQuickActions: false,
        compact: true,
    },
};
