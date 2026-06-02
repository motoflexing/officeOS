import { FormEvent, useState } from 'react';
import { Toast } from '../components/Toast';
import { storage } from '../services/storage';
import type { CompanySettings, WorkMode } from '../types';

export const SettingsPage = () => {
  const [settings, setSettings] = useState<CompanySettings>(() => storage.getSettings());
  const [toast, setToast] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    storage.setSettings(settings);
    setToast('Settings saved');
    window.setTimeout(() => setToast(''), 2200);
  };

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast} /> : null}
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent-500">Admin Settings</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Company Settings</h2>
      </div>

      <form onSubmit={submit} className="surface max-w-3xl p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-300">Company Name</span>
            <input
              className="field"
              value={settings.companyName}
              onChange={(event) => setSettings({ ...settings, companyName: event.target.value })}
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-300">Working Hours</span>
            <input
              className="field"
              value={settings.workingHours}
              onChange={(event) => setSettings({ ...settings, workingHours: event.target.value })}
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-300">Default Work Mode</span>
            <select
              className="field"
              value={settings.defaultWorkMode}
              onChange={(event) => setSettings({ ...settings, defaultWorkMode: event.target.value as WorkMode })}
            >
              <option>Office</option>
              <option>Remote</option>
              <option>Hybrid</option>
            </select>
          </label>
        </div>

        <section className="mt-6">
          <h3 className="text-lg font-semibold text-white">Notification Preferences</h3>
          <div className="mt-4 grid gap-3">
            <PreferenceToggle
              label="Email notifications"
              checked={settings.emailNotifications}
              onChange={() =>
                setSettings({ ...settings, emailNotifications: !settings.emailNotifications })
              }
            />
            <PreferenceToggle
              label="Daily report reminders"
              checked={settings.dailyReportReminders}
              onChange={() =>
                setSettings({ ...settings, dailyReportReminders: !settings.dailyReportReminders })
              }
            />
          </div>
        </section>

        <button type="submit" className="btn-primary mt-6">
          Save Settings
        </button>
      </form>
    </div>
  );
};

const PreferenceToggle = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) => (
  <button
    type="button"
    onClick={onChange}
    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.035] px-4 py-3 text-left transition hover:border-accent-500/40"
  >
    <span className="font-medium text-slate-200">{label}</span>
    <span className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-accent-600' : 'bg-slate-700'}`}>
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${checked ? 'left-6' : 'left-1'}`} />
    </span>
  </button>
);
