import { FormEvent, useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { PricingPlansSection } from '../components/PricingPlansSection';
import { Toast } from '../components/Toast';
import { firestoreService } from '../services/firestoreService';
import { isFirebaseConfigured } from '../services/firebase';
import { storage } from '../services/storage';
import { useAuth } from '../state/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';
import type { CompanySettings, WorkModePolicy } from '../types';

const workModePolicies: WorkModePolicy[] = ['Office Only', 'Hybrid', 'Remote Friendly'];

export const SettingsPage = () => {
  const { role } = useAuth();
  const [settings, setSettings] = useState<CompanySettings>(() => storage.getSettings());
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(isFirebaseConfigured);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  };

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
      {loading ? <p className="text-sm text-[color:var(--color-text-secondary)]">Loading company settings...</p> : null}

      <section className="surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-[color:var(--color-text-primary)]">Appearance</h3>
            <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">Choose the theme for this workspace on this device.</p>
          </div>
          <ThemeToggle variant="segments" />
        </div>
      </section>

      <form onSubmit={submit} className="space-y-6">
        <section className="surface p-6">
          <div>
            <h3 className="text-lg font-semibold text-[color:var(--color-text-primary)]">Company Branding</h3>
            <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">Local tenant details used for this company.</p>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Company Name</span>
              <input
                className="field"
                value={settings.workspaceName}
                onChange={(event) => updateSetting('workspaceName', event.target.value)}
                required
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Product Name</span>
              <input
                className="field"
                value={settings.productName}
                onChange={(event) => updateSetting('productName', event.target.value)}
                required
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Website URL</span>
              <input
                className="field"
                type="url"
                value={settings.websiteUrl}
                onChange={(event) => updateSetting('websiteUrl', event.target.value)}
                required
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Website Label</span>
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
            <h3 className="text-lg font-semibold text-[color:var(--color-text-primary)]">Office Policy</h3>
            <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">Define the expected working rhythm for this company.</p>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Office Start Time</span>
              <input
                className="field"
                type="time"
                value={settings.officeStartTime}
                onChange={(event) => updateSetting('officeStartTime', event.target.value)}
                required
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Office End Time</span>
              <input
                className="field"
                type="time"
                value={settings.officeEndTime}
                onChange={(event) => updateSetting('officeEndTime', event.target.value)}
                required
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Work Mode Policy</span>
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
              <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Default Timezone</span>
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
            <h3 className="text-lg font-semibold text-[color:var(--color-text-primary)]">Communication & Reports</h3>
            <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">Control announcement permissions and reporting rules.</p>
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
          <h3 className="text-lg font-semibold text-[color:var(--color-text-primary)]">Platform Information</h3>
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

      {role === 'Admin' ? <PricingPlansSection onToast={showToast} /> : null}
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
    className="flex items-center justify-between rounded-lg border border-[color:var(--color-border-weak)] bg-[var(--color-fill-035)] px-4 py-3 text-left transition hover:border-[color:var(--color-accent-40)]"
  >
    <span className="font-medium text-[color:var(--color-text-soft)]">{label}</span>
    <span className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-[var(--color-accent-hover)]' : 'bg-[var(--color-slate-bg-700)]'}`}>
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${checked ? 'left-6' : 'left-1'}`} />
    </span>
  </button>
);

const PlatformInfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-4 rounded-lg border border-[color:var(--color-border-weak)] bg-[var(--color-overlay-35)] px-4 py-3">
    <span className="text-[color:var(--color-text-muted)]">{label}</span>
    <span className="font-medium text-[color:var(--color-text-soft)]">{value}</span>
  </div>
);
