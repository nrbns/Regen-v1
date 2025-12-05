/**
 * Storybook stories for HeroPanel component
 */
import { HeroPanel } from './HeroPanel';
const meta = {
    title: 'UI/HeroPanel',
    component: HeroPanel,
    parameters: {
        layout: 'fullscreen',
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
export const WithQuickAction = {
    args: {
        onQuickAction: (action) => {
            console.log('Quick action:', action);
        },
    },
};
