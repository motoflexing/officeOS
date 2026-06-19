import { Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { INVOICE_FILTER_STATUSES, getEffectiveStatus } from '../config/crmOptions';
import { companyId, isFirebaseConfigured } from '../services/firebase';
import { firestoreService } from '../services/firestoreService';
import { storage } from '../services/storage';
import type { Contact, Invoice, InvoiceStatus, Subscription } from '../types';
import { formatShortDate } from '../utils/format';
import { InvoiceDetailModal } from './InvoiceDetailModal';
import { InvoiceStatusPill } from './InvoiceStatusPill';

// One indirection so call sites are identical in Firebase and localStorage modes.
const crm = isFirebaseConfigured ? firestoreService : storage;

const money = (value: number, currency: string) =>
  `${currency === 'USD' ? '$' : `${currency} `}${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const InvoicesTab = ({
  subscription,
  clientName,
  contacts,
  currentUser,
  canEdit,
  onToast,
}: {
  subscription: Subscription;
  clientName: string;
  contacts: Contact[];
  currentUser: { id: string; name: string };
  canEdit: boolean;
  onToast: (message: string) => void;
}) => {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<'All' | InvoiceStatus | 'Overdue'>('All');
  // 'new' opens a blank draft; an Invoice opens that existing one.
  const [open, setOpen] = useState<'new' | Invoice | null>(null);

  useEffect(() => {
    const unsubscribe = crm.subscribeToInvoicesForSubscription(
      companyId,
      subscription.clientId,
      subscription.id,
      setInvoices,
    );
    return unsubscribe;
  }, [subscription.clientId, subscription.id]);

  const primaryContact = useMemo(
    () => contacts.find((contact) => contact.isPrimary) ?? contacts[0],
    [contacts],
  );

  const filtered = useMemo(() => {
    if (!invoices) return [];
    if (statusFilter === 'All') return invoices;
    return invoices.filter((invoice) => getEffectiveStatus(invoice) === statusFilter);
  }, [invoices, statusFilter]);

  if (!invoices) {
    return <p className="py-8 text-center text-sm text-[color:var(--color-text-muted)]">Loading invoices…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          className="field max-w-[180px]"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as 'All' | InvoiceStatus | 'Overdue')}
        >
          <option value="All">All statuses</option>
          {INVOICE_FILTER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        {canEdit ? (
          <button type="button" className="btn-primary" onClick={() => setOpen('new')}>
            <Plus size={16} />
            New Invoice
          </button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-[color:var(--color-text-muted)]">
          {invoices.length === 0 ? 'No invoices yet for this subscription.' : 'No invoices match this filter.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[color:var(--color-border-weak)] text-xs uppercase tracking-[0.12em] text-[color:var(--color-text-muted)]">
                <th className="py-2 pr-4 font-semibold">Invoice #</th>
                <th className="py-2 pr-4 font-semibold">Period</th>
                <th className="py-2 pr-4 font-semibold">Issue Date</th>
                <th className="py-2 pr-4 font-semibold">Due Date</th>
                <th className="py-2 pr-4 font-semibold text-right">Total</th>
                <th className="py-2 pr-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((invoice) => (
                <tr
                  key={invoice.id}
                  onClick={() => setOpen(invoice)}
                  className="cursor-pointer border-b border-[color:var(--color-border-weak)] transition hover:bg-[var(--color-fill-055)]"
                >
                  <td className="py-3 pr-4 font-medium text-[color:var(--color-text-secondary)]">{invoice.invoiceNumber}</td>
                  <td className="py-3 pr-4 text-[color:var(--color-text-muted)]">
                    {formatShortDate(invoice.periodStart)} – {formatShortDate(invoice.periodEnd)}
                  </td>
                  <td className="py-3 pr-4 text-[color:var(--color-text-muted)]">{formatShortDate(invoice.issueDate)}</td>
                  <td className="py-3 pr-4 text-[color:var(--color-text-muted)]">{formatShortDate(invoice.dueDate)}</td>
                  <td className="py-3 pr-4 text-right font-medium text-[color:var(--color-text-secondary)]">
                    {money(invoice.total, invoice.currency)}
                  </td>
                  <td className="py-3 pr-4">
                    <InvoiceStatusPill status={getEffectiveStatus(invoice)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open ? (
        <InvoiceDetailModal
          invoice={open === 'new' ? null : open}
          subscription={subscription}
          clientName={clientName}
          primaryContact={primaryContact}
          currentUser={currentUser}
          canEdit={canEdit}
          onClose={() => setOpen(null)}
          onToast={onToast}
        />
      ) : null}
    </div>
  );
};
