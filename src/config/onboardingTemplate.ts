// Default onboarding checklist seeded into every new subscription (Phase 2C).
// Bump the version when the default set changes so existing checklists are traceable.
export const DEFAULT_ONBOARDING_TEMPLATE_VERSION = 1;

export const DEFAULT_CHECKLIST_ITEMS = [
  { label: 'NDA signed by client', sortOrder: 1 },
  { label: 'DPA signed by client', sortOrder: 2 },
  { label: 'Helpdesk tool access granted', sortOrder: 3 },
  { label: 'SOPs documented', sortOrder: 4 },
  { label: 'Brand voice guide reviewed', sortOrder: 5 },
  { label: 'Agents trained on client SOPs', sortOrder: 6 },
  { label: 'Test tickets handled', sortOrder: 7 },
  { label: 'Go-live announcement', sortOrder: 8 },
  { label: 'First weekly report sent', sortOrder: 9 },
];
