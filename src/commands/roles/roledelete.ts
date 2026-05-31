import type { Command } from "../types";
import { osmium } from "../../proto";
import { prisma } from "../../db";

export const roledelete: Command = {
  name: "roledelete",
  description: "Delete all identity roles from this server and reset the setup.",
  usage: "!roledelete",

  async execute(bot, message) {
    const communityId = message.chatRef?.channel?.communityId;
    if (!communityId) {
      await bot.reply(message, "This command can only be used in a server.");
      return;
    }

    const communityIdStr = communityId.toString();

    const guild = await prisma.guild.findUnique({
      where: { communityId: communityIdStr },
    });

    if (!guild) {
      await bot.reply(message, "No roles have been set up in this server.");
      return;
    }

    await bot.reply(message, "Deleting all identity roles... This may take a moment.");

    // Get all guild roles from DB
    const guildRoles = await prisma.guildRole.findMany({
      where: { communityId: communityIdStr },
    });

    // Delete each role from the Osmium server
    for (const role of guildRoles) {
      try {
        await bot.client.send(
          osmium.client.communities.DeleteRole.create({
            id: BigInt(role.roleId),
            communityId: communityId,
          }),
        );
      } catch (err) {
        console.error(`Failed to delete role "${role.name}" (${role.roleId}):`, err);
      }
    }

    // Clean up DB: user roles, guild roles, then the guild record
    await prisma.userRole.deleteMany({ where: { communityId: communityIdStr } });
    await prisma.guildRole.deleteMany({ where: { communityId: communityIdStr } });
    await prisma.guild.delete({ where: { communityId: communityIdStr } });

    await bot.reply(message, "All identity roles deleted and setup reset. Run !rolesetup to start fresh.");
  },
};
