import { Megaphone } from 'lucide-react';
import type { Announcement } from '../types';
import { formatShortDate } from '../utils/format';

export const AnnouncementCard = ({ announcement }: { announcement: Announcement }) => (
  <article className="surface p-5 transition hover:-translate-y-0.5 hover:border-accent-500/30">
    <div className="flex items-start gap-4">
      <div className="rounded-lg bg-accent-500/10 p-2.5 text-accent-500">
        <Megaphone size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <h3 className="text-lg font-semibold text-white">{announcement.title}</h3>
          <span className="text-xs text-slate-500">{formatShortDate(announcement.date)}</span>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-400">{announcement.message}</p>
        <p className="mt-4 text-xs font-medium text-slate-500">Posted by {announcement.author}</p>
      </div>
    </div>
  </article>
);
