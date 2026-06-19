import { Plus, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PAYMENT_METHODS, getEffectiveStatus } from '../config/crmOptions';
import { companyId, isFirebaseConfigured } from '../services/firebase';
import { firestoreService } from '../services/firestoreService';
import { storage } from '../services/storage';
import type { Contact, Invoice, InvoiceLineItem, Subscription } from '../types';
import { formatShortDate } from '../utils/format';
import { InvoiceStatusPill } from './InvoiceStatusPill';

// One indirection so call sites are identical in Firebase and localStorage modes.
const crm = isFirebaseConfigured ? firestoreService : storage;

// V1 issuer branding (spec 5A.8: hardcoded for V1 — no workspace-settings fetch here).
const ISSUER_NAME = 'Geekynd Hub';

const money = (value: number, currency: string) =>
  `${currency === 'USD' ? '$' : `${currency} `}${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const addDays = (iso: string, days: number) => {
  const date = new Date(iso);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
const todayIso = () => new Date().toISOString().slice(0, 10);
const blankLine = (): InvoiceLineItem => ({
  id: `line-${Date.now()}-${Math.round(Math.random() * 1000)}`,
  description: '',
  quantity: 1,
  unitPrice: 0,
  amount: 0,
});

// Build a self-contained, inline-styled HTML invoice (email-ready, no external CSS).
const buildInvoiceHtml = (invoice: Invoice, clientName: string, contact?: Contact): string => {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const c = invoice.currency;
  const lineRows = invoice.lineItems
    .map(
      (item) =>
        `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee">${esc(item.description)}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${item.quantity}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${esc(money(item.unitPrice, c))}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${esc(money(item.amount, c))}</td>
      </tr>`,
    )
    .join('');

  const taxRow =
    invoice.taxAmount !== undefined && invoice.taxAmount > 0
      ? `<tr><td style="padding:4px 0;color:#666;text-align:right" colspan="3">Tax (${invoice.taxRate}%)</td><td style="padding:4px 0;text-align:right">${esc(
          money(invoice.taxAmount, c),
        )}</td></tr>`
      : '';

  const statusFooter =
    invoice.status === 'Paid' && invoice.paidAt
      ? `<p style="color:#2e7d32;font-size:13px;margin-top:24px">Paid on ${esc(formatShortDate(invoice.paidAt))}${
          invoice.paidByNameSnapshot ? ` by ${esc(invoice.paidByNameSnapshot)}` : ''
        }${invoice.paymentMethod ? `, method: ${esc(invoice.paymentMethod)}` : ''}</p>`
      : invoice.status === 'Void' && invoice.voidedAt
        ? `<p style="color:#999;font-size:13px;margin-top:24px">Voided on ${esc(formatShortDate(invoice.voidedAt))}${
            invoice.voidReason ? ` — ${esc(invoice.voidReason)}` : ''
          }</p>`
        : invoice.status === 'Sent' && invoice.sentAt
          ? `<p style="color:#666;font-size:13px;margin-top:24px">Sent on ${esc(formatShortDate(invoice.sentAt))}${
              invoice.sentByNameSnapshot ? ` by ${esc(invoice.sentByNameSnapshot)}` : ''
            }</p>`
          : '';

  const billTo = [clientName, contact ? `${contact.firstName} ${contact.lastName}`.trim() : '', contact?.email ?? '']
    .filter(Boolean)
    .map((line) => esc(line))
    .join('<br>');

  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:680px;color:#1a1a1a">
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <h1 style="margin:0;font-size:22px">${esc(ISSUER_NAME)}</h1>
      <p style="color:#666;margin:4px 0 0;font-size:13px">Invoice</p>
    </div>
    <div style="text-align:right">
      <p style="margin:0;font-size:18px;font-weight:700">${esc(invoice.invoiceNumber)}</p>
      <p style="color:#666;margin:4px 0 0;font-size:13px">Issued ${esc(formatShortDate(invoice.issueDate))}</p>
      <p style="color:#666;margin:2px 0 0;font-size:13px">Due ${esc(formatShortDate(invoice.dueDate))}</p>
    </div>
  </div>
  <div style="margin:24px 0">
    <p style="color:#999;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px">Bill To</p>
    <p style="margin:0;font-size:14px;line-height:1.5">${billTo}</p>
    <p style="color:#666;margin:8px 0 0;font-size:13px">Period: ${esc(formatShortDate(invoice.periodStart))} – ${esc(
      formatShortDate(invoice.periodEnd),
    )}</p>
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <thead>
      <tr style="color:#999;font-size:11px;text-transform:uppercase;letter-spacing:1px">
        <th style="padding:8px 0;text-align:left;border-bottom:2px solid #ddd">Description</th>
        <th style="padding:8px 0;text-align:right;border-bottom:2px solid #ddd">Qty</th>
        <th style="padding:8px 0;text-align:right;border-bottom:2px solid #ddd">Unit Price</th>
        <th style="padding:8px 0;text-align:right;border-bottom:2px solid #ddd">Amount</th>
      </tr>
    </thead>
    <tbody>${lineRows}</tbody>
    <tfoot>
      <tr><td style="padding:8px 0;color:#666;text-align:right" colspan="3">Subtotal</td><td style="padding:8px 0;text-align:right">${esc(
        money(invoice.subtotal, c),
      )}</td></tr>
      ${taxRow}
      <tr><td style="padding:8px 0;font-weight:700;text-align:right" colspan="3">Total</td><td style="padding:8px 0;font-weight:700;text-align:right">${esc(
        money(invoice.total, c),
      )}</td></tr>
    </tfoot>
  </table>
  ${invoice.clientFacingNotes ? `<p style="white-space:pre-wrap;color:#444;font-size:13px;margin-top:24px">${esc(invoice.clientFacingNotes)}</p>` : ''}
  ${statusFooter}
</div>`;
};

export const InvoiceDetailModal = ({
  invoice,
  subscription,
  clientName,
  primaryContact,
  currentUser,
  canEdit,
  onClose,
  onToast,
}: {
  // null = creating a new draft.
  invoice: Invoice | null;
  subscription: Subscription;
  clientName: string;
  primaryContact?: Contact;
  currentUser: { id: string; name: string };
  canEdit: boolean;
  onClose: () => void;
  onToast: (message: string) => void;
}) => {
  // Default first line pre-filled from the subscription.
  const defaultLine = (): InvoiceLineItem => ({
    ...blankLine(),
    description: `${subscription.planNameSnapshot ?? 'Plan'} — ${subscription.teamLabel}`,
    quantity: 1,
    unitPrice: subscription.mrr,
    amount: subscription.mrr,
  });

  const issueDefault = invoice?.issueDate ?? todayIso();
  const [periodStart, setPeriodStart] = useState(invoice?.periodStart ?? todayIso());
  const [periodEnd, setPeriodEnd] = useState(invoice?.periodEnd ?? todayIso());
  const [issueDate, setIssueDate] = useState(issueDefault);
  const [dueDate, setDueDate] = useState(invoice?.dueDate ?? addDays(issueDefault, 30));
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(invoice?.lineItems ?? [defaultLine()]);
  const [taxRate, setTaxRate] = useState<string>(invoice?.taxRate !== undefined ? String(invoice.taxRate) : '');
  const [clientFacingNotes, setClientFacingNotes] = useState(invoice?.clientFacingNotes ?? '');
  const [notes, setNotes] = useState(invoice?.notes ?? '');

  // Live working copy used by Preview / Copy-as-HTML and the action buttons.
  const [savedInvoice, setSavedInvoice] = useState<Invoice | null>(invoice);
  const [invoiceId, setInvoiceId] = useState<string | null>(invoice?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);

  // Preview unless it's a Draft being edited by an Admin.
  const startInPreview = !(invoice?.status === 'Draft' || invoice === null) || !canEdit;
  const [preview, setPreview] = useState(startInPreview);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const currency = subscription.currency || 'USD';

  // Live-computed totals for the edit form.
  const computed = useMemo(() => {
    const items = lineItems.map((item) => ({ ...item, amount: item.quantity * item.unitPrice }));
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const rate = taxRate === '' ? undefined : Number(taxRate);
    const taxAmount = rate ? Math.round(subtotal * (rate / 100) * 100) / 100 : undefined;
    return { subtotal, taxAmount, total: subtotal + (taxAmount ?? 0) };
  }, [lineItems, taxRate]);

  const setLine = (id: string, patch: Partial<InvoiceLineItem>) =>
    setLineItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const addLine = () => setLineItems((prev) => [...prev, blankLine()]);
  const removeLine = (id: string) => setLineItems((prev) => prev.filter((item) => item.id !== id));

  const persist = async (): Promise<Invoice | null> => {
    const payload = {
      periodStart,
      periodEnd,
      issueDate,
      dueDate,
      lineItems,
      taxRate: taxRate === '' ? undefined : Number(taxRate),
      currency,
      clientFacingNotes: clientFacingNotes.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    if (invoiceId) {
      await crm.updateInvoice(companyId, subscription.clientId, invoiceId, payload);
      const updated = await crm.getInvoice(companyId, subscription.clientId, invoiceId);
      setSavedInvoice(updated);
      return updated;
    }
    const created = await crm.createInvoice(companyId, subscription.clientId, {
      ...payload,
      subscriptionId: subscription.id,
      status: 'Draft',
      createdBy: currentUser.id,
    });
    setInvoiceId(created.id);
    setSavedInvoice(created);
    return created;
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      await persist();
      onToast('Draft saved');
    } catch (caught) {
      onToast(caught instanceof Error ? caught.message : 'Unable to save invoice.');
    } finally {
      setSaving(false);
    }
  };

  const markSent = async () => {
    if (computed.subtotal <= 0 || lineItems.length === 0) {
      onToast('Add at least one line item with a positive subtotal first.');
      return;
    }
    if (dueDate < issueDate) {
      onToast('Due date must be on or after the issue date.');
      return;
    }
    setSaving(true);
    try {
      const saved = await persist();
      if (!saved) return;
      await crm.markInvoiceSent(companyId, subscription.clientId, saved.id, currentUser.id);
      const refreshed = await crm.getInvoice(companyId, subscription.clientId, saved.id);
      setSavedInvoice(refreshed);
      setPreview(true);
      onToast('Invoice marked as sent');
    } catch (caught) {
      onToast(caught instanceof Error ? caught.message : 'Unable to mark invoice as sent.');
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async (paymentMethod: string, paymentReference: string) => {
    if (!savedInvoice) return;
    try {
      await crm.markInvoicePaid(
        companyId,
        subscription.clientId,
        savedInvoice.id,
        currentUser.id,
        paymentMethod,
        paymentReference,
      );
      setSavedInvoice(await crm.getInvoice(companyId, subscription.clientId, savedInvoice.id));
      setPayOpen(false);
      onToast('Invoice marked as paid');
    } catch (caught) {
      onToast(caught instanceof Error ? caught.message : 'Unable to mark invoice as paid.');
    }
  };

  const voidInvoice = async (reason: string) => {
    if (!savedInvoice) return;
    try {
      await crm.voidInvoice(companyId, subscription.clientId, savedInvoice.id, currentUser.id, reason);
      setSavedInvoice(await crm.getInvoice(companyId, subscription.clientId, savedInvoice.id));
      setVoidOpen(false);
      onToast('Invoice voided');
    } catch (caught) {
      onToast(caught instanceof Error ? caught.message : 'Unable to void invoice.');
    }
  };

  const copyAsHtml = async () => {
    if (!savedInvoice) return;
    try {
      await navigator.clipboard.writeText(buildInvoiceHtml(savedInvoice, clientName, primaryContact));
      onToast('Invoice HTML copied to clipboard');
    } catch {
      onToast('Unable to copy to clipboard.');
    }
  };

  const effectiveStatus = savedInvoice ? getEffectiveStatus(savedInvoice) : 'Draft';
  const header = preview
    ? savedInvoice
      ? `Invoice ${savedInvoice.invoiceNumber}`
      : 'Invoice'
    : invoice
      ? `Edit Invoice — ${invoice.invoiceNumber}`
      : 'New Invoice';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-[var(--color-overlay-65)] px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Invoice detail"
      onClick={onClose}
    >
      <div
        className="surface w-full max-w-2xl border-[color:var(--color-accent-30)] p-6 shadow-[var(--shadow-glow-44-18)]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-[color:var(--color-text-primary)]">{header}</h2>
            {preview && savedInvoice ? (
              <div className="mt-2">
                <InvoiceStatusPill status={effectiveStatus} />
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-[color:var(--color-text-secondary)] transition hover:bg-[var(--color-fill-055)] hover:text-[color:var(--color-text-primary)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5">
          {preview && savedInvoice ? (
            <PreviewBody invoice={savedInvoice} clientName={clientName} contact={primaryContact} currency={currency} />
          ) : (
            <div className="space-y-6">
              {/* Dates */}
              <section>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--color-accent)]">Period & Dates</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <LabeledDate label="Period Start" value={periodStart} onChange={setPeriodStart} />
                  <LabeledDate label="Period End" value={periodEnd} onChange={setPeriodEnd} />
                  <LabeledDate label="Issue Date" value={issueDate} onChange={setIssueDate} />
                  <LabeledDate label="Due Date" value={dueDate} onChange={setDueDate} />
                </div>
              </section>

              {/* Line items */}
              <section>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--color-accent)]">Line Items</h4>
                <div className="space-y-2">
                  <div className="hidden grid-cols-[1fr_80px_110px_110px_auto] gap-2 px-1 text-xs uppercase tracking-wide text-[color:var(--color-text-muted)] sm:grid">
                    <span>Description</span>
                    <span className="text-right">Qty</span>
                    <span className="text-right">Unit Price</span>
                    <span className="text-right">Amount</span>
                    <span />
                  </div>
                  {lineItems.map((item) => (
                    <div key={item.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_80px_110px_110px_auto] sm:items-center">
                      <input
                        className="field"
                        value={item.description}
                        placeholder="Description"
                        onChange={(event) => setLine(item.id, { description: event.target.value })}
                      />
                      <input
                        className="field sm:text-right"
                        type="number"
                        value={item.quantity}
                        onChange={(event) => setLine(item.id, { quantity: Number(event.target.value) })}
                      />
                      <input
                        className="field sm:text-right"
                        type="number"
                        value={item.unitPrice}
                        onChange={(event) => setLine(item.id, { unitPrice: Number(event.target.value) })}
                      />
                      <span className="px-1 text-sm text-[color:var(--color-text-secondary)] sm:text-right">
                        {money(item.quantity * item.unitPrice, currency)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeLine(item.id)}
                        aria-label="Remove line item"
                        className="justify-self-end rounded-lg p-1.5 text-[color:var(--color-text-secondary)] transition hover:bg-[var(--color-error-fill-15)] hover:text-[color:var(--color-error-text-300)]"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button type="button" className="btn-secondary" onClick={addLine}>
                    <Plus size={16} />
                    Add Line Item
                  </button>
                </div>
              </section>

              {/* Totals */}
              <section className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[color:var(--color-text-muted)]">Subtotal</span>
                  <span className="font-medium text-[color:var(--color-text-secondary)]">{money(computed.subtotal, currency)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[color:var(--color-text-muted)]">Tax Rate (%)</span>
                  <input
                    className="field max-w-[100px] text-right"
                    type="number"
                    value={taxRate}
                    placeholder="0"
                    onChange={(event) => setTaxRate(event.target.value)}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[color:var(--color-text-muted)]">Tax Amount</span>
                  <span className="font-medium text-[color:var(--color-text-secondary)]">
                    {money(computed.taxAmount ?? 0, currency)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-[color:var(--color-border-weak)] pt-2 text-base">
                  <span className="font-semibold text-[color:var(--color-text-primary)]">Total</span>
                  <span className="font-semibold text-[color:var(--color-text-primary)]">{money(computed.total, currency)}</span>
                </div>
              </section>

              {/* Notes */}
              <section className="space-y-3">
                <div>
                  <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Client-Facing Notes</span>
                  <textarea
                    className="field min-h-[72px]"
                    value={clientFacingNotes}
                    onChange={(event) => setClientFacingNotes(event.target.value)}
                    placeholder="Payment terms: net 30"
                  />
                </div>
                <div>
                  <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Internal Notes</span>
                  <textarea
                    className="field min-h-[72px]"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Internal notes, not visible to client"
                  />
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-[color:var(--color-border-weak)] pt-4">
          {preview ? (
            <>
              <button type="button" className="btn-secondary" onClick={copyAsHtml}>
                Copy as HTML
              </button>
              {canEdit && savedInvoice?.status === 'Sent' ? (
                <>
                  <button type="button" className="btn-secondary" onClick={() => setVoidOpen(true)}>
                    Void Invoice
                  </button>
                  <button type="button" className="btn-primary" onClick={() => setPayOpen(true)}>
                    Mark as Paid
                  </button>
                </>
              ) : null}
              <button type="button" className="btn-secondary" onClick={onClose}>
                Close
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="btn-secondary" onClick={() => void saveDraft()} disabled={saving}>
                Save Draft
              </button>
              <button type="button" className="btn-primary" onClick={() => void markSent()} disabled={saving}>
                Mark as Sent
              </button>
            </>
          )}
        </div>
      </div>

      {payOpen ? (
        <MarkPaidModal currency={currency} onCancel={() => setPayOpen(false)} onConfirm={markPaid} />
      ) : null}
      {voidOpen ? (
        <VoidModal onCancel={() => setVoidOpen(false)} onConfirm={voidInvoice} />
      ) : null}
    </div>
  );
};

const LabeledDate = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <label className="block">
    <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">{label}</span>
    <input className="field" type="date" value={value} onChange={(event) => onChange(event.target.value)} />
  </label>
);

const PreviewBody = ({
  invoice,
  clientName,
  contact,
  currency,
}: {
  invoice: Invoice;
  clientName: string;
  contact?: Contact;
  currency: string;
}) => (
  <div className="space-y-6 text-sm">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-lg font-semibold text-[color:var(--color-text-primary)]">{ISSUER_NAME}</p>
        <p className="text-xs text-[color:var(--color-text-muted)]">Invoice</p>
      </div>
      <div className="text-right">
        <p className="font-semibold text-[color:var(--color-text-primary)]">{invoice.invoiceNumber}</p>
        <p className="text-xs text-[color:var(--color-text-muted)]">Issued {formatShortDate(invoice.issueDate)}</p>
        <p className="text-xs text-[color:var(--color-text-muted)]">Due {formatShortDate(invoice.dueDate)}</p>
      </div>
    </div>

    <div>
      <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--color-text-muted)]">Bill To</p>
      <p className="mt-1 font-medium text-[color:var(--color-text-secondary)]">{clientName}</p>
      {contact ? (
        <p className="text-[color:var(--color-text-muted)]">
          {contact.firstName} {contact.lastName}
          {contact.email ? ` · ${contact.email}` : ''}
        </p>
      ) : null}
      <p className="mt-2 text-[color:var(--color-text-muted)]">
        Period: {formatShortDate(invoice.periodStart)} – {formatShortDate(invoice.periodEnd)}
      </p>
    </div>

    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-[color:var(--color-border-weak)] text-xs uppercase tracking-wide text-[color:var(--color-text-muted)]">
          <th className="py-2 text-left font-semibold">Description</th>
          <th className="py-2 text-right font-semibold">Qty</th>
          <th className="py-2 text-right font-semibold">Unit Price</th>
          <th className="py-2 text-right font-semibold">Amount</th>
        </tr>
      </thead>
      <tbody>
        {invoice.lineItems.map((item) => (
          <tr key={item.id} className="border-b border-[color:var(--color-border-weak)]">
            <td className="py-2 text-[color:var(--color-text-secondary)]">{item.description}</td>
            <td className="py-2 text-right text-[color:var(--color-text-secondary)]">{item.quantity}</td>
            <td className="py-2 text-right text-[color:var(--color-text-secondary)]">{money(item.unitPrice, currency)}</td>
            <td className="py-2 text-right text-[color:var(--color-text-secondary)]">{money(item.amount, currency)}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <div className="ml-auto max-w-xs space-y-1">
      <div className="flex justify-between">
        <span className="text-[color:var(--color-text-muted)]">Subtotal</span>
        <span className="text-[color:var(--color-text-secondary)]">{money(invoice.subtotal, currency)}</span>
      </div>
      {invoice.taxAmount !== undefined && invoice.taxAmount > 0 ? (
        <div className="flex justify-between">
          <span className="text-[color:var(--color-text-muted)]">Tax ({invoice.taxRate}%)</span>
          <span className="text-[color:var(--color-text-secondary)]">{money(invoice.taxAmount, currency)}</span>
        </div>
      ) : null}
      <div className="flex justify-between border-t border-[color:var(--color-border-weak)] pt-1 text-base font-semibold text-[color:var(--color-text-primary)]">
        <span>Total</span>
        <span>{money(invoice.total, currency)}</span>
      </div>
    </div>

    {invoice.clientFacingNotes ? (
      <p className="whitespace-pre-wrap text-[color:var(--color-text-secondary)]">{invoice.clientFacingNotes}</p>
    ) : null}

    {invoice.status === 'Paid' && invoice.paidAt ? (
      <p className="text-xs text-[color:var(--color-success-text-300)]">
        Paid on {formatShortDate(invoice.paidAt)}
        {invoice.paidByNameSnapshot ? ` by ${invoice.paidByNameSnapshot}` : ''}
        {invoice.paymentMethod ? `, method: ${invoice.paymentMethod}` : ''}
      </p>
    ) : invoice.status === 'Void' && invoice.voidedAt ? (
      <p className="text-xs text-[color:var(--color-text-muted)]">
        Voided on {formatShortDate(invoice.voidedAt)}
        {invoice.voidReason ? ` — ${invoice.voidReason}` : ''}
      </p>
    ) : invoice.status === 'Sent' && invoice.sentAt ? (
      <p className="text-xs text-[color:var(--color-text-muted)]">
        Sent on {formatShortDate(invoice.sentAt)}
        {invoice.sentByNameSnapshot ? ` by ${invoice.sentByNameSnapshot}` : ''}
      </p>
    ) : null}
  </div>
);

const MarkPaidModal = ({
  currency,
  onCancel,
  onConfirm,
}: {
  currency: string;
  onCancel: () => void;
  onConfirm: (method: string, reference: string) => void;
}) => {
  void currency;
  const [method, setMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [reference, setReference] = useState('');
  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-[var(--color-overlay-65)] px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="surface w-full max-w-sm border-[color:var(--color-accent-30)] p-6 shadow-[var(--shadow-glow-44-18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-[color:var(--color-text-primary)]">Mark as Paid</h2>
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Payment Method</span>
            <select className="field" value={method} onChange={(event) => setMethod(event.target.value)}>
              {PAYMENT_METHODS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[color:var(--color-text-secondary)]">Payment Reference</span>
            <input
              className="field"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Transaction ID / check #"
            />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={() => onConfirm(method, reference)}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

const VoidModal = ({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: (reason: string) => void }) => {
  const [reason, setReason] = useState('');
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[var(--color-overlay-65)] px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Void invoice"
      onClick={onCancel}
    >
      <div
        className="surface w-full max-w-md border-[color:var(--color-accent-30)] p-6 shadow-[var(--shadow-glow-44-18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-[color:var(--color-text-primary)]">Void invoice?</h2>
        <p className="mt-2 text-sm leading-6 text-[color:var(--color-text-secondary)]">
          Voiding locks this invoice permanently. Add a reason below.
        </p>
        <textarea
          className="field mt-3 min-h-[72px]"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Reason for voiding…"
        />
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!reason.trim()}
            onClick={() => onConfirm(reason.trim())}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-error-solid)] px-4 py-2.5 text-sm font-semibold text-[color:var(--color-text-primary)] transition hover:bg-[var(--color-error-solid-500)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-error-ring-40)] disabled:opacity-50"
          >
            Void Invoice
          </button>
        </div>
      </div>
    </div>
  );
};
