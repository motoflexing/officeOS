import { X } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import type { Contact } from '../types';

export type ContactInput = Omit<Contact, 'id' | 'clientId' | 'createdAt' | 'updatedAt'>;

// Add/edit modal for a client contact (spec C.1). The parent persists the result and
// handles the single-primary-per-client batch when isPrimary is set.
export const ContactModal = ({
  contact,
  onClose,
  onSave,
}: {
  contact: Contact | null;
  onClose: () => void;
  onSave: (input: ContactInput) => Promise<void>;
}) => {
  const [firstName, setFirstName] = useState(contact?.firstName ?? '');
  const [lastName, setLastName] = useState(contact?.lastName ?? '');
  const [role, setRole] = useState(contact?.role ?? '');
  const [email, setEmail] = useState(contact?.email ?? '');
  const [phone, setPhone] = useState(contact?.phone ?? '');
  const [isPrimary, setIsPrimary] = useState(Boolean(contact?.isPrimary));
  const [linkedinUrl, setLinkedinUrl] = useState(contact?.linkedinUrl ?? '');
  const [lastContactedAt, setLastContactedAt] = useState(contact?.lastContactedAt ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const first = firstName.trim();
    const last = lastName.trim();
    const mail = email.trim();
    if (!first || !last || !mail) {
      setError('First name, last name, and email are required.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        firstName: first,
        lastName: last,
        role: role.trim() || undefined,
        email: mail,
        phone: phone.trim() || undefined,
        isPrimary,
        linkedinUrl: linkedinUrl.trim() || undefined,
        lastContactedAt: lastContactedAt || undefined,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save contact.');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay-65)] px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Contact"
      onClick={onClose}
    >
      <form
        className="surface flex max-h-full w-full max-w-lg flex-col border-[color:var(--color-accent-30)] p-6 shadow-[var(--shadow-glow-44-18)]"
        onClick={(event) => event.stopPropagation()}
        onSubmit={submit}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-[color:var(--color-accent)]">
            {contact ? 'Edit Contact' : 'Add Contact'}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-[color:var(--color-text-secondary)] transition hover:bg-[var(--color-fill-055)] hover:text-[color:var(--color-text-primary)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 grid gap-4 overflow-y-auto pr-1 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">First Name</span>
            <input className="field" value={firstName} onChange={(event) => setFirstName(event.target.value)} required autoFocus />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Last Name</span>
            <input className="field" value={lastName} onChange={(event) => setLastName(event.target.value)} required />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Role</span>
            <input className="field" value={role} onChange={(event) => setRole(event.target.value)} placeholder="e.g. Head of Support" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Email</span>
            <input className="field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Phone</span>
            <input className="field" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Last Contacted</span>
            <input
              className="field"
              type="date"
              value={lastContactedAt}
              onChange={(event) => setLastContactedAt(event.target.value)}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">LinkedIn URL</span>
            <input
              className="field"
              type="url"
              value={linkedinUrl}
              onChange={(event) => setLinkedinUrl(event.target.value)}
              placeholder="https://linkedin.com/in/…"
            />
          </label>
          <button
            type="button"
            onClick={() => setIsPrimary((value) => !value)}
            className="flex items-center justify-between rounded-lg border border-[color:var(--color-border-weak)] bg-[var(--color-fill-035)] px-4 py-3 text-left transition hover:border-[color:var(--color-accent-40)] sm:col-span-2"
          >
            <span className="font-medium text-[color:var(--color-text-soft)]">Primary contact</span>
            <span className={`relative h-6 w-11 rounded-full transition ${isPrimary ? 'bg-[var(--color-accent-hover)]' : 'bg-[var(--color-slate-bg-700)]'}`}>
              <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${isPrimary ? 'left-6' : 'left-1'}`} />
            </span>
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-[color:var(--color-error-line-25)] bg-[var(--color-error-fill-10)] px-4 py-3 text-sm text-[color:var(--color-error-text-200)]">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : contact ? 'Save Contact' : 'Add Contact'}
          </button>
        </div>
      </form>
    </div>
  );
};
