import { FormEvent, useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Toast } from '../components/Toast';
import { firestoreService } from '../services/firestoreService';
import { isFirebaseConfigured } from '../services/firebase';
import { storage } from '../services/storage';
import type { CompanySettings, WorkModePolicy } from '../types';

const workModePolicies: WorkModePolicy[] = ['Office Only', 'Hybrid', 'Remote Friendly'];

export const SettingsPage = () => {
  const [settings, setSettings] = useState<CompanySettings>(() => storage.getSettings());
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    firestoreService
      .getSettings()
      .then((settings) => {
        if (settings) setSettings(storage.setSettings(settings));
      })
      .catch((error) => setToast(error instanceof Error ? error.message : 'Unable to load settings.'))
      .finally(() => setLoading(false));
  }, []);

  const updateSetting = <Key extends keyof CompanySettings>(key: Key, value: CompanySettings[Key]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (isFirebaseConfigured) {
        await firestoreService.updateSettings(settings);
      }
      storage.setSettings(settings);
      setToast('Settings saved');
      window.setTimeout(() => setToast(''), 2200);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Unable to save settings.');
      window.setTimeout(() => setToast(''), 2200);
    }
  };

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast} /> : null}
      <PageHeader
        eyebrow="Admin Settings"
        title="Company Settings"
        subtitle="Manage tenant branding, office policy, and local communication preferences."
      />
      {loading ? <p className="text-sm text-slate-400">Loading company settings...</p> : null}

      <form onSubmit={submit} className="space-y-6">
        <section className="surface p-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Company Branding</h3>
            <p className="mt-1 text-sm text-slate-500">Local tenant details used for this company.</p>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-300">Company Name</span>
              <input
                className="field"
                value={settings.workspaceName}
                onChange={(event) => updateSetting('workspaceName', event.target.value)}
                required
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-300">Product Name</span>
              <input
                className="field"
                value={settings.productName}
                onChange={(event) => updateSetting('productName', event.target.value)}
                required
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-300">Website URL</span>
              <input
                className="field"
                type="url"
                value={settings.websiteUrl}
                onChange={(event) => updateSetting('websiteUrl', event.target.value)}
                required
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-300">Website Label</span>
              <input
                className="field"
                value={settings.websiteLabel}
                onChange={(event) => updateSetting('websiteLabel', event.target.value)}
                required
              />
            </label>
          </div>
        </section>

        <section className="surface p-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Office Policy</h3>
            <p className="mt-1 text-sm text-slate-500">Define the expected working rhythm for this company.</p>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-300">Office Start Time</span>
              <input
                className="field"
                type="time"
                value={settings.officeStartTime}
                onChange={(event) => updateSetting('officeStartTime', event.target.value)}
                required
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-300">Office End Time</span>
              <input
                className="field"
                type="time"
                value={settings.officeEndTime}
                onChange={(event) => updateSetting('officeEndTime', event.target.value)}
                required
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-300">Work Mode Policy</span>
              <select
                className="field"
                value={settings.workModePolicy}
                onChange={(event) => updateSetting('workModePolicy', event.target.value as WorkModePolicy)}
              >
                {workModePolicies.map((policy) => (
                  <option key={policy}>{policy}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-300">Default Timezone</span>
              <input
                className="field"
                value={settings.timezone}
                onChange={(event) => updateSetting('timezone', event.target.value)}
                placeholder="Asia/Kolkata"
                required
              />
            </label>
          </div>
        </section>

        <section className="surface p-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Communication & Reports</h3>
            <p className="mt-1 text-sm text-slate-500">Control announcement permissions and reporting rules.</p>
          </div>
          <div className="mt-5 grid gap-3">
            <PreferenceToggle
              label="Allow HR to create announcements"
              checked={settings.allowHrAnnouncements}
              onChange={() => updateSetting('allowHrAnnouncements', !settings.allowHrAnnouncements)}
            />
            <PreferenceToggle
              label="Require daily reports"
              checked={settings.requireDailyReports}
              onChange={() => updateSetting('requireDailyReports', !settings.requireDailyReports)}
            />
          </div>
        </section>

        <section className="surface p-6">
          <h3 className="text-lg font-semibold text-white">Platform Information</h3>
          <div className="mt-4 grid gap-3 text-sm">
            <PlatformInfoRow label="Platform" value={settings.productName} />
            <PlatformInfoRow label="Version" value="v0.1 Prototype" />
            <PlatformInfoRow label="Company" value={settings.workspaceName} />
            <PlatformInfoRow label="Website" value={settings.websiteLabel} />
          </div>
        </section>

        <button type="submit" className="btn-primary">
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

const PlatformInfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-ink-950/35 px-4 py-3">
    <span className="text-slate-500">{label}</span>
    <span className="font-medium text-slate-200">{value}</span>
  </div>
);
