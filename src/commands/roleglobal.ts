import type { Command } from "./types";
import { prisma } from "../db";

export const roleglobal: Command = {
  name: "roleglobal",
  description:
    "Toggle global role sync. When enabled, roles you select in one server apply to all servers with roles set up.",
  usage: "!roleglobal",

  async execute(bot, message) {
    const userId = message.authorId.toString();

    const existing = await prisma.userGlobal.findUnique({
      where: { userId },
    });

    const newState = !existing?.enabled;

    await prisma.userGlobal.upsert({
      where: { userId },
      update: { enabled: newState },
      create: { userId, enabled: newState },
    });

    await bot.reply(
      message,
      newState
        ? "Global role sync **enabled**. Roles you add/remove will now sync across all servers."
        : "Global role sync **disabled**. Role changes will only apply to the current server.",
    );
  },
};
