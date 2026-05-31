import type { Command } from "../types";
import { prisma } from "../../db";
import { ROLE_DEFINITIONS, type RoleCategory } from "./roles";

export const rolelist: Command = {
  name: "rolelist",
  description: "Show available identity roles in this server.",
  usage: "!rolelist",

  async execute(bot, message) {
    const communityId = message.chatRef?.channel?.communityId;
    if (!communityId) {
      await bot.reply(message, "This command can only be used in a server.");
      return;
    }

    const guild = await prisma.guild.findUnique({
      where: { communityId: communityId.toString() },
    });

    if (!guild) {
      await bot.reply(
        message,
        "No roles have been set up in this server yet. An admin can run !rolesetup to get started.",
      );
      return;
    }

    const categories: { key: RoleCategory; field: keyof typeof guild }[] = [
      { key: "pronoun", field: "pronouns" },
      { key: "gender", field: "gender" },
      { key: "sexuality", field: "sexuality" },
    ];

    const sections: string[] = [];
    for (const { key, field } of categories) {
      if (guild[field]) {
        const names = ROLE_DEFINITIONS[key].join(", ");
        sections.push(
          `**${key.charAt(0).toUpperCase() + key.slice(1)}**: ${names}`,
        );
      }
    }

    if (sections.length === 0) {
      await bot.reply(message, "No role categories have been set up yet.");
      return;
    }

    await bot.reply(
      message,
      `Available roles:\n${sections.join("\n")}\n\nUse !rolegive <role> to add a role, !roleremove <role> to remove one.`,
    );
  },
};
