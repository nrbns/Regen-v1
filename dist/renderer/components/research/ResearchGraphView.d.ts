type GraphNode = {
    key: string;
    type?: string;
    title?: string;
    meta?: Record<string, any>;
    created_at?: number;
};
type GraphEdge = {
    src: string;
    dst: string;
    rel?: string;
    weight?: number;
    created_at?: number;
};
export type ResearchGraphData = {
    nodes: GraphNode[];
    edges: GraphEdge[];
};
type ResearchGraphViewProps = {
    query: string;
    queryKey: string | null;
    graphData: ResearchGraphData | null;
    activeSourceId: string | null;
    onSelectSource(sourceKey: string): void;
    onOpenSource(url: string): void;
};
export declare function ResearchGraphView({ query, queryKey, graphData, activeSourceId, onSelectSource, onOpenSource, }: ResearchGraphViewProps): import("react/jsx-runtime").JSX.Element;
export {};
