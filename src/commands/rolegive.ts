import type { Command } from "./types";
import { osmium } from "../proto";
import { prisma } from "../db";
import { ROLE_LOOKUP } from "./roles";

export const rolegive: Command = {
  name: "rolegive",
  description: "Give yourself one or more identity roles.",
  usage: "!rolegive <role(s)>  — separate multiple with commas",

  async execute(bot, message, args) {
    if (args.length === 0) {
      const allRoles = Array.from(ROLE_LOOKUP.values())
        .map((r) => r.name)
        .join(", ");
      await bot.reply(
        message,
        `Usage: !rolegive <role(s)>\nSeparate multiple roles with commas. Available roles: ${allRoles}`,
      );
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

    const guild = await prisma.guild.findUnique({
      where: { communityId: communityIdStr },
    });

    const notFound: string[] = [];
    const notSetUp: string[] = [];
    const alreadyHave: string[] = [];
    const toAdd: Array<{ name: string; category: string; roleId: string }> = [];

    for (const input of requestedNames) {
      const roleDef = ROLE_LOOKUP.get(input);
      if (!roleDef) {
        notFound.push(input);
        continue;
      }

      const categoryField =
        roleDef.category === "pronoun" ? "pronouns" : roleDef.category;
      if (!guild || !guild[categoryField]) {
        notSetUp.push(roleDef.name);
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
      if (existing) {
        alreadyHave.push(roleDef.name);
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

      toAdd.push({ name: roleDef.name, category: roleDef.category, roleId: guildRole.roleId });
    }

    if (toAdd.length === 0) {
      const parts: string[] = [];
      if (alreadyHave.length) parts.push(`Already have: ${alreadyHave.join(", ")}`);
      if (notSetUp.length) parts.push(`Not set up in this server: ${notSetUp.join(", ")}`);
      if (notFound.length) parts.push(`Unknown roles: ${notFound.join(", ")}`);
      await bot.reply(message, parts.join("\n") || "Nothing to add.");
      return;
    }

    // Build combined role ID list in one EditMember call
    const currentUserRoles = await prisma.userRole.findMany({
      where: { userId: userIdStr, communityId: communityIdStr },
    });
    const currentGuildRoles = await prisma.guildRole.findMany({
      where: {
        communityId: communityIdStr,
        name: { in: currentUserRoles.map((ur) => ur.roleName) },
      },
    });
    const allRoleIds = [
      ...currentGuildRoles.map((gr) => BigInt(gr.roleId)),
      ...toAdd.map((r) => BigInt(r.roleId)),
    ];

    try {
      await bot.client.send(
        osmium.client.communities.EditMember.create({
          communityId,
          memberId: userId,
          roleIds: osmium.client.communities.CommunityMemberRoleIds.create({
            roleIds: allRoleIds,
          }),
        }),
      );

      for (const r of toAdd) {
        await prisma.userRole.create({
          data: {
            userId: userIdStr,
            communityId: communityIdStr,
            roleName: r.name,
            category: r.category,
          },
        });
      }

      const parts: string[] = [`Gave you: ${toAdd.map((r) => r.name).join(", ")}`];
      if (alreadyHave.length) parts.push(`Already had: ${alreadyHave.join(", ")}`);
      if (notSetUp.length) parts.push(`Not set up in this server: ${notSetUp.join(", ")}`);
      if (notFound.length) parts.push(`Unknown roles: ${notFound.join(", ")}`);
      await bot.reply(message, parts.join("\n"));

      for (const r of toAdd) {
        await syncRoleGlobally(bot, userIdStr, r.name, r.category, "add");
      }
    } catch (err) {
      console.error("Failed to assign roles:", err);
      await bot.reply(message, "Failed to assign roles. Please try again later.");
    }
  },
};

async function syncRoleGlobally(
  bot: any,
  userId: string,
  roleName: string,
  category: string,
  action: "add" | "remove",
) {
  const userGlobal = await prisma.userGlobal.findUnique({
    where: { userId },
  });
  if (!userGlobal?.enabled) return;

  // Find all other guilds that have this role set up
  const allGuildRoles = await prisma.guildRole.findMany({
    where: { name: roleName, category },
  });

  for (const gr of allGuildRoles) {
    // Skip the current guild (already handled)
    const currentUserRole = await prisma.userRole.findUnique({
      where: {
        userId_communityId_roleName: {
          userId,
          communityId: gr.communityId,
          roleName,
        },
      },
    });

    if (action === "add" && currentUserRole) continue;
    if (action === "remove" && !currentUserRole) continue;

    // Get user's current roles in this other guild
    const otherUserRoles = await prisma.userRole.findMany({
      where: { userId, communityId: gr.communityId },
    });
    const otherGuildRoles = await prisma.guildRole.findMany({
      where: {
        communityId: gr.communityId,
        name: { in: otherUserRoles.map((ur) => ur.roleName) },
      },
    });

    let roleIds = otherGuildRoles.map((r) => BigInt(r.roleId));

    if (action === "add") {
      roleIds.push(BigInt(gr.roleId));
    } else {
      roleIds = roleIds.filter((id) => id.toString() !== gr.roleId);
    }

    try {
      await bot.client.send(
        osmium.client.communities.EditMember.create({
          communityId: BigInt(gr.communityId),
          memberId: BigInt(userId),
          roleIds: osmium.client.communities.CommunityMemberRoleIds.create({
            roleIds,
          }),
        }),
      );

      if (action === "add") {
        await prisma.userRole.create({
          data: {
            userId,
            communityId: gr.communityId,
            roleName,
            category,
          },
        });
      } else {
        await prisma.userRole.delete({
          where: {
            userId_communityId_roleName: {
              userId,
              communityId: gr.communityId,
              roleName,
            },
          },
        });
      }
    } catch (err) {
      console.error(
        `Global sync: failed to ${action} role "${roleName}" in community ${gr.communityId}:`,
        err,
      );
    }
  }
}

export { syncRoleGlobally };
