import type { Tab } from '../../state/tabsStore';
interface TabContentSurfaceProps {
    tab: Tab | undefined;
    overlayActive?: boolean;
}
export declare function TabContentSurface({ tab, overlayActive }: TabContentSurfaceProps): import("react/jsx-runtime").JSX.Element;
export {};
