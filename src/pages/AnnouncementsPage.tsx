import { Send } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { AnnouncementCard } from '../components/AnnouncementCard';
import { storage } from '../services/storage';
import { useAuth } from '../state/AuthContext';
import type { Announcement } from '../types';

export const AnnouncementsPage = () => {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => storage.getAnnouncements());
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  if (!profile) return null;

  const postAnnouncement = (event: FormEvent) => {
    event.preventDefault();
    const announcement: Announcement = {
      id: crypto.randomUUID(),
      title,
      message,
      date: new Date().toISOString(),
      author: profile.name,
    };
    const nextAnnouncements = [announcement, ...announcements];
    setAnnouncements(nextAnnouncements);
    storage.setAnnouncements(nextAnnouncements);
    setTitle('');
    setMessage('');
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent-500">Announcements</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Company Announcements</h2>
      </div>

      <form onSubmit={postAnnouncement} className="surface p-5">
        <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-300">Title</span>
            <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-300">Message</span>
            <input className="field" value={message} onChange={(event) => setMessage(event.target.value)} required />
          </label>
        </div>
        <button type="submit" className="btn-primary mt-5">
          <Send size={18} />
          Post Announcement
        </button>
      </form>

      <div className="grid gap-4">
        {announcements.map((announcement) => (
          <AnnouncementCard key={announcement.id} announcement={announcement} />
        ))}
      </div>
    </div>
  );
};
