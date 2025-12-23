// FS Watcher and Event Bus for real-time markdown updates
import chokidar from 'chokidar';
import { EventEmitter } from 'events';
import path from 'path';

export const bus = new EventEmitter();

const knowledgeDir = path.join(process.cwd(), 'apps', 'knowledge-engine', 'content');

export function startWatcher() {
  const watcher = chokidar.watch(knowledgeDir, {
    persistent: true,
    ignoreInitial: false,
    depth: 2,
    awaitWriteFinish: true,
  });

  watcher.on('add', file => bus.emit('file:add', file));
  watcher.on('change', file => bus.emit('file:update', file));
  watcher.on('unlink', file => bus.emit('file:delete', file));

  return watcher;
}
