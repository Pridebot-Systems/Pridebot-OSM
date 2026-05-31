import type { Pridebot } from "../index";
import type { osmium } from "../proto";

export interface Command {
  name: string;
  description: string;
  usage: string;
  execute(
    bot: Pridebot,
    message: osmium.client.types.Message,
    args: string[],
  ): void;
}
