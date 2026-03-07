
import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { tangle } from './proto.js';

interface ClientEvents {
    connected: [];
    disconnected: [code: number, reason: string];
    error: [error: Error];
    message: [message: tangle.client.core.ServerMessage];
    result: [result: tangle.client.core.RPCResult];
    update: [update: tangle.client.updates.Update];
    initialized: [initialized: tangle.client.core.Initialized];
    ready: [user: tangle.client.types.User];
    authError: [error: Error];
}

export type ClientOptions = {
    serverUrl: string;
    token: string;
    reconnectInterval: number;
    heartbeatInterval: number;
    clientOptions: {
        appVersion: string;
        deviceType: string;
        clientId: number;
        deviceVersion: string;
    },
    debug: boolean;
};

type Message = Exclude<tangle.client.core.ClientMessage[keyof tangle.client.core.ClientMessage], string | null | undefined | number | (() => {
    [k: string]: any;
})>;

export class Client extends EventEmitter<ClientEvents> {
    options: ClientOptions;

    ws: WebSocket | null;
    authenticated: boolean;
    reconnectTimer: NodeJS.Timeout | null;
    heartbeatTimer: NodeJS.Timeout | null;
    requestId: number;
    pendingRequests: Map<number, { resolve: (value: tangle.client.core.RPCResult) => void; reject: (error: tangle.client.core.RPCError) => void; timeoutId?: NodeJS.Timeout }>;

    user: tangle.client.types.User | null;
    chats: Map<string, any>;
    communities: Map<string, any>;

    constructor(options: Partial<ClientOptions>) {
        super();

        if (!options.token) {
            throw new Error('Token is required');
        }
        if (!options.clientOptions) {
            throw new Error('Client options are required');
        }
        if (!options.clientOptions.appVersion || !options.clientOptions.deviceType || !options.clientOptions.clientId || !options.clientOptions.deviceVersion) {
            throw new Error('All client options fields are required');
        }

        this.options = {
            token: options.token,
            serverUrl: options.serverUrl || 'wss://ws-0.osmium.chat',
            reconnectInterval: options.reconnectInterval || 5000,
            heartbeatInterval: options.heartbeatInterval || 30000,
            debug: options.debug || false,
            clientOptions: options.clientOptions,
            ...options
        };

        this.ws = null;
        this.authenticated = false;
        this.reconnectTimer = null;
        this.heartbeatTimer = null;
        this.requestId = 1;
        this.pendingRequests = new Map();

        this.user = null;
        this.chats = new Map();
        this.communities = new Map();
    }

    async connect() {
        try {
            console.debug(`Connecting to ${this.options.serverUrl}...`);

            this.ws = new WebSocket(this.options.serverUrl);
            this.ws.binaryType = 'arraybuffer';

            this.ws.on('open', () => {
                this.emit('connected');
                this.initialize();
            });

            this.ws.on('message', (data) => {
                // @ts-ignore
                this.handleMessage(new Uint8Array(data));
            });

            this.ws.on('close', (code, reason) => {
                const reasonStr = reason.toString();
                console.debug(`Connection closed: ${code} - ${reasonStr}`);
                this.authenticated = false;
                this.emit('disconnected', code, reasonStr);
                this.scheduleReconnect();
            });

            this.ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                this.emit('error', error);
            });

        } catch (error) {
            console.error('Failed to connect:', error);
            this.emit('error', error instanceof Error ? error : new Error(String(error)));
        }
    }

    async send(message: Message) {
        const reqId = this.getRequestId();
        const path = (message.constructor as any).getTypeUrl('').substring(1).split('.');
        const name = path.pop();
        const namespace = path.pop();
        const packetName = namespace.charAt(0).toLowerCase() + namespace.slice(1) + name;
        const obj = this.makeClientMessage(reqId, packetName, message);

        const encoded = tangle.client.core.ClientMessage.encode(obj).finish();
        const buf = encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.length);

        let resolve: (value: tangle.client.core.RPCResult) => void = () => { }, reject: (error: tangle.client.core.RPCError) => void = () => { };
        const promise = new Promise<tangle.client.core.RPCResult>((res, rej) => {
            resolve = res;
            reject = rej;
        });

        this.pendingRequests.set(reqId, { resolve, reject });
        if (this.options.debug) console.debug('~>', message);
        this.ws?.send(buf);

        return promise;
    }

    makeClientMessage(reqId: number, packetName: string, packet: any): any {
        const obj = tangle.client.core.ClientMessage.create({ id: reqId, [packetName]: packet });
        return obj;
    }

    async initialize() {
        const message = tangle.client.core.Initialize.create({
            ...this.options.clientOptions
        });

        const res = await this.send(message);
        if (res.initialized) {
            this.handleInitialized(res.initialized);
        } else {
            throw new Error('Failed to initialize client');
        }
    }

    async authenticate(): Promise<tangle.client.auth.Authorization> {
        if (!this.options.token) {
            throw new Error('Bot token is required for authentication');
        }

        const message = tangle.client.auth.Authorize.create({
            token: this.options.token,
        });

        const res = await this.send(message);
        if (res.authorization) {
            return res.authorization;
        } else {
            throw new Error('Received invalid authorization response');;
        }
    }

    handleMessage(data: Uint8Array): void {
        try {
            const serverMessage = tangle.client.core.ServerMessage.decode(data);
            this.emit('message', serverMessage);

            if (serverMessage.result) {
                const result = serverMessage.result;
                if (this.options.debug) {
                    console.debug('<~', result);
                }
                if (result.reqId && this.pendingRequests.has(result.reqId)) {
                    const request = this.pendingRequests.get(result.reqId);
                    if (request) {
                        if (request.timeoutId) clearTimeout(request.timeoutId);
                        this.pendingRequests.delete(result.reqId);
                        if (result.error) {
                            request.reject(result.error);
                        } else {
                            request.resolve(result);
                        }
                        return;
                    }
                }
                this.emit('result', result);
            } else if (serverMessage.update) {
                if (this.options.debug) {
                    console.debug('<~', serverMessage.update);
                }
                this.emit('update', serverMessage.update);
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }

    handleAuthenticated(signedIn: tangle.client.auth.Authorization): void {
        this.authenticated = true;
        this.user = signedIn.user;
        this.emit('ready', this.user);
        this.startHeartbeat();
    }

    handleInitialized(initialized: tangle.client.core.Initialized): void {
        this.emit('initialized', initialized);

        if (this.options.token) {
            this.authenticate().then((res) => {
                this.handleAuthenticated(res);
            }).catch(error => {
                this.emit('authError', error);
            });
        }
    }

    startHeartbeat(): void {
        this.heartbeatTimer = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                // periodically send a useless message to keep the socket open
                const uselessPacket = tangle.client.core.ClientMessage.create({ id: 1 });
                const encoded = tangle.client.core.ClientMessage.encode(uselessPacket).finish();
                const buffer = encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.length);
                this.ws?.send(buffer);
            }
        }, this.options.heartbeatInterval);
    }

    scheduleReconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        console.log(`Reconnecting in ${this.options.reconnectInterval}ms...`);
        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, this.options.reconnectInterval);
    }

    getRequestId(): number {
        let reqId = Date.now() >>> 0;
        if (this.requestId >= reqId) {
            reqId = this.requestId + 1;
        }
        this.requestId = reqId;
        return reqId;
    }

    disconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }

        if (this.ws) {
            this.ws.close();
        }

        this.emit('disconnected', 0, 'Client disconnected');
    }
}

