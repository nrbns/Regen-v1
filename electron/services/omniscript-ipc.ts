/**
 * OmniScript IPC Handlers
 */

import { z } from 'zod';
import { registerHandler } from '../shared/ipc/router';
import { OmniScriptParseRequest, OmniScriptExecuteRequest } from '../shared/ipc/schema';
import { getOmniScriptParser } from './omniscript/parser';

export function registerOmniScriptIpc(): void {
  registerHandler('omniscript:parse', OmniScriptParseRequest, async (_event, request) => {
    const parser = getOmniScriptParser();
    const parsed = await parser.parse(request.command);
    return { parsed };
  });

  registerHandler('omniscript:execute', OmniScriptExecuteRequest, async (_event, request) => {
    const parser = getOmniScriptParser();
    const actions = await parser.executeCommands(request.commands);
    return { actions };
  });
}

