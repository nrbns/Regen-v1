import { useEffect, useState } from 'react';
import { tabManager } from '../services/tabManager';

export function useTabManager() {
  const [tabId, setTabId] = useState<string>(() => tabManager.getTabId());
  const [activeJobId, setActiveJobId] = useState<string | null | undefined>(() =>
    tabManager.getActiveJob()
  );

  useEffect(() => {
    const unsub = tabManager.subscribe(info => {
      setTabId(info.id);
      setActiveJobId(info.activeJobId);
    });
    return unsub;
  }, []);

  return {
    tabId,
    activeJobId,
    setActiveJob: (jobId: string | null) => tabManager.setActiveJob(jobId),
    clearActiveJob: () => tabManager.clearActiveJob(),
    listOpenTabs: () => tabManager.listOpenTabs(),
  };
}
