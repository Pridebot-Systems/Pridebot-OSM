import type { Command } from "./types";
import { tangle } from "../proto";

const INVITE_REGEX =
  /https?:\/\/(?:(?:beta|dev|web)\.osmium\.chat\/invite\/|osm\.pm\/i\/)([A-Za-z0-9]+)/;

export const invite: Command = {
  name: "invite",
  description: "Invite the bot to your server.",
  usage: "!invite <invite link>",
  async execute(bot, message, args) {
    const match = message.message.match(INVITE_REGEX);
    if (!match) {
      await bot.reply(message, "Please provide a valid invite link.");
      return;
    }

    const code = match[1];
    try {
      await bot.client.send(tangle.client.auth.UseInvite.create({ code }));
      await bot.reply(message, "Joined server!");
    } catch (err: any) {
      const reason = err?.message ?? "Unknown error";
      await bot.reply(message, `Failed to join server!\nReason: ${reason}`);
    }
  },
};
