import { FormEvent, useEffect, useState } from 'react';
import { AlertTriangle, Bug, Lightbulb, MessageSquare, Send, Sparkles } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { Toast } from '../components/Toast';
import { auth } from '../services/firebase';
import { companyId, isFirebaseConfigured } from '../services/firebase';
import { firestoreService } from '../services/firestoreService';
import { useAuth } from '../state/AuthContext';
import type { FeedbackInput, FeedbackItem, FeedbackModule, FeedbackPriority, FeedbackStatus, FeedbackType } from '../types';

const feedbackTypes: FeedbackType[] = ['Bug', 'Feature Request', 'UI/UX Improvement', 'Workflow Issue', 'Other'];
const feedbackModules: FeedbackModule[] = [
  'Dashboard',
  'Attendance',
  'Employees',
  'Leave',
  'Reports',
  'Announcements',
  'Settings',
  'Login/Auth',
  'Profile',
  'Developer Panel',
  'Other',
];
const feedbackPriorities: FeedbackPriority[] = ['Low', 'Medium', 'High', 'Critical'];

const initialForm = {
  type: 'Bug' as FeedbackType,
  relatedModule: 'Dashboard' as FeedbackModule,
  priority: 'Medium' as FeedbackPriority,
  title: '',
  description: '',
};

export const FeedbackPage = () => {
  const { profile } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const currentUid = auth?.currentUser?.uid;

  useEffect(() => {
    if (!isFirebaseConfigured || !currentUid) {
      setLoading(false);
      return;
    }

    firestoreService
      .getMyFeedback(companyId, currentUid)
      .then((items) => setFeedback(items))
      .catch((error) => setError(getFeedbackError(error, 'Unable to load your submitted feedback.')))
      .finally(() => setLoading(false));
  }, [currentUid]);

  if (!profile) return null;

  const submitFeedback = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setToast('');

    const nextValidationError = validateFeedbackForm(form);
    if (nextValidationError) {
      setError(nextValidationError);
      return;
    }

    if (!isFirebaseConfigured || !currentUid) {
      setError('Feedback submission requires a signed-in Firebase account.');
      return;
    }

    const feedbackInput: FeedbackInput = {
      type: form.type,
      relatedModule: form.relatedModule,
      priority: form.priority,
      title: form.title.trim(),
      description: form.description.trim(),
      submittedByUid: currentUid,
      submittedByName: profile.name,
      submittedByEmail: profile.email,
      submittedByRole: profile.role,
    };

    setSubmitting(true);
    try {
      const created = await firestoreService.submitFeedback(companyId, feedbackInput);
      setFeedback((items) => [created, ...items]);
      setForm(initialForm);
      setToast('Feedback submitted successfully. Thank you for helping improve OfficeOS.');
      window.setTimeout(() => setToast(''), 3200);
    } catch (error) {
      setError(getFeedbackError(error, 'Unable to submit feedback.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast} /> : null}
      <PageHeader
        eyebrow="Feedback"
        title="Feedback"
        subtitle="Report bugs, request improvements, or suggest changes for OfficeOS."
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={submitFeedback} className="surface p-5 md:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-accent-500/25 bg-accent-500/10 text-accent-100">
              <MessageSquare size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Submit OfficeOS Feedback</h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Send bugs, workflow friction, and product ideas directly to MotoFlexing.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <FeedbackSelect
              label="Type"
              value={form.type}
              options={feedbackTypes}
              onChange={(value) => setForm({ ...form, type: value })}
            />
            <FeedbackSelect
              label="Related Module"
              value={form.relatedModule}
              options={feedbackModules}
              onChange={(value) => setForm({ ...form, relatedModule: value })}
            />
            <FeedbackSelect
              label="Priority"
              value={form.priority}
              options={feedbackPriorities}
              onChange={(value) => setForm({ ...form, priority: value })}
            />
          </div>

          <div className="mt-4 grid gap-4">
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-300">Title</span>
              <input
                className="field"
                minLength={3}
                required
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="Short summary"
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-300">Description</span>
              <textarea
                className="field min-h-36 resize-y"
                minLength={10}
                required
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Describe what happened, what you expected, or what would improve the workflow."
              />
            </label>
          </div>

          {error ? (
            <p className="mt-4 rounded-lg border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </p>
          ) : null}

          <button type="submit" className="btn-primary mt-5" disabled={submitting}>
            <Send size={18} />
            {submitting ? 'Submitting Feedback...' : 'Submit Feedback'}
          </button>
        </form>

        <aside className="surface h-fit p-5">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent-500">What to send</p>
          <div className="mt-4 space-y-4">
            <GuidanceItem
              icon={Bug}
              title="Bugs"
              description="Broken buttons, incorrect data, loading problems, or permission issues."
            />
            <GuidanceItem
              icon={Lightbulb}
              title="Improvements"
              description="Ideas that make HR, attendance, reporting, or daily work smoother."
            />
            <GuidanceItem
              icon={AlertTriangle}
              title="Priority"
              description="Use High or Critical only when work is blocked or demo confidence is affected."
            />
          </div>
        </aside>
      </section>

      <section className="surface overflow-hidden">
        <div className="border-b border-white/10 p-5">
          <h2 className="text-xl font-semibold text-white">My Submitted Feedback</h2>
          <p className="mt-1 text-sm text-slate-400">Track the items you have sent to MotoFlexing.</p>
        </div>

        {loading ? (
          <EmptyState icon={Sparkles} title="Loading feedback" description="Fetching your submitted feedback." />
        ) : feedback.length === 0 ? (
          <EmptyState icon={MessageSquare} title="No feedback submitted yet." description="Your feedback history will appear here." />
        ) : (
          <div className="max-w-full overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="border-b border-white/10 bg-black/20 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Module</th>
                  <th className="px-4 py-3 font-semibold">Priority</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {feedback.map((item) => (
                  <tr key={item.path || item.id} className="transition hover:bg-white/[0.035]">
                    <td className="max-w-xs px-4 py-4">
                      <p className="truncate font-medium text-white">{item.title}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-slate-500">{item.description}</p>
                    </td>
                    <td className="px-4 py-4">
                      <FeedbackBadge tone="type">{item.type}</FeedbackBadge>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-300">{item.relatedModule}</td>
                    <td className="px-4 py-4">
                      <FeedbackBadge tone={priorityTone(item.priority)}>{item.priority}</FeedbackBadge>
                    </td>
                    <td className="px-4 py-4">
                      <FeedbackBadge tone={statusTone(item.status)}>{item.status}</FeedbackBadge>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-400">{formatDate(item.createdAt)}</td>
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

const FeedbackSelect = <Value extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: Value) => void;
  options: Value[];
  value: Value;
}) => (
  <label>
    <span className="mb-2 block text-sm font-medium text-slate-300">{label}</span>
    <select className="field" required value={value} onChange={(event) => onChange(event.target.value as Value)}>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </label>
);

const GuidanceItem = ({
  description,
  icon: Icon,
  title,
}: {
  description: string;
  icon: typeof Bug;
  title: string;
}) => (
  <div className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-4">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-500/10 text-accent-100">
      <Icon size={18} />
    </div>
    <div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  </div>
);

const FeedbackBadge = ({ children, tone }: { children: React.ReactNode; tone: BadgeTone }) => (
  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClass(tone)}`}>
    {children}
  </span>
);

type BadgeTone = 'type' | 'low' | 'medium' | 'high' | 'critical' | 'new' | 'reviewed' | 'planned' | 'progress' | 'fixed' | 'rejected';

const priorityTone = (priority: FeedbackPriority): BadgeTone => {
  if (priority === 'Critical') return 'critical';
  if (priority === 'High') return 'high';
  if (priority === 'Medium') return 'medium';
  return 'low';
};

const statusTone = (status: FeedbackStatus): BadgeTone => {
  if (status === 'Reviewed') return 'reviewed';
  if (status === 'Planned') return 'planned';
  if (status === 'In Progress') return 'progress';
  if (status === 'Fixed') return 'fixed';
  if (status === 'Rejected') return 'rejected';
  return 'new';
};

const badgeClass = (tone: BadgeTone) => {
  if (tone === 'critical') return 'border-red-400/30 bg-red-500/10 text-red-200';
  if (tone === 'high') return 'border-accent-400/30 bg-accent-500/10 text-accent-100';
  if (tone === 'medium') return 'border-orange-400/25 bg-orange-500/10 text-orange-200';
  if (tone === 'low') return 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200';
  if (tone === 'reviewed') return 'border-sky-400/25 bg-sky-500/10 text-sky-200';
  if (tone === 'planned') return 'border-violet-400/25 bg-violet-500/10 text-violet-200';
  if (tone === 'progress') return 'border-blue-400/25 bg-blue-500/10 text-blue-200';
  if (tone === 'fixed') return 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200';
  if (tone === 'rejected') return 'border-slate-400/25 bg-slate-500/10 text-slate-300';
  if (tone === 'new') return 'border-white/15 bg-white/[0.055] text-slate-200';
  return 'border-accent-400/25 bg-accent-500/10 text-accent-100';
};

const validateFeedbackForm = (form: typeof initialForm) => {
  if (!form.type) return 'Type is required.';
  if (!form.relatedModule) return 'Related module is required.';
  if (!form.priority) return 'Priority is required.';
  if (form.title.trim().length < 3) return 'Title must be at least 3 characters.';
  if (form.description.trim().length < 10) return 'Description must be at least 10 characters.';
  return '';
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || 'Not available';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

const getFeedbackError = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'code' in error) {
    const code = (error as { code?: string }).code;
    if (code === 'permission-denied') {
      return 'Feedback could not be saved. Please check permissions or Firestore rules.';
    }
    if (code === 'failed-precondition') {
      return 'Feedback history needs a Firestore index before it can be loaded.';
    }
  }

  return error instanceof Error ? error.message : fallback;
};
