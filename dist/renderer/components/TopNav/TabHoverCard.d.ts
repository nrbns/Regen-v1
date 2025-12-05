/**
 * TabHoverCard - Preview tab content on hover
 */
import React from 'react';
interface TabHoverCardProps {
    tabId: string;
    children: React.ReactElement;
}
export declare const TabHoverCard: React.ForwardRefExoticComponent<TabHoverCardProps & React.RefAttributes<HTMLDivElement>>;
export {};
