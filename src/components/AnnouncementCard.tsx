import { Megaphone } from 'lucide-react';
import type { Announcement, AnnouncementTargetRole, Role } from '../types';

export const AnnouncementCard = ({ announcement }: { announcement: Announcement }) => {
  const authorName = announcement.authorName || announcement.author || 'OfficeOS Team';
  const authorRole = announcement.authorRole || 'Admin';
  const targetRole = announcement.targetRole || 'Everyone';
  const createdAt = announcement.createdAt || announcement.date || new Date().toISOString();

  return (
    <article className="surface p-5 transition hover:-translate-y-0.5 hover:border-[color:var(--color-accent-30)]">
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-[var(--color-accent-10)] p-2.5 text-[color:var(--color-accent)]">
          <Megaphone size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
            <div>
              <h3 className="text-lg font-semibold text-[color:var(--color-text-primary)]">{announcement.title}</h3>
              <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
                Posted by {authorName} · {authorRole}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <AnnouncementPill label={`Target: ${targetRole}`} />
              <span className="text-xs text-[color:var(--color-text-muted)]">{formatAnnouncementDate(createdAt)}</span>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-[color:var(--color-text-secondary)]">{announcement.message}</p>
        </div>
      </div>
    </article>
  );
};

const AnnouncementPill = ({ label }: { label: string }) => (
  <span className="rounded-full bg-[var(--color-accent-10)] px-2.5 py-1 text-xs font-medium text-accent-200 ring-1 ring-accent-400/20">
    {label}
  </span>
);

const formatAnnouncementDate = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));

export const canViewAnnouncement = (
  announcement: Announcement,
  role: Role,
  targetRole: AnnouncementTargetRole = announcement.targetRole || 'Everyone',
) => targetRole === 'Everyone' || targetRole === role;
