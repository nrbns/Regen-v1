import { jsx as _jsx } from "react/jsx-runtime";
import { Toggle } from './Toggle';
/**
 * Switch - Alias for Toggle with different default styling
 * Can be customized separately if needed
 */
export function Switch(props) {
    return _jsx(Toggle, { ...props });
}
