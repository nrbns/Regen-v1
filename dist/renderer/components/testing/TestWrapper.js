import { jsx as _jsx } from "react/jsx-runtime";
import { ThemeProvider } from '../../ui/theme';
import { ErrorBoundary } from '../../core/errors/ErrorBoundary';
export function TestWrapper({ children, theme: _theme = 'dark' }) {
    // ThemeProvider doesn't accept defaultTheme prop - theme is managed by themeStore
    return (_jsx(ErrorBoundary, { children: _jsx(ThemeProvider, { children: children }) }));
}
