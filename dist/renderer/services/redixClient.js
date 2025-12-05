import { redixWS } from './redixWs';
export function requestRedix(query, options) {
    const controller = redixWS.request(query, options.sessionId, {}, (message) => {
        const typed = message;
        switch (message.type) {
            case 'partial_result':
                options.onPartial?.(typed);
                break;
            case 'final_result':
                options.onFinal?.(typed);
                break;
            case 'error':
                options.onError?.(typed);
                controller.cancel();
                break;
            default:
                break;
        }
    });
    return controller;
}
