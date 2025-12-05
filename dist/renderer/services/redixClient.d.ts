type RedixMessage = {
    id: string;
    type: 'ack';
    payload: {
        taskId: string;
    };
} | {
    id: string;
    type: 'partial_result';
    payload: {
        items: any[];
        progress?: number;
    };
} | {
    id: string;
    type: 'final_result';
    payload: {
        items: any[];
        progress?: number;
        taskId?: string;
    };
} | {
    id: string;
    type: 'error';
    payload: {
        message: string;
    };
} | {
    type: string;
    payload: any;
};
type RequestOptions = {
    sessionId: string;
    onPartial?: (message: RedixMessage) => void;
    onFinal?: (message: RedixMessage) => void;
    onError?: (message: RedixMessage) => void;
};
export declare function requestRedix(query: string, options: RequestOptions): {
    id: string;
    cancel: () => void;
};
export {};
