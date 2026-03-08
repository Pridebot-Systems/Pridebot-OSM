import cron from "node-cron";
import type { Pridebot } from "../index";
import { tangle } from "../proto";

export function startServerCountUpdater(
  bot: Pridebot,
  communityId: bigint,
  channelId: bigint,
) {
  const update = async () => {
    try {
      const result = await bot.client.send(
        tangle.client.communities.GetCommunities.create({}),
      );
      const count = result.communities?.communities?.length ?? 0;

      await bot.client.send(
        tangle.client.communities.EditChannel.create({
          channel: { communityId, channelId },
          name: `Servers: ${count}`,
        }),
      );

      console.log(`Updated server count channel: Servers: ${count}`);
    } catch (err) {
      console.error("Failed to update server count:", err);
    }
  };

  update();
  cron.schedule("*/15 * * * *", update);
}