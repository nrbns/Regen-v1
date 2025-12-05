/**
 * OmniAgent Input - Tier 2
 * "Ask OmniAgent" input in Research Mode
 */
interface OmniAgentInputProps {
    currentUrl?: string;
    onResult?: (result: {
        type: string;
        content: string;
        sources?: Array<{
            url: string;
            title: string;
        }>;
    }) => void;
}
export declare function OmniAgentInput({ currentUrl, onResult }: OmniAgentInputProps): import("react/jsx-runtime").JSX.Element;
export {};
