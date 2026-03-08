import type { Command } from "./types";
import { ping } from "./ping";
import { gaydar } from "./gaydar";
import { help } from "./help";
import { invite } from "./invite";

export const commands = new Map<string, Command>();

for (const cmd of [ping, gaydar, help, invite]) {
  commands.set(cmd.name, cmd);
}

export type { Command };
