import type { ReactNode } from 'react';

interface TooltipProps {
  label: ReactNode;
  children: ReactNode;
}

export function Tooltip({ children }: TooltipProps) {
  // Minimal placeholder: returns children directly until full tooltip implementation restored.
  return <>{children}</>;
}

