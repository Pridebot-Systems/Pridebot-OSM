import type { Command } from "./types";

export const gaydar: Command = {
  name: "gaydar",
  description: "Measures how gay someone is with a random percentage.",
  usage: "!gaydar [username]",
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
    const reply = isInsane
      ? `${target} ${verb} ${percentage}% gay`
      : `${target} ${verb} ${percentage}% gay`;
    bot.reply(message, reply);
  },
};
