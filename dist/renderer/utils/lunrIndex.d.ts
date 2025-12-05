export declare function loadIndex(): Promise<any>;
export declare function searchLocal(query: string): Promise<Array<{
    id: string;
    title: string;
    snippet: string;
}>>;
