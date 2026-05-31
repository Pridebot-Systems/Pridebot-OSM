import type { Command } from "../types";
import { commands } from "../index";

const HELP_TEXT = [
  "Pridebot Commands",
  "",
  "Fun",
  "  !gaydar  !bidar  !lesdar  !transdar  !queerdar",
  "  !match  !nametester  !pronountester",
  "",
  "Roles",
  "  !rolesetup  !rolegive  !roleremove  !roleremoveall",
  "  !roleglobal  !rolelist  !roledelete",
  "",
  "Support",
  "  !comingout  !mentalhealth  !transresources",
  "",
  "Tools",
  "  !help  !invite  !ping",
  "",
  "Use !help <command> for details on a specific command.",
  "Support server: https://osm.pm/i/JFfIIoNjbXK5x2D9",
  "GitHub: https://github.com/Pridebot-Systems/Pridebot-OSM",
].join("\n");

export const help: Command = {
  name: "help",
  description: "Shows a list of commands, or info about a specific command.",
  usage: "!help [command]",
  execute(bot, message, args) {
    const query = args[0];
    if (query) {
      const cmd = commands.get(query.toLowerCase());
      if (cmd) {
        bot.reply(message, `${cmd.name} - ${cmd.description}\nUsage: ${cmd.usage}`);
      } else {
        bot.reply(message, `Unknown command: ${query}`);
      }
      return;
    }
    bot.reply(message, HELP_TEXT);
  },
};
