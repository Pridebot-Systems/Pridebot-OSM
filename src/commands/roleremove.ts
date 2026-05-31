import type { Command } from "./types";
import { tangle } from "../proto";
import { prisma } from "../db";
import { ROLE_LOOKUP } from "./roles";
import { syncRoleGlobally } from "./rolegive";

export const roleremove: Command = {
  name: "roleremove",
  description: "Remove one or more identity roles from yourself.",
  usage: "!roleremove <role(s)>  — separate multiple with commas",

  async execute(bot, message, args) {
    if (args.length === 0) {
      await bot.reply(message, "Usage: !roleremove <role(s)>\nSeparate multiple roles with commas.");
      return;
    }

    const communityId = message.chatRef?.channel?.communityId;
    if (!communityId) {
      await bot.reply(message, "This command can only be used in a server.");
      return;
    }

    const communityIdStr = communityId.toString();
    const userId = message.authorId;
    const userIdStr = userId.toString();

    const requestedNames = args
      .join(" ")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const notFound: string[] = [];
    const dontHave: string[] = [];
    const toRemove: Array<{ name: string; category: string; roleId: string }> = [];

    for (const input of requestedNames) {
      const roleDef = ROLE_LOOKUP.get(input);
      if (!roleDef) {
        notFound.push(input);
        continue;
      }

      const existing = await prisma.userRole.findUnique({
        where: {
          userId_communityId_roleName: {
            userId: userIdStr,
            communityId: communityIdStr,
            roleName: roleDef.name,
          },
        },
      });
      if (!existing) {
        dontHave.push(roleDef.name);
        continue;
      }

      const guildRole = await prisma.guildRole.findFirst({
        where: {
          communityId: communityIdStr,
          name: roleDef.name,
          category: roleDef.category,
        },
      });
      if (!guildRole) {
        notFound.push(roleDef.name);
        continue;
      }

      toRemove.push({ name: roleDef.name, category: roleDef.category, roleId: guildRole.roleId });
    }

    if (toRemove.length === 0) {
      const parts: string[] = [];
      if (dontHave.length) parts.push(`You don't have: ${dontHave.join(", ")}`);
      if (notFound.length) parts.push(`Unknown roles: ${notFound.join(", ")}`);
      await bot.reply(message, parts.join("\n") || "Nothing to remove.");
      return;
    }

    // Build remaining role ID list in one EditMember call
    const removeIds = new Set(toRemove.map((r) => r.roleId));
    const currentUserRoles = await prisma.userRole.findMany({
      where: { userId: userIdStr, communityId: communityIdStr },
    });
    const currentGuildRoles = await prisma.guildRole.findMany({
      where: {
        communityId: communityIdStr,
        name: { in: currentUserRoles.map((ur) => ur.roleName) },
      },
    });
    const remainingRoleIds = currentGuildRoles
      .filter((gr) => !removeIds.has(gr.roleId))
      .map((gr) => BigInt(gr.roleId));

    try {
      await bot.client.send(
        tangle.client.communities.EditMember.create({
          communityId,
          memberId: userId,
          roleIds: tangle.client.communities.CommunityMemberRoleIds.create({
            roleIds: remainingRoleIds,
          }),
        }),
      );

      for (const r of toRemove) {
        await prisma.userRole.delete({
          where: {
            userId_communityId_roleName: {
              userId: userIdStr,
              communityId: communityIdStr,
              roleName: r.name,
            },
          },
        });
      }

      const parts: string[] = [`Removed: ${toRemove.map((r) => r.name).join(", ")}`];
      if (dontHave.length) parts.push(`Didn't have: ${dontHave.join(", ")}`);
      if (notFound.length) parts.push(`Unknown roles: ${notFound.join(", ")}`);
      await bot.reply(message, parts.join("\n"));

      for (const r of toRemove) {
        await syncRoleGlobally(bot, userIdStr, r.name, r.category, "remove");
      }
    } catch (err) {
      console.error("Failed to remove roles:", err);
      await bot.reply(message, "Failed to remove roles. Please try again later.");
    }
  },
};
