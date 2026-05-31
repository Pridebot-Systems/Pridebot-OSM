import { prisma } from "./db";
import { osmium } from "./proto";

/**
 * Core helper: finds roles a user holds in other communities and assigns any
 * that exist in the target community but are not yet assigned there.
 * Pass `categoryFilter` to restrict to specific role categories.
 */
async function syncUserRolesInCommunity(
  bot: any,
  userId: string,
  communityId: bigint,
  categoryFilter?: string[],
): Promise<void> {
  const communityIdStr = communityId.toString();

  // Roles this user holds in other communities
  const elsewhere = await prisma.userRole.findMany({
    where: {
      userId,
      communityId: { not: communityIdStr },
      ...(categoryFilter ? { category: { in: categoryFilter } } : {}),
    },
  });
  if (elsewhere.length === 0) return;

  // Which of those role names exist as actual roles in this community
  const roleNames = [...new Set(elsewhere.map((ur) => ur.roleName))];
  const guildRoles = await prisma.guildRole.findMany({
    where: { communityId: communityIdStr, name: { in: roleNames } },
  });
  if (guildRoles.length === 0) return;

  // Skip roles already assigned in this community
  const currentUserRoles = await prisma.userRole.findMany({
    where: { userId, communityId: communityIdStr },
  });
  const currentRoleNames = new Set(currentUserRoles.map((ur) => ur.roleName));
  const toAdd = guildRoles.filter((gr) => !currentRoleNames.has(gr.name));
  if (toAdd.length === 0) return;

  // Build the full new role ID list (existing + new)
  const currentGuildRoles = await prisma.guildRole.findMany({
    where: {
      communityId: communityIdStr,
      name: { in: currentUserRoles.map((ur) => ur.roleName) },
    },
  });
  const allRoleIds = [
    ...currentGuildRoles.map((gr) => BigInt(gr.roleId)),
    ...toAdd.map((gr) => BigInt(gr.roleId)),
  ];

  await bot.client.send(
    osmium.client.communities.EditMember.create({
      communityId,
      memberId: BigInt(userId),
      roleIds: osmium.client.communities.CommunityMemberRoleIds.create({
        roleIds: allRoleIds,
      }),
    }),
  );

  for (const gr of toAdd) {
    await prisma.userRole.create({
      data: {
        userId,
        communityId: communityIdStr,
        roleName: gr.name,
        category: gr.category,
      },
    });
  }
}

/**
 * Called when a user joins a server.
 * If they have global sync enabled, applies any roles they hold elsewhere
 * that this server has set up.
 */
export async function applyGlobalRolesToUser(
  bot: any,
  userId: string,
  communityId: bigint,
): Promise<void> {
  const userGlobal = await prisma.userGlobal.findUnique({ where: { userId } });
  if (!userGlobal?.enabled) return;

  const guild = await prisma.guild.findUnique({
    where: { communityId: communityId.toString() },
  });
  if (!guild) return;

  try {
    await syncUserRolesInCommunity(bot, userId, communityId);
  } catch (err) {
    console.error(
      `Failed to apply global roles for user ${userId} in community ${communityId}:`,
      err,
    );
  }
}

/**
 * Called after !rolesetup creates new role categories in a server.
 * Iterates all users with global sync enabled and assigns any matching roles
 * they hold in other servers.
 */
export async function applyGlobalRolesToNewServer(
  bot: any,
  communityId: bigint,
  categories: string[],
): Promise<void> {
  const globalUsers = await prisma.userGlobal.findMany({
    where: { enabled: true },
  });

  for (const { userId } of globalUsers) {
    try {
      await syncUserRolesInCommunity(bot, userId, communityId, categories);
    } catch (err) {
      console.error(
        `Failed to sync global roles for user ${userId} on server setup:`,
        err,
      );
    }
  }
}
