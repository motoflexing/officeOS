import { DollarSign, Receipt, TrendingUp, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { InvoiceStatusPill } from '../components/InvoiceStatusPill';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { getEffectiveStatus } from '../config/crmOptions';
import { companyId, isFirebaseConfigured } from '../services/firebase';
import { firestoreService } from '../services/firestoreService';
import { storage } from '../services/storage';
import type { Client, Invoice, Subscription } from '../types';
import { formatShortDate } from '../utils/format';

// One indirection so call sites are identical in Firebase and localStorage modes.
const crm = isFirebaseConfigured ? firestoreService : storage;

const money = (value: number) =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const moneyCents = (value: number) =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const DAY_MS = 24 * 60 * 60 * 1000;
const daysOverdue = (dueDate: string, today: Date) =>
  Math.max(0, Math.floor((today.getTime() - new Date(dueDate).getTime()) / DAY_MS));

export const FinancePage = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // All three live streams compose on existing queries — no new collection-group query
  // is introduced here (invoices CG + subscriptions CG are both from earlier phases).
  useEffect(() => {
    const unsubInvoices = crm.subscribeToAllInvoices(companyId, (next) => {
      setInvoices(next);
      setLoading(false);
    });
    const unsubSubs = crm.subscribeToAllSubscriptions(companyId, setSubscriptions);
    const unsubClients = crm.subscribeToClients(companyId, setClients);
    return () => {
      unsubInvoices();
      unsubSubs();
      unsubClients();
    };
  }, []);

  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    clients.forEach((client) => map.set(client.id, client.companyName));
    return map;
  }, [clients]);

  const subLabelById = useMemo(() => {
    const map = new Map<string, string>();
    subscriptions.forEach((sub) => map.set(sub.id, sub.teamLabel));
    return map;
  }, [subscriptions]);

  // Snapshot "now" once per render pass so all status/overdue math is consistent.
  const today = useMemo(() => new Date(), []);

  const kpis = useMemo(() => {
    const mrr = subscriptions
      .filter((sub) => sub.status === 'Active')
      .reduce((sum, sub) => sum + sub.mrr, 0);

    const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const paidThisMonth = invoices
      .filter((inv) => inv.status === 'Paid' && inv.paidAt && inv.paidAt.slice(0, 7) === monthKey)
      .reduce((sum, inv) => sum + inv.total, 0);

    const outstanding = invoices
      .filter((inv) => {
        const eff = getEffectiveStatus(inv, today);
        return eff === 'Sent' || eff === 'Overdue';
      })
      .reduce((sum, inv) => sum + inv.total, 0);

    return { mrr, arr: mrr * 12, paidThisMonth, outstanding };
  }, [subscriptions, invoices, today]);

  // Outstanding invoices: Sent or Overdue, sorted by dueDate ascending.
  const outstandingInvoices = useMemo(
    () =>
      invoices
        .filter((inv) => {
          const eff = getEffectiveStatus(inv, today);
          return eff === 'Sent' || eff === 'Overdue';
        })
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [invoices, today],
  );

  // Recent activity: last 20 invoices across all clients, by updatedAt desc.
  const recentInvoices = useMemo(
    () => [...invoices].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 20),
    [invoices],
  );

  const openInvoice = (invoice: Invoice) => {
    navigate(`/clients/${invoice.clientId}?tab=subscriptions&sub=${invoice.subscriptionId}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Revenue & Invoices"
        subtitle="Track recurring revenue and outstanding invoices."
      />

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="MRR" value={money(kpis.mrr)} icon={TrendingUp} caption="Active subscriptions" />
        <StatCard title="ARR" value={money(kpis.arr)} icon={DollarSign} caption="MRR × 12" />
        <StatCard title="Paid This Month" value={moneyCents(kpis.paidThisMonth)} icon={Wallet} caption="Invoices paid this calendar month" />
        <StatCard title="Outstanding" value={moneyCents(kpis.outstanding)} icon={Receipt} caption="Sent + Overdue invoices" />
      </div>

      {/* Outstanding Invoices */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-[color:var(--color-text-primary)]">Outstanding Invoices</h3>
        {loading ? (
          <EmptyState title="Loading invoices" description="Fetching invoices across all clients." />
        ) : outstandingInvoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No outstanding invoices"
            description="All sent invoices are paid. Nothing is currently outstanding."
          />
        ) : (
          <div className="surface overflow-x-auto p-0">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-[color:var(--color-border-weak)] text-xs uppercase tracking-wider text-[color:var(--color-text-muted)]">
                  <th className="px-4 py-3 font-medium">Invoice #</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Subscription</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium">Due Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Days Overdue</th>
                </tr>
              </thead>
              <tbody>
                {outstandingInvoices.map((invoice) => {
                  const eff = getEffectiveStatus(invoice, today);
                  return (
                    <tr
                      key={invoice.id}
                      onClick={() => openInvoice(invoice)}
                      className="cursor-pointer border-b border-[color:var(--color-line-05)] transition last:border-0 hover:bg-[var(--color-fill-04)]"
                    >
                      <td className="px-4 py-3 font-medium text-[color:var(--color-text-bright)]">{invoice.invoiceNumber}</td>
                      <td className="px-4 py-3 text-accent-400">{clientNameById.get(invoice.clientId) ?? '—'}</td>
                      <td className="px-4 py-3 text-[color:var(--color-text-secondary)]">
                        {subLabelById.get(invoice.subscriptionId) ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-[color:var(--color-text-secondary)]">{moneyCents(invoice.total)}</td>
                      <td className="px-4 py-3 text-[color:var(--color-text-secondary)]">{formatShortDate(invoice.dueDate)}</td>
                      <td className="px-4 py-3">
                        <InvoiceStatusPill status={eff} />
                      </td>
                      <td className="px-4 py-3 text-right text-[color:var(--color-text-secondary)]">
                        {eff === 'Overdue' ? daysOverdue(invoice.dueDate, today) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent Activity */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-[color:var(--color-text-primary)]">Recent Activity</h3>
        {loading ? (
          <EmptyState title="Loading activity" description="Fetching recent invoices." />
        ) : recentInvoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No invoices yet"
            description="Create an invoice from a subscription's Invoices tab to see activity here."
          />
        ) : (
          <div className="surface overflow-x-auto p-0">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-[color:var(--color-border-weak)] text-xs uppercase tracking-wider text-[color:var(--color-text-muted)]">
                  <th className="px-4 py-3 font-medium">Invoice #</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Subscription</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    onClick={() => openInvoice(invoice)}
                    className="cursor-pointer border-b border-[color:var(--color-line-05)] transition last:border-0 hover:bg-[var(--color-fill-04)]"
                  >
                    <td className="px-4 py-3 font-medium text-[color:var(--color-text-bright)]">{invoice.invoiceNumber}</td>
                    <td className="px-4 py-3 text-accent-400">{clientNameById.get(invoice.clientId) ?? '—'}</td>
                    <td className="px-4 py-3 text-[color:var(--color-text-secondary)]">
                      {subLabelById.get(invoice.subscriptionId) ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-[color:var(--color-text-secondary)]">{moneyCents(invoice.total)}</td>
                    <td className="px-4 py-3">
                      <InvoiceStatusPill status={getEffectiveStatus(invoice, today)} />
                    </td>
                    <td className="px-4 py-3 text-[color:var(--color-text-secondary)]">{formatShortDate(invoice.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
