import type { Command } from "./types";
import { ping } from "./ping";
import { gaydar } from "./gaydar";
import { bidar } from "./bidar";
import { lesdar } from "./lesdar";
import { transdar } from "./transdar";
import { queerdar } from "./queerdar";
import { help } from "./help";
import { invite } from "./invite";
import { rolesetup } from "./rolesetup";
import { rolegive } from "./rolegive";
import { roleremove } from "./roleremove";
import { roleremoveall } from "./roleremoveall";
import { roleglobal } from "./roleglobal";
import { rolelist } from "./rolelist";
import { roledelete } from "./roledelete";

export const commands = new Map<string, Command>();

for (const cmd of [
  ping,
  gaydar,
  bidar,
  lesdar,
  transdar,
  queerdar,
  help,
  invite,
  rolesetup,
  rolegive,
  roleremove,
  roleremoveall,
  roleglobal,
  rolelist,
  roledelete,
]) {
  commands.set(cmd.name, cmd);
}

export type { Command };
