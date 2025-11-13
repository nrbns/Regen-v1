declare module 'ws' {
  import { EventEmitter } from 'events';
  import * as http from 'http';
  import * as https from 'https';
  import * as net from 'net';
  import * as stream from 'stream';
  import { URL } from 'url';

  interface ClientOptions {
    protocol?: string;
    host?: string;
    headers?: { [key: string]: string };
    perMessageDeflate?: boolean | object;
    followRedirects?: boolean;
    maxRedirects?: number;
    handshakeTimeout?: number;
    maxPayload?: number;
    origin?: string;
    protocolVersion?: number;
    closeTimeout?: number;
    agent?: http.Agent | https.Agent;
    createConnection?: (options: net.TcpNetConnectOpts, callback: (err?: Error) => void) => stream.Duplex;
    skipUTF8Validation?: boolean;
  }

  interface ServerOptions {
    host?: string;
    port?: number;
    backlog?: number;
    server?: http.Server | https.Server;
    verifyClient?: (info: { origin: string; secure: boolean; req: http.IncomingMessage }) => boolean;
    handleProtocols?: (protocols: string[], request: http.IncomingMessage) => string | false;
    path?: string;
    noServer?: boolean;
    clientTracking?: boolean;
    perMessageDeflate?: boolean | object;
    maxPayload?: number;
    skipUTF8Validation?: boolean;
  }

  class WebSocket extends EventEmitter {
    static readonly CONNECTING: number;
    static readonly OPEN: number;
    static readonly CLOSING: number;
    static readonly READY_STATE: number;

    readonly CONNECTING: number;
    readonly OPEN: number;
    readonly CLOSING: number;
    readonly CLOSED: number;
    readonly readyState: number;
    readonly protocol: string;
    readonly url: string;
    readonly extensions: string;
    readonly binaryType: 'nodebuffer' | 'arraybuffer' | 'fragments';

    constructor(address: string | URL, protocols?: string | string[] | ClientOptions, options?: ClientOptions);
    constructor(address: string | URL, options?: ClientOptions);

    close(code?: number, reason?: string): void;
    ping(data?: any, mask?: boolean, cb?: (err: Error) => void): void;
    pong(data?: any, mask?: boolean, cb?: (err: Error) => void): void;
    send(data: any, cb?: (err?: Error) => void): void;
    send(data: any, options: { mask?: boolean; binary?: boolean; compress?: boolean; fin?: boolean }, cb?: (err?: Error) => void): void;
    terminate(): void;

    on(event: 'close', listener: (code: number, reason: string) => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    on(event: 'message', listener: (data: Buffer | ArrayBuffer | Buffer[], isBinary: boolean) => void): this;
    on(event: 'open', listener: () => void): this;
    on(event: 'ping', listener: (data: Buffer) => void): this;
    on(event: 'pong', listener: (data: Buffer) => void): this;
    on(event: 'unexpected-response', listener: (request: http.ClientRequest, response: http.IncomingMessage) => void): this;
    on(event: 'upgrade', listener: (response: http.IncomingMessage) => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;

    addListener(event: 'close', listener: (code: number, reason: string) => void): this;
    addListener(event: 'error', listener: (error: Error) => void): this;
    addListener(event: 'message', listener: (data: Buffer | ArrayBuffer | Buffer[], isBinary: boolean) => void): this;
    addListener(event: 'open', listener: () => void): this;
    addListener(event: 'ping', listener: (data: Buffer) => void): this;
    addListener(event: 'pong', listener: (data: Buffer) => void): this;
    addListener(event: 'unexpected-response', listener: (request: http.ClientRequest, response: http.IncomingMessage) => void): this;
    addListener(event: 'upgrade', listener: (response: http.IncomingMessage) => void): this;
    addListener(event: string | symbol, listener: (...args: any[]) => void): this;
  }

  class WebSocketServer extends EventEmitter {
    constructor(options?: ServerOptions, callback?: () => void);

    readonly clients: Set<WebSocket>;
    readonly options: ServerOptions;

    close(cb?: (err?: Error) => void): void;
    handleUpgrade(request: http.IncomingMessage, socket: net.Socket, upgradeHead: Buffer, callback: (client: WebSocket, request: http.IncomingMessage) => void): void;
    shouldHandle(request: http.IncomingMessage): boolean | undefined;

    on(event: 'connection', listener: (socket: WebSocket, request: http.IncomingMessage) => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    on(event: 'headers', listener: (headers: string[], request: http.IncomingMessage) => void): this;
    on(event: 'listening', listener: () => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;

    addListener(event: 'connection', listener: (socket: WebSocket, request: http.IncomingMessage) => void): this;
    addListener(event: 'error', listener: (error: Error) => void): this;
    addListener(event: 'headers', listener: (headers: string[], request: http.IncomingMessage) => void): this;
    addListener(event: 'listening', listener: () => void): this;
    addListener(event: string | symbol, listener: (...args: any[]) => void): this;
  }

  export = WebSocket;
  export { WebSocketServer, ServerOptions, ClientOptions };
}

