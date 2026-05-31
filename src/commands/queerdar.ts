import type { Command } from "./types";

export const queerdar: Command = {
  name: "queerdar",
  description: "Measures how queer someone is with a random percentage.",
  usage: "!queerdar [username]",
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
    bot.reply(message, `${target} ${verb} ${percentage}% queer`);
  },
};
