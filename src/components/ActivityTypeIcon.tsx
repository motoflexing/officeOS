import { Mail, Phone, StickyNote, Users, type LucideIcon } from 'lucide-react';
import type { ActivityType } from '../types';

// Icon per activity type (spec D.1): Call→Phone, Email→Mail, Meeting→Users, Note→StickyNote.
const iconByType: Record<ActivityType, LucideIcon> = {
  Call: Phone,
  Email: Mail,
  Meeting: Users,
  Note: StickyNote,
};

export const activityIcon = (type: ActivityType): LucideIcon => iconByType[type];

export const ActivityTypeIcon = ({ type, size = 16 }: { type: ActivityType; size?: number }) => {
  const Icon = iconByType[type];
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[color:var(--color-accent-25)] bg-[var(--color-accent-12)] text-accent-300">
      <Icon size={size} />
    </span>
  );
};
