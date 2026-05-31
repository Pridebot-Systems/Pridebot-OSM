import type { Command } from "../types";

export const ping: Command = {
  name: "ping",
  description: "Check if the bot is alive and measure latency.",
  usage: "!ping",
  async execute(bot, message) {
    const start = Date.now();
    const result = await bot.reply(message, "Pong!");
    const latency = Date.now() - start;
    const messageId = result.sentMessage?.messageId;
    if (messageId) {
      await bot.editMessage(message, messageId, `Latency: ${latency}ms`);
    }
  },
};
