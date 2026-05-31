import type { Command } from "../types";

export const lesdar: Command = {
  name: "lesdar",
  description: "Measures how lesbian someone is with a random percentage.",
  usage: "!lesdar [username]",
  execute(bot, message, args) {
    const isInsane = Math.random() < 1 / 10000;
    const percentage = isInsane
      ? Math.floor(Math.random() * 9001) + 1000
      : Math.floor(Math.random() * 101);
    const mention = args.length > 0 ? args.join(" ") : "You";
    const target = mention.startsWith("@")
      ? mention
      : mention === "You"
        ? "You"
        : `@${mention}`;
    const verb = target === "You" ? "are" : "is";
    bot.reply(message, `${target} ${verb} ${percentage}% lesbian`);
  },
};
