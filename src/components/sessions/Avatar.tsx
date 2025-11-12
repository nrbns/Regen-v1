interface AvatarProps {
  name: string;
  color?: string;
}

export function Avatar({ name, color }: AvatarProps) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase())
    .join('')
    .slice(0, 2) || 'OB';

  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white shadow-inner"
      style={{ backgroundColor: color || '#3b82f6' }}
    >
      {initials}
    </div>
  );
}

