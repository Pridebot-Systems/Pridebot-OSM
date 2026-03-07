import type { Command } from './types';
import { ping } from './ping';
import { gaydar } from './gaydar';
import { help } from './help';

export const commands = new Map<string, Command>();

for (const cmd of [ping, gaydar, help]) {
    commands.set(cmd.name, cmd);
}

export type { Command };
