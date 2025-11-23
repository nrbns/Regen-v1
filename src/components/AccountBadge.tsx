import { useEffect, useState } from 'react';

type Account = { id: string; name: string };

export default function AccountBadge() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [current, setCurrent] = useState<string>('default');

  useEffect(() => {
    (async () => {
      try {
        const l = await (window as any).api?.storage?.listAccounts?.();
        setAccounts(Array.isArray(l) ? l.filter(a => a && a.id && a.name) : []);
        // Try to load saved account preference
        try {
          const saved = localStorage.getItem('omnibrowser:selectedAccount');
          if (saved && l && Array.isArray(l) && l.some((a: Account) => a.id === saved)) {
            setCurrent(saved);
          }
        } catch {
          // Ignore localStorage errors
        }
      } catch (error) {
        console.error('[AccountBadge] Failed to load accounts:', error);
        setAccounts([]);
      }
    })();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    setCurrent(newValue);
    // Save preference
    try {
      if (newValue === 'default') {
        localStorage.removeItem('omnibrowser:selectedAccount');
      } else {
        localStorage.setItem('omnibrowser:selectedAccount', newValue);
      }
    } catch (error) {
      console.warn('[AccountBadge] Failed to save account preference:', error);
    }
  };

  return (
    <select
      className="bg-neutral-800 rounded px-2 py-1 text-xs"
      value={current}
      onChange={handleChange}
      title="Select account profile for new tabs"
      aria-label="Account profile selector"
    >
      <option value="default">Default</option>
      {accounts.map(a =>
        a ? (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ) : null
      )}
    </select>
  );
}

export async function openWithAccount(targetUrl: string, accountId: string) {
  try {
    if (!targetUrl || !targetUrl.trim()) {
      console.warn('[AccountBadge] Empty URL provided');
      return;
    }

    // Ensure URL is properly formatted
    const url = targetUrl.trim();

    if (accountId && accountId !== 'default') {
      const result = await (window as any).api?.tabs?.createWithProfile?.(accountId, url);
      if (!result || result.error) {
        console.error('[AccountBadge] Failed to create tab with profile:', result?.error);
        throw new Error(result?.error || 'Failed to create tab');
      }
    } else {
      const result = await (window as any).api?.tabs?.create?.(url);
      if (!result || result.error) {
        console.error('[AccountBadge] Failed to create tab:', result?.error);
        throw new Error(result?.error || 'Failed to create tab');
      }
    }
  } catch (error) {
    console.error('[AccountBadge] Error opening URL:', error);
    throw error;
  }
}
