import { redixWS } from './redixWs';

type RedixMessage =
  | { id: string; type: 'ack'; payload: { taskId: string } }
  | { id: string; type: 'partial_result'; payload: { items: any[]; progress?: number } }
  | { id: string; type: 'final_result'; payload: { items: any[]; progress?: number; taskId?: string } }
  | { id: string; type: 'error'; payload: { message: string } }
  | { type: string; payload: any };

type RequestOptions = {
  sessionId: string;
  onPartial?: (message: RedixMessage) => void;
  onFinal?: (message: RedixMessage) => void;
  onError?: (message: RedixMessage) => void;
};

export function requestRedix(query: string, options: RequestOptions) {
  const controller = redixWS.request(
    query,
    options.sessionId,
    {},
    (message) => {
      const typed = message as RedixMessage;
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
    },
  );

  return controller;
}

