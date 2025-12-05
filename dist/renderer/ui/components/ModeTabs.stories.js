/**
 * Storybook stories for ModeTabs component
 */
import { ModeTabs } from './ModeTabs';
const meta = {
    title: 'UI/ModeTabs',
    component: ModeTabs,
    parameters: {
        layout: 'padded',
    },
    tags: ['autodocs'],
};
export default meta;
export const Default = {
    args: {
        compact: false,
    },
};
export const Compact = {
    args: {
        compact: true,
    },
};
export const WithModeChange = {
    args: {
        onModeChange: (mode) => {
            console.log('Mode changed to:', mode);
        },
    },
};
