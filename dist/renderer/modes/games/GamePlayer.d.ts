/**
 * Game Player - Sandboxed iframe container for games
 */
interface Game {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    category: string;
    type: string;
    source: string;
    embed_url: string | null;
    offline_capable: boolean;
    license: string;
    attribution: string;
    size_kb: number;
    tags: string[];
}
interface GamePlayerProps {
    game: Game;
    onClose: () => void;
}
export declare function GamePlayer({ game, onClose }: GamePlayerProps): import("react/jsx-runtime").JSX.Element;
export {};
