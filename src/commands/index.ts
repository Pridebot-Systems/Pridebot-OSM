import type { Command } from "./types";
import { ping } from "./tools/ping";
import { help } from "./tools/help";
import { invite } from "./tools/invite";
import { gaydar } from "./fun/gaydar";
import { bidar } from "./fun/bidar";
import { lesdar } from "./fun/lesdar";
import { transdar } from "./fun/transdar";
import { queerdar } from "./fun/queerdar";
import { match } from "./fun/match";
import { nametester } from "./fun/nametester";
import { pronountester } from "./fun/pronountester";
import { rolesetup } from "./roles/rolesetup";
import { rolegive } from "./roles/rolegive";
import { roleremove } from "./roles/roleremove";
import { roleremoveall } from "./roles/roleremoveall";
import { roleglobal } from "./roles/roleglobal";
import { rolelist } from "./roles/rolelist";
import { roledelete } from "./roles/roledelete";
import { comingout } from "./support/comingout";
import { mentalhealth } from "./support/mentalhealth";
import { transresources } from "./support/transresources";

export const commands = new Map<string, Command>();

for (const cmd of [
  ping,
  help,
  invite,
  gaydar,
  bidar,
  lesdar,
  transdar,
  queerdar,
  match,
  nametester,
  pronountester,
  rolesetup,
  rolegive,
  roleremove,
  roleremoveall,
  roleglobal,
  rolelist,
  roledelete,
  comingout,
  mentalhealth,
  transresources,
]) {
  commands.set(cmd.name, cmd);
}

export type { Command };
