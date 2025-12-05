type SymbolSearchProps = {
    activeSymbol: string;
    recentSymbols: string[];
    onSelect(symbol: string): void;
};
export default function SymbolSearch({ activeSymbol, recentSymbols, onSelect }: SymbolSearchProps): import("react/jsx-runtime").JSX.Element;
export {};
