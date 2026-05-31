import type { Command } from "./types";
import { osmium } from "../proto";
import { prisma } from "../db";
import { syncRoleGlobally } from "./rolegive";

export const roleremoveall: Command = {
  name: "roleremoveall",
  description: "Remove all identity roles from yourself in this server.",
  usage: "!roleremoveall",

  async execute(bot, message) {
    const communityId = message.chatRef?.channel?.communityId;
    if (!communityId) {
      await bot.reply(message, "This command can only be used in a server.");
      return;
    }

    const communityIdStr = communityId.toString();
    const userId = message.authorId;
    const userIdStr = userId.toString();

    const userRoles = await prisma.userRole.findMany({
      where: { userId: userIdStr, communityId: communityIdStr },
    });

    if (userRoles.length === 0) {
      await bot.reply(message, "You don't have any identity roles in this server.");
      return;
    }

    // Get current guild roles to find which ones to keep (non-identity roles the bot doesn't track)
    const currentGuildRoles = await prisma.guildRole.findMany({
      where: {
        communityId: communityIdStr,
        name: { in: userRoles.map((ur) => ur.roleName) },
      },
    });
    const removeIds = new Set(currentGuildRoles.map((gr) => gr.roleId));

    // All bot-tracked roles for this user in this community that are NOT being removed stay
    // (in practice this is empty since we're removing all, but keep the pattern consistent)
    const remainingRoleIds = currentGuildRoles
      .filter((gr) => !removeIds.has(gr.roleId))
      .map((gr) => BigInt(gr.roleId));

    try {
      await bot.client.send(
        osmium.client.communities.EditMember.create({
          communityId,
          memberId: userId,
          roleIds: osmium.client.communities.CommunityMemberRoleIds.create({
            roleIds: remainingRoleIds,
          }),
        }),
      );

      await prisma.userRole.deleteMany({
        where: { userId: userIdStr, communityId: communityIdStr },
      });

      const removedNames = userRoles.map((ur) => ur.roleName).join(", ");
      await bot.reply(message, `Removed all your identity roles: ${removedNames}`);

      for (const ur of userRoles) {
        await syncRoleGlobally(bot, userIdStr, ur.roleName, ur.category, "remove");
      }
    } catch (err) {
      console.error("Failed to remove all roles:", err);
      await bot.reply(message, "Failed to remove roles. Please try again later.");
    }
  },
};
