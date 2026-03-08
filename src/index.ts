import EventEmitter from "node:events";
import { Client, ClientOptions } from "./Client";
import { tangle } from "./proto";
import { commands } from "./commands";
import { startServerCountUpdater } from "./Events/serverupdate";
import dotenv from "dotenv";

interface BotEvents {
  connected: [];
  ready: [user: tangle.client.types.User];
  error: [error: Error];
  disconnected: [];

  messageCreated: [messageUpdate: tangle.client.updates.UpdateMessageCreated];
}

export class Pridebot extends EventEmitter<BotEvents> {
  client: Client;

  constructor(options: Partial<ClientOptions>) {
    super();
    this.client = new Client(options);
    this.setupEventHandlers();
  }

  setupEventHandlers(): void {
    this.client.on("connected", () => {
      console.log("Connected");
      this.emit("connected");
    });

    this.client.on("ready", (user) => {
      console.log(`Ready! Authenticated as ${user.username}`);
      this.emit("ready", user);
    });

    this.client.on("error", (error) => {
      console.error("Bot error:", error);
      this.emit("error", error);
    });

    this.client.on("disconnected", (code, reason) => {
      console.log("Disconnected", { code, reason });
      this.emit("disconnected");
    });

    this.client.on("update", (update) => {
      if (update.messageCreated) {
        this.emit("messageCreated", update.messageCreated);
      }
    });
  }

  async reply(
    message: tangle.client.types.Message,
    content: string,
  ): Promise<tangle.client.core.RPCResult> {
    const msg = tangle.client.messages.SendMessage.create({
      message: content,
      chatRef: message.chatRef,
    });
    return await this.client.send(msg);
  }

  async start(): Promise<void> {
    console.log("Starting bot...");
    await this.client.connect();
  }

  stop(): void {
    console.log("Stopping bot...");
    this.client.disconnect();
  }
}

import { pathToFileURL } from "node:url";

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  dotenv.config();

  const bot = new Pridebot({
    serverUrl: process.env.SERVER_URL ?? "ws://localhost:8080",
    token: process.env.BOT_TOKEN ?? "",
    clientOptions: {
      clientId: parseInt(process.env.CLIENT_ID ?? "0", 10),
      appVersion: process.env.APP_VERSION ?? "1.0.0",
      deviceType: process.env.DEVICE_TYPE ?? "nodejs",
      deviceVersion: process.env.DEVICE_VERSION ?? "1.0.0",
    },
  });

  bot.on("messageCreated", (messageCreated) => {
    if (messageCreated.message.authorId === bot.client.user?.id) return;
    if (!messageCreated.message.message.startsWith("!")) return;

    const msg = messageCreated.message.message.slice(1).trim();
    const command = msg.split(" ")[0]?.toLowerCase();
    const args = msg.split(" ").slice(1);
    console.log("Command received:", command, args);

    const cmd = commands.get(command);
    if (cmd) {
      cmd.execute(bot, messageCreated.message, args);
    }
  });

  bot.on("ready", () => {
    const communityId = BigInt(process.env.STATUS_COMMUNITY_ID ?? "0");
    const channelId = BigInt(process.env.STATUS_CHANNEL_ID ?? "0");
    if (communityId && channelId) {
      startServerCountUpdater(bot, communityId, channelId);
    }
  });

  process.on("SIGINT", () => {
    bot.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    bot.stop();
    process.exit(0);
  });

  bot.start().catch((error) => {
    console.error("Failed to start bot:", error);
    process.exit(1);
  });
}
