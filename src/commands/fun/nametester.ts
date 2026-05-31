import type { Command } from "../types";

export const nametester: Command = {
  name: "nametester",
  description: "Tests a name in various sentence contexts.",
  usage: "!nametester <name>",
  execute(bot, message, args) {
    if (args.length === 0) {
      bot.reply(message, "Usage: !nametester <name>");
      return;
    }
    const name = args.join(" ");
    const cap = name.charAt(0).toUpperCase() + name.slice(1);
    bot.reply(
      message,
      [
        `Name Tester: ${name}`,
        "",
        `${cap} is walking down the street on a nice sunny day.`,
        `The dog is chasing ${name} down the street.`,
        `The ball belongs to ${name}.`,
        `The ball is ${name}'s.`,
        `Hey ${cap}, how are you doing today?`,
      ].join("\n"),
    );
  },
};
