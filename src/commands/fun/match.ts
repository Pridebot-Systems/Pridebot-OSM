import type { Command } from "../types";
import { seededInt } from "./seededRandom";

function normalize(name: string): string {
  return name.replace(/^@/, "").toLowerCase();
}

function display(name: string): string {
  return name.startsWith("@") ? name : `@${name}`;
}

export const match: Command = {
  name: "match",
  description: "Determine the compatibility between two people.",
  usage: "!match <person1> <person2>",
  execute(bot, message, args) {
    if (args.length < 2) {
      bot.reply(message, "Usage: !match <person1> <person2>");
      return;
    }
    const a = args[0]!;
    const b = args.slice(1).join(" ");
    const sorted = [normalize(a), normalize(b)].sort();
    const pct = seededInt(`match:${sorted[0]!}:${sorted[1]!}`, 0, 100);
    const da = display(a);
    const db = display(b);

    let result: string;
    if (pct >= 99) {
      result = `${da} and ${db} are perfectly compatible!`;
    } else if (pct <= 1) {
      result = `${da} and ${db} are not compatible at all!`;
    } else {
      result = `${da} and ${db} are ${pct}% compatible!`;
    }
    bot.reply(message, result);
  },
};
