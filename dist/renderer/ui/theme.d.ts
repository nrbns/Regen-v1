import { ReactNode } from 'react';
export declare function ThemeProvider({ children }: {
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function useTheme(): {
    preference: "light" | "dark" | "system";
    resolved: "light" | "dark";
    setPreference: (preference: "light" | "dark" | "system") => void;
    cyclePreference: () => void;
};
