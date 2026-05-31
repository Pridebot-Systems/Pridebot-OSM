import type { Command } from "../types";

export const pronountester: Command = {
  name: "pronountester",
  description: "Tests pronouns in example sentences.",
  usage: "!pronountester <subject> <object> <possessive> <possessivePronoun> <reflexive>",
  execute(bot, message, args) {
    if (args.length < 5) {
      bot.reply(
        message,
        [
          "Usage: !pronountester <subject> <object> <possessive> <possessivePronoun> <reflexive>",
          "Example: !pronountester he him his his himself",
          "Example: !pronountester they them their theirs themselves",
        ].join("\n"),
      );
      return;
    }
    const [subject, object, possessive, possessivePronoun, reflexive] = args as [string, string, string, string, string];
    const cap = subject.charAt(0).toUpperCase() + subject.slice(1);
    const capPos = possessive.charAt(0).toUpperCase() + possessive.slice(1);
    bot.reply(
      message,
      [
        `Pronoun Tester: ${cap}/${object}/${possessive}`,
        "",
        `${cap} is going to the store.`,
        `I saw ${object} at the party.`,
        `${capPos} car is parked outside.`,
        `The book is ${possessivePronoun}.`,
        `${cap} prepared the meal ${reflexive}.`,
        "",
        `Subject: ${subject}  |  Object: ${object}  |  Possessive: ${possessive}  |  Possessive Pronoun: ${possessivePronoun}  |  Reflexive: ${reflexive}`,
      ].join("\n"),
    );
  },
};
