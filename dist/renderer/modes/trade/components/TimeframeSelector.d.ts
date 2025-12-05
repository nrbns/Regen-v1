type TimeframeOption = {
    value: string;
    label: string;
    description?: string;
};
type TimeframeSelectorProps = {
    value: string;
    onChange: (value: string) => void;
    options?: TimeframeOption[];
};
export default function TimeframeSelector({ value, onChange, options, }: TimeframeSelectorProps): import("react/jsx-runtime").JSX.Element;
export {};
