import { useEffect, useState } from 'react';

type Account = { id: string; name: string };

export default function AccountBadge() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [current, setCurrent] = useState<string>('default');
  useEffect(()=>{ (async ()=>{ const l = await (window as any).api?.storage?.listAccounts?.(); setAccounts(l||[]); })(); },[]);
  return (
    <select className="bg-neutral-800 rounded px-2 py-1 text-xs" value={current} onChange={(e)=> setCurrent(e.target.value)}>
      <option value="default">Default</option>
      {accounts.map(a => (<option key={a.id} value={a.id}>{a.name}</option>))}
    </select>
  );
}

export async function openWithAccount(targetUrl: string, accountId: string) {
  if (accountId && accountId !== 'default') await (window as any).api?.tabs?.createWithProfile?.(accountId, targetUrl);
  else await (window as any).api?.tabs?.create?.(targetUrl);
}


