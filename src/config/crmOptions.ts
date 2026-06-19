import type {
  BillingCycle,
  ClientStatus,
  CoverageHours,
  DealStage,
  HelpdeskTool,
  Industry,
  Invoice,
  InvoiceStatus,
  SubscriptionStatus,
  SupportChannel,
} from '../types';

// Single source of truth for CRM dropdown options, so list filters and modals
// stay in sync. Mirrors the string-literal unions in types.ts.
export const CLIENT_STATUSES: ClientStatus[] = ['Prospect', 'Onboarding', 'Active', 'Paused', 'Churned'];
export const INDUSTRIES: Industry[] = ['eCommerce', 'SaaS', 'D2C', 'Marketplace', 'Services', 'Other'];
export const HELPDESK_TOOLS: HelpdeskTool[] = ['Zendesk', 'Gorgias', 'Intercom', 'Freshdesk', 'HubSpot', 'Other', 'None'];
export const DEAL_STAGES: DealStage[] = [
  'Lead',
  'Consultation Booked',
  'Proposal Sent',
  'Negotiation',
  'Won',
  'Lost',
];

// Stages that count as "open" (not yet closed) for pipeline value + open-deal counts.
export const OPEN_DEAL_STAGES: DealStage[] = ['Lead', 'Consultation Booked', 'Proposal Sent', 'Negotiation'];
export const isOpenDeal = (stage: DealStage) => OPEN_DEAL_STAGES.includes(stage);

// Suggested defaults the admin can one-click create when no plans exist yet.
export const DEFAULT_PLAN_SUGGESTIONS = [
  { name: 'Starter', monthlyPrice: 499, description: 'Entry tier for small teams.', sortOrder: 1 },
  { name: 'Growth', monthlyPrice: 999, description: 'For scaling support operations.', sortOrder: 2 },
  { name: 'Scale', monthlyPrice: 1999, description: 'High-volume, multi-channel coverage.', sortOrder: 3 },
  { name: 'Custom', description: 'Bespoke scope and pricing.', sortOrder: 4 },
];

// ── Subscriptions (Phase 2) ──────────────────────────────────────────────
export const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = ['Onboarding', 'Active', 'Paused', 'Cancelled', 'Renewed'];
export const COVERAGE_HOURS: CoverageHours[] = [8, 12, 16, 24];
export const BILLING_CYCLES: BillingCycle[] = ['Monthly', 'Quarterly', 'Annual'];
export const SUPPORT_CHANNELS: SupportChannel[] = ['Email', 'Chat', 'Phone', 'Social'];

// Days added to startDate to compute renewalDate, per billing cycle.
const BILLING_CYCLE_DAYS: Record<BillingCycle, number> = { Monthly: 30, Quarterly: 90, Annual: 365 };

// renewalDate = startDate + cycle days, returned as an ISO date (YYYY-MM-DD).
export const renewalDateFor = (startDate: string, cycle: BillingCycle): string | undefined => {
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return undefined;
  start.setDate(start.getDate() + BILLING_CYCLE_DAYS[cycle]);
  return start.toISOString().slice(0, 10);
};

// ── Invoices (Phase 5) ───────────────────────────────────────────────────
export const INVOICE_STATUSES: InvoiceStatus[] = ['Draft', 'Sent', 'Paid', 'Void'];
// Status options for the invoices filter, including the computed 'Overdue' bucket.
export const INVOICE_FILTER_STATUSES: (InvoiceStatus | 'Overdue')[] = ['Draft', 'Sent', 'Overdue', 'Paid', 'Void'];
export const PAYMENT_METHODS = ['Wire', 'Stripe', 'Check', 'Other'] as const;

// 'Overdue' is never stored — a Sent invoice past its dueDate is effectively overdue.
// Use this everywhere the UI displays or filters by status.
export const getEffectiveStatus = (invoice: Invoice, today: Date = new Date()): InvoiceStatus | 'Overdue' => {
  if (invoice.status === 'Sent' && new Date(invoice.dueDate) < today) return 'Overdue';
  return invoice.status;
};
