import { useState, useEffect } from 'react';
import { commandController, type SystemStatus, type CommandResult, type CommandContext } from '../lib/command/CommandController';

export function useCommandController() {
  const [status, setStatus] = useState<SystemStatus>(commandController.getStatus());
  const [lastAction, setLastAction] = useState<string>(commandController.getLastAction());
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    const unsubscribeStatus = commandController.onStatusChange((newStatus) => {
      setStatus(newStatus);
      setIsExecuting(newStatus === 'working');
    });

    const unsubscribeAction = commandController.onActionChange((action) => {
      setLastAction(action);
    });

    return () => {
      unsubscribeStatus();
      unsubscribeAction();
    };
  }, []);

  const executeCommand = async (input: string, context?: CommandContext): Promise<CommandResult> => {
    return await commandController.handleCommand(input, context);
  };

  return {
    status,
    lastAction,
    isExecuting,
    executeCommand,
  };
}