export const formatDate = (date = new Date()) =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);

export const formatShortDate = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));

export const formatTime = (date = new Date()) =>
  new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);

const DAY_MS = 24 * 60 * 60 * 1000;

// Relative timestamp for activity entries: "2h ago", "Yesterday", or a short date.
export const formatRelativeTime = (value: string) => {
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return '—';
  const diffMs = Date.now() - then.getTime();
  if (diffMs < 0) return formatShortDate(value);
  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return formatShortDate(value);
};

// Relative deadline for deal cards: "overdue", "today", "in 5 days", "next week", or a short date.
export const formatRelativeDeadline = (value: string) => {
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return '—';
  // Compare on calendar-day boundaries so "today" isn't affected by the time of day.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTarget = new Date(target);
  startOfTarget.setHours(0, 0, 0, 0);
  const days = Math.round((startOfTarget.getTime() - startOfToday.getTime()) / DAY_MS);

  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days < 7) return `in ${days} days`;
  if (days < 14) return 'next week';
  return formatShortDate(value);
};
