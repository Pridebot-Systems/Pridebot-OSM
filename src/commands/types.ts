import type { Pridebot } from "../index";
import type { tangle } from "../proto";

export interface Command {
  name: string;
  description: string;
  usage: string;
  execute(
    bot: Pridebot,
    message: tangle.client.types.Message,
    args: string[],
  ): void;
}
