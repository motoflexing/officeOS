import { Mail, Pencil, Phone, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { companyId, isFirebaseConfigured } from '../services/firebase';
import { firestoreService } from '../services/firestoreService';
import { storage } from '../services/storage';
import type { Contact } from '../types';
import { formatShortDate } from '../utils/format';
import { ConfirmModal } from './ConfirmModal';
import { ContactModal, type ContactInput } from './ContactModal';
import { EmptyState } from './EmptyState';

// One indirection so call sites are identical in Firebase and localStorage modes.
const crm = isFirebaseConfigured ? firestoreService : storage;

export const ContactsTab = ({
  clientId,
  contacts,
  canEdit,
  onToast,
}: {
  clientId: string;
  contacts: Contact[];
  canEdit: boolean;
  onToast: (message: string) => void;
}) => {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return contacts;
    return contacts.filter((contact) =>
      `${contact.firstName} ${contact.lastName} ${contact.email} ${contact.role ?? ''}`
        .toLowerCase()
        .includes(term),
    );
  }, [contacts, search]);

  const openAdd = () => {
    setEditingContact(null);
    setModalOpen(true);
  };

  const openEdit = (contact: Contact) => {
    if (!canEdit) return;
    setEditingContact(contact);
    setModalOpen(true);
  };

  const handleSave = async (input: ContactInput) => {
    let savedId: string;
    if (editingContact) {
      await crm.updateContact(companyId, clientId, editingContact.id, input);
      savedId = editingContact.id;
      onToast('Contact updated');
    } else {
      const created = await crm.createContact(companyId, clientId, input);
      savedId = created.id;
      onToast('Contact added');
    }
    // Enforce single-primary-per-client via the batch helper when this one is primary.
    if (input.isPrimary) {
      await crm.setPrimaryContact(companyId, clientId, savedId);
    }
    setModalOpen(false);
    setEditingContact(null);
  };

  const confirmDelete = async () => {
    if (!deletingContact) return;
    try {
      await crm.deleteContact(companyId, clientId, deletingContact.id);
      onToast('Contact removed');
    } catch (caught) {
      onToast(caught instanceof Error ? caught.message : 'Unable to delete contact.');
    } finally {
      setDeletingContact(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            className="field pl-10"
            placeholder="Search contacts"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {canEdit ? (
          <button type="button" className="btn-primary" onClick={openAdd}>
            <Plus size={18} />
            Add Contact
          </button>
        ) : null}
      </div>

      {contacts.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No contacts yet"
          description="No contacts yet. Add the first contact at this client."
          action={
            canEdit ? (
              <button type="button" className="btn-primary" onClick={openAdd}>
                <Plus size={18} />
                Add Contact
              </button>
            ) : null
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="No contacts match your search" description="Try a different name, email, or role." />
      ) : (
        <section className="surface overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Primary</th>
                <th className="px-4 py-3 font-medium">Last Contacted</th>
                {canEdit ? <th className="px-4 py-3 text-right font-medium">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {filtered.map((contact) => (
                <tr
                  key={contact.id}
                  onClick={() => openEdit(contact)}
                  className={`border-b border-white/5 transition last:border-0 ${
                    canEdit ? 'cursor-pointer hover:bg-white/[0.04]' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-slate-100">
                    {contact.firstName} {contact.lastName}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{contact.role || '—'}</td>
                  <td className="px-4 py-3 text-slate-300">
                    <a
                      href={`mailto:${contact.email}`}
                      onClick={(event) => event.stopPropagation()}
                      className="inline-flex items-center gap-1.5 text-slate-300 transition hover:text-accent-300"
                    >
                      <Mail size={14} className="text-slate-500" />
                      {contact.email}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {contact.phone ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Phone size={14} className="text-slate-500" />
                        {contact.phone}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {contact.isPrimary ? (
                      <span className="inline-flex rounded-full bg-accent-500/12 px-2.5 py-1 text-xs font-medium text-accent-300 ring-1 ring-accent-400/25">
                        Primary
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {contact.lastContactedAt ? formatShortDate(contact.lastContactedAt) : '—'}
                  </td>
                  {canEdit ? (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEdit(contact);
                          }}
                          aria-label="Edit contact"
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/[0.055] hover:text-white"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeletingContact(contact);
                          }}
                          aria-label="Delete contact"
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-500/15 hover:text-rose-300"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {modalOpen ? (
        <ContactModal contact={editingContact} onClose={() => setModalOpen(false)} onSave={handleSave} />
      ) : null}

      {deletingContact ? (
        <ConfirmModal
          title="Delete contact?"
          message={`Remove ${deletingContact.firstName} ${deletingContact.lastName} from this client?`}
          confirmLabel="Delete Contact"
          destructive
          onConfirm={confirmDelete}
          onCancel={() => setDeletingContact(null)}
        />
      ) : null}
    </div>
  );
};
