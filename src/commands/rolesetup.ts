import type { Command } from "./types";
import { osmium } from "../proto";
import { prisma } from "../db";
import { ROLE_DEFINITIONS, type RoleCategory } from "./roles";
import { applyGlobalRolesToNewServer } from "../globalSync";

const VALID_CATEGORIES = ["pronoun", "gender", "sexuality", "all"] as const;

export const rolesetup: Command = {
  name: "rolesetup",
  description:
    "Set up identity roles for this server. Categories: pronoun, gender, sexuality, or all.",
  usage: "!rolesetup <pronoun|gender|sexuality|all>",

  async execute(bot, message, args) {
    const choice = args[0]?.toLowerCase();
    if (!choice || !VALID_CATEGORIES.includes(choice as any)) {
      await bot.reply(
        message,
        "Usage: !rolesetup <pronoun|gender|sexuality|all>",
      );
      return;
    }

    const communityId = message.chatRef?.channel?.communityId;
    if (!communityId) {
      await bot.reply(message, "This command can only be used in a server.");
      return;
    }

    const communityIdStr = communityId.toString();
    const categories: RoleCategory[] =
      choice === "all"
        ? ["pronoun", "gender", "sexuality"]
        : [choice as RoleCategory];

    // Check what's already set up
    let guild = await prisma.guild.findUnique({
      where: { communityId: communityIdStr },
    });

    const alreadySetup = categories.filter(
      (c) => guild && guild[c === "pronoun" ? "pronouns" : c],
    );
    if (alreadySetup.length === categories.length) {
      await bot.reply(
        message,
        `Role categories already set up: ${alreadySetup.join(", ")}`,
      );
      return;
    }

    const toSetup = categories.filter(
      (c) => !guild || !guild[c === "pronoun" ? "pronouns" : c],
    );

    await bot.reply(
      message,
      `Setting up roles for: ${toSetup.join(", ")}... This may take a moment.`,
    );

    // Create the guild record if it doesn't exist
    if (!guild) {
      guild = await prisma.guild.create({
        data: { communityId: communityIdStr },
      });
    }

    // Fetch existing roles to determine the next available priority
    let nextPriority = 1;
    try {
      const existing = await bot.client.send(
        osmium.client.communities.GetRoles.create({ communityId }),
      );
      const roles = existing.communityRoles?.roles ?? [];
      if (roles.length > 0) {
        nextPriority = Math.max(...roles.map((r) => r.priority)) + 1;
      }
    } catch {
      // If we can't fetch, start at 1
    }

    // Create all the roles for each category
    for (const category of toSetup) {
      const roleNames = ROLE_DEFINITIONS[category];
      for (const roleName of roleNames) {
        try {
          await bot.client.send(
            osmium.client.communities.CreateRole.create({
              communityId: communityId,
              name: roleName,
              permissions: BigInt(0),
              priority: nextPriority++,
              color: 0,
              separated: false,
              public: true,
            }),
          );
        } catch (err) {
          console.error(`Failed to create role "${roleName}":`, err);
        }
      }
    }

    // Fetch all roles from the server to get their IDs
    try {
      const rolesResult = await bot.client.send(
        osmium.client.communities.GetRoles.create({ communityId }),
      );

      const serverRoles = rolesResult.communityRoles?.roles ?? [];
      const allSetupNames = toSetup.flatMap((c) => ROLE_DEFINITIONS[c]);

      for (const serverRole of serverRoles) {
        if (!allSetupNames.includes(serverRole.name)) continue;

        // Determine which category this role belongs to
        let roleCategory: RoleCategory | null = null;
        for (const cat of toSetup) {
          if (ROLE_DEFINITIONS[cat].includes(serverRole.name)) {
            roleCategory = cat;
            break;
          }
        }
        if (!roleCategory) continue;

        await prisma.guildRole.upsert({
          where: {
            communityId_roleId: {
              communityId: communityIdStr,
              roleId: serverRole.id.toString(),
            },
          },
          update: {},
          create: {
            communityId: communityIdStr,
            roleId: serverRole.id.toString(),
            name: serverRole.name,
            category: roleCategory,
          },
        });
      }
    } catch (err) {
      console.error("Failed to fetch roles after creation:", err);
    }

    // Mark categories as set up
    for (const category of toSetup) {
      const field = category === "pronoun" ? "pronouns" : category;
      await prisma.guild.update({
        where: { communityId: communityIdStr },
        data: { [field]: true },
      });
    }

    await bot.reply(
      message,
      `Role setup complete for: ${toSetup.join(", ")}! Users can now use !rolegive and !roleremove.`,
    );

    // Back-fill roles for users who already have global sync enabled
    applyGlobalRolesToNewServer(bot, communityId, toSetup).catch((err) => {
      console.error("Failed to back-fill global roles after setup:", err);
    });
  },
};
