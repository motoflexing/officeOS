import { Send } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { AnnouncementCard, canViewAnnouncement } from '../components/AnnouncementCard';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { Toast } from '../components/Toast';
import { storage } from '../services/storage';
import { useAuth } from '../state/AuthContext';
import type { Announcement, AnnouncementTargetRole } from '../types';

const targetRoles: AnnouncementTargetRole[] = ['Everyone', 'Admin', 'HR', 'Employee'];

export const AnnouncementsPage = () => {
  const { profile, role } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => storage.getAnnouncements());
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRole, setTargetRole] = useState<AnnouncementTargetRole>('Everyone');
  const [settings] = useState(() => storage.getSettings());
  const [toast, setToast] = useState('');

  const visibleAnnouncements = useMemo(
    () => (role ? announcements.filter((announcement) => canViewAnnouncement(announcement, role)) : []),
    [announcements, role],
  );

  if (!profile || !role) return null;

  const canCreate = role === 'Admin' || (role === 'HR' && settings.allowHrAnnouncements);

  const postAnnouncement = (event: FormEvent) => {
    event.preventDefault();
    if (!canCreate) return;

    const announcement: Announcement = {
      id: crypto.randomUUID(),
      title: title.trim(),
      message: message.trim(),
      authorName: profile.name,
      authorRole: role,
      targetRole,
      createdAt: new Date().toISOString(),
    };
    const nextAnnouncements = [announcement, ...announcements];
    setAnnouncements(nextAnnouncements);
    storage.setAnnouncements(nextAnnouncements);
    setTitle('');
    setMessage('');
    setTargetRole('Everyone');
    setToast('Announcement posted');
    window.setTimeout(() => setToast(''), 2400);
  };

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast} /> : null}
      <PageHeader
        eyebrow="Announcements"
        title="Company Announcements"
        subtitle="Share and view role-targeted workspace updates."
      />

      {canCreate ? (
        <form onSubmit={postAnnouncement} className="surface p-5">
          <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr_180px]">
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-300">Title</span>
              <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} required />
            </label>
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-300">Message</span>
              <input className="field" value={message} onChange={(event) => setMessage(event.target.value)} required />
            </label>
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-300">Target</span>
              <select
                className="field"
                value={targetRole}
                onChange={(event) => setTargetRole(event.target.value as AnnouncementTargetRole)}
              >
                {targetRoles.map((target) => (
                  <option key={target}>{target}</option>
                ))}
              </select>
            </label>
          </div>
          <button type="submit" className="btn-primary mt-5">
            <Send size={18} />
            Post Announcement
          </button>
        </form>
      ) : null}

      <div className="grid gap-4">
        {visibleAnnouncements.length === 0 ? (
          <EmptyState
            icon={Send}
            title="No announcements available"
            description="Role-targeted workspace updates will appear here when they are published."
          />
        ) : (
          visibleAnnouncements.map((announcement) => (
            <AnnouncementCard key={announcement.id} announcement={announcement} />
          ))
        )}
      </div>
    </div>
  );
};
