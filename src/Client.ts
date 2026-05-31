import WebSocket from "ws";
import { EventEmitter } from "events";
import { osmium } from "./proto.js";

interface ClientEvents {
  connected: [];
  disconnected: [code: number, reason: string];
  error: [error: Error];
  message: [message: osmium.client.core.ServerMessage];
  result: [result: osmium.client.core.RPCResult];
  update: [update: osmium.client.updates.Update];
  initialized: [initialized: osmium.client.core.Initialized];
  ready: [user: osmium.client.types.User];
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
  };
  debug: boolean;
};

type Message = Exclude<
  osmium.client.core.ClientMessage[keyof osmium.client.core.ClientMessage],
  | string
  | null
  | undefined
  | number
  | (() => {
      [k: string]: any;
    })
>;

export class Client extends EventEmitter<ClientEvents> {
  options: ClientOptions;

  ws: WebSocket | null;
  authenticated: boolean;
  reconnectTimer: NodeJS.Timeout | null;
  heartbeatTimer: NodeJS.Timeout | null;
  requestId: number;
  pendingRequests: Map<
    number,
    {
      resolve: (value: osmium.client.core.RPCResult) => void;
      reject: (error: osmium.client.core.RPCError) => void;
      timeoutId?: NodeJS.Timeout;
    }
  >;

  user: osmium.client.types.User | null;
  chats: Map<string, any>;
  communities: Map<string, any>;

  constructor(options: Partial<ClientOptions>) {
    super();

    if (!options.token) {
      throw new Error("Token is required");
    }
    if (!options.clientOptions) {
      throw new Error("Client options are required");
    }
    if (
      !options.clientOptions.appVersion ||
      !options.clientOptions.deviceType ||
      !options.clientOptions.clientId ||
      !options.clientOptions.deviceVersion
    ) {
      throw new Error("All client options fields are required");
    }

    this.options = {
      token: options.token,
      serverUrl: options.serverUrl || "wss://ws-0.osmium.chat",
      reconnectInterval: options.reconnectInterval || 5000,
      heartbeatInterval: options.heartbeatInterval || 30000,
      debug: options.debug || false,
      clientOptions: options.clientOptions,
      ...options,
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
      this.ws.binaryType = "arraybuffer";

      this.ws.on("open", () => {
        this.emit("connected");
        this.initialize();
      });

      this.ws.on("message", (data) => {
        // @ts-ignore
        this.handleMessage(new Uint8Array(data));
      });

      this.ws.on("close", (code, reason) => {
        const reasonStr = reason.toString();
        console.debug(`Connection closed: ${code} - ${reasonStr}`);
        this.authenticated = false;
        this.stopHeartbeat();
        this.rejectPendingRequests(new Error(`Connection closed: ${code}`));
        this.emit("disconnected", code, reasonStr);
        this.scheduleReconnect();
      });

      this.ws.on("error", (error) => {
        console.error("WebSocket error:", error);
        this.emit("error", error);
      });
    } catch (error) {
      console.error("Failed to connect:", error);
      this.emit(
        "error",
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  async send(message: Message) {
    const reqId = this.getRequestId();
    const path = (message.constructor as any)
      .getTypeUrl("")
      .substring(1)
      .split(".");
    const name = path.pop();
    const namespace = path.pop();
    const packetName =
      namespace.charAt(0).toLowerCase() + namespace.slice(1) + name;
    const obj = this.makeClientMessage(reqId, packetName, message);

    const encoded = osmium.client.core.ClientMessage.encode(obj).finish();
    const buf = encoded.buffer.slice(
      encoded.byteOffset,
      encoded.byteOffset + encoded.length,
    );

    let resolve: (value: osmium.client.core.RPCResult) => void = () => {},
      reject: (error: osmium.client.core.RPCError) => void = () => {};
    const promise = new Promise<osmium.client.core.RPCResult>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    this.pendingRequests.set(reqId, { resolve, reject });
    if (this.options.debug) console.debug("~>", message);
    this.ws?.send(buf);

    return promise;
  }

  makeClientMessage(reqId: number, packetName: string, packet: any): any {
    const obj = osmium.client.core.ClientMessage.create({
      id: reqId,
      [packetName]: packet,
    });
    return obj;
  }

  async initialize() {
    const message = osmium.client.core.Initialize.create({
      ...this.options.clientOptions,
    });

    const res = await this.send(message);
    if (res.initialized) {
      this.handleInitialized(res.initialized);
    } else {
      throw new Error("Failed to initialize client");
    }
  }

  async authenticate(): Promise<osmium.client.auth.Authorization> {
    if (!this.options.token) {
      throw new Error("Bot token is required for authentication");
    }

    const message = osmium.client.auth.Authorize.create({
      token: this.options.token,
    });

    const res = await this.send(message);
    if (res.authorization) {
      return res.authorization;
    } else {
      throw new Error("Received invalid authorization response");
    }
  }

  handleMessage(data: Uint8Array): void {
    try {
      const serverMessage = osmium.client.core.ServerMessage.decode(data);
      this.emit("message", serverMessage);

      if (serverMessage.result) {
        const result = serverMessage.result;
        if (this.options.debug) {
          console.debug("<~", result);
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
        this.emit("result", result);
      } else if (serverMessage.update) {
        if (this.options.debug) {
          console.debug("<~", serverMessage.update);
        }
        this.emit("update", serverMessage.update);
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
  }

  handleAuthenticated(signedIn: osmium.client.auth.Authorization): void {
    this.authenticated = true;
    this.user = signedIn.user;
    this.emit("ready", this.user);
    this.startHeartbeat();
  }

  handleInitialized(initialized: osmium.client.core.Initialized): void {
    this.emit("initialized", initialized);

    if (this.options.token) {
      this.authenticate()
        .then((res) => {
          this.handleAuthenticated(res);
        })
        .catch((error) => {
          this.emit("authError", error);
        });
    }
  }

  startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
        // Send an empty application-level message so the server's idle timeout
        // doesn't trigger (id: 1 is below the Date.now()-based range used for
        // real requests, so it will never collide with a pending request).
        const keepalive = osmium.client.core.ClientMessage.encode(
          osmium.client.core.ClientMessage.create({ id: 1 }),
        ).finish();
        this.ws.send(
          keepalive.buffer.slice(
            keepalive.byteOffset,
            keepalive.byteOffset + keepalive.length,
          ),
        );
      }
    }, this.options.heartbeatInterval);
  }

  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  rejectPendingRequests(error: Error): void {
    for (const request of this.pendingRequests.values()) {
      if (request.timeoutId) clearTimeout(request.timeoutId);
      request.reject(error as any);
    }
    this.pendingRequests.clear();
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

    this.emit("disconnected", 0, "Client disconnected");
  }
}
