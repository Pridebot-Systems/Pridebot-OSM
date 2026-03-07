import type { Command } from "./types";
import { commands } from "./index";

export const help: Command = {
  name: "help",
  description:
    "Shows a list of commands, or info about a specific command.\n If you want to talk to a developer, join the support server: https://osm.pm/i/JFfIIoNjbXK5x2D9",
  usage: "!help [command]",
  execute(bot, message, args) {
    if (args.length > 0) {
      const cmd = commands.get(args[0].toLowerCase());
      if (cmd) {
        bot.reply(
          message,
          `${cmd.name} - ${cmd.description}\nUsage: ${cmd.usage}`,
        );
      } else {
        bot.reply(message, `Unknown command: ${args[0]}`);
      }
      return;
    }
    const commandList = Array.from(commands.keys()).join(", ");
    bot.reply(
      message,
      `Available commands: ${commandList}\nUse !help <command> for more info.`,
    );
  },
};
