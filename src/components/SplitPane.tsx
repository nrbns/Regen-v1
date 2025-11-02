import { ReactNode } from 'react';

export default function SplitPane({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="flex h-full">
      <div className="w-1/2 h-full border-r border-neutral-800">{left}</div>
      <div className="flex-1 h-full">{right}</div>
    </div>
  );
}


