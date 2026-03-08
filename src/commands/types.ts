import type { ExampleBot } from "../index";
import type { tangle } from "../proto";

export interface Command {
  name: string;
  description: string;
  usage: string;
  execute(
    bot: ExampleBot,
    message: tangle.client.types.Message,
    args: string[],
  ): void;
}
