import { ArrowLeft, ArrowRight, Lock, Mail, ShieldCheck } from 'lucide-react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, isFirebaseConfigured } from '../services/firebase';
import { firestoreService } from '../services/firestoreService';

export const DeveloperLoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!isFirebaseConfigured || !auth) {
      setError('Developer login requires Firebase configuration.');
      return;
    }

    setSubmitting(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      debugDeveloperAuth('Firebase Auth login accepted', { uid: credential.user.uid });
      const developer = await firestoreService.getCurrentDeveloperProfile(credential.user.uid);
      debugDeveloperAuth('Developer profile authorization result', { authorized: Boolean(developer) });
      if (!developer) {
        await signOut(auth);
        setError('This account is not authorized for MotoFlexing developer access.');
        return;
      }

      await firestoreService.updateDeveloperLastLogin(credential.user.uid);
      navigate('/developer');
    } catch (error) {
      debugDeveloperAuth('Developer login failed', getFirebaseDebugError(error));
      setError(error instanceof Error ? error.message : 'Unable to sign in as developer.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] px-4 py-10 text-[color:var(--color-text-primary)]">
      <div className="pointer-events-none absolute -left-28 -top-28 h-96 w-96 rounded-full bg-[var(--color-accent-20)] blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-28 left-0 h-80 w-80 rounded-full bg-red-900/20 blur-[120px]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_70%_20%,rgba(226,232,240,0.10),transparent_28rem)]" />

      <button
        type="button"
        onClick={() => navigate('/login')}
        className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-lg border border-[color:var(--color-border-weak)] bg-[var(--color-overlay-35)] px-3 py-2 text-xs font-semibold text-[color:var(--color-text-secondary)] shadow-[0_0_28px_rgba(0,0,0,0.35)] backdrop-blur transition hover:border-[color:var(--color-border-strong)] hover:bg-[var(--color-fill-06)] hover:text-[color:var(--color-text-primary)] md:left-6 md:top-6"
      >
        <ArrowLeft size={15} />
        Back to OfficeOS Login
      </button>

      <section className="relative mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_420px]">
        <div className="flex min-h-[520px] flex-col justify-center">
          <div className="inline-flex w-fit items-center gap-4">
            <MFLogo size="large" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-text-secondary)]">MotoFlexing</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-normal text-[color:var(--color-text-primary)] md:text-5xl">Developer Access</h1>
            </div>
          </div>
          <p className="mt-7 max-w-xl text-base leading-7 text-[color:var(--color-text-secondary)]">
            A separate control layer for reviewing OfficeOS feedback, module health, and future platform improvements.
          </p>
          <div className="mt-9 grid max-w-xl gap-3 sm:grid-cols-3">
            {['Feedback', 'Security', 'Platform'].map((item) => (
              <div key={item} className="rounded-lg border border-[color:var(--color-border-weak)] bg-[var(--color-fill-035)] px-4 py-3 backdrop-blur">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--color-text-muted)]">{item}</p>
                <div className="mt-3 h-px bg-gradient-to-r from-[var(--color-accent-70)] via-white/20 to-transparent" />
              </div>
            ))}
          </div>
        </div>

        <form
          onSubmit={submit}
          className="rounded-xl border border-[color:var(--color-line-12)] bg-[var(--color-fill-045)] p-6 shadow-[var(--shadow-modal-glow)] backdrop-blur-xl md:p-8"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-accent)]">Secure Access Only</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-normal text-[color:var(--color-text-primary)]">Developer Login</h2>
              <p className="mt-2 text-sm leading-6 text-[color:var(--color-text-secondary)]">
                Access the MotoFlexing developer control panel.
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--color-line-15)] bg-[var(--color-overlay-35)] text-[color:var(--color-text-soft)]">
              <ShieldCheck size={20} />
            </div>
          </div>

          <div className="mt-7 grid gap-4">
            <DeveloperField
              icon={Mail}
              label="Email"
              placeholder="Developer Email"
              type="email"
              value={email}
              onChange={setEmail}
            />
            <DeveloperField
              icon={Lock}
              label="Password"
              placeholder="Password"
              type="password"
              value={password}
              onChange={setPassword}
            />
          </div>

          {error ? (
            <p className="mt-4 rounded-lg border border-[color:var(--color-error-line-25)] bg-[var(--color-error-fill-10)] px-4 py-3 text-sm text-[color:var(--color-error-text-200)]">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-slate-100 to-slate-400 px-4 py-3 text-sm font-bold text-black shadow-[0_0_34px_rgba(226,232,240,0.16)] transition hover:from-white hover:to-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting}
          >
            {submitting ? 'Checking access...' : 'Login'}
            <ArrowRight size={18} />
          </button>

          <p className="mt-6 text-center text-xs font-medium text-[color:var(--color-text-muted)]">Secure Access Only</p>
        </form>
      </section>
    </main>
  );
};

const DeveloperField = ({
  icon: Icon,
  label,
  onChange,
  placeholder,
  type,
  value,
}: {
  icon: typeof Mail;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  type: string;
  value: string;
}) => (
  <label>
    <span className="sr-only">{label}</span>
    <div className="flex items-center gap-3 rounded-lg border border-[color:var(--color-line-15)] bg-[var(--color-overlay-35)] px-4 py-3 text-[color:var(--color-text-secondary)] transition focus-within:border-[color:var(--color-accent-45)] focus-within:ring-2 focus-within:ring-[var(--color-accent-15)]">
      <Icon size={18} className="text-[color:var(--color-text-secondary)]" />
      <input
        className="w-full bg-transparent text-sm text-[color:var(--color-text-bright)] outline-none placeholder:text-[color:var(--color-text-muted)]"
        placeholder={placeholder}
        required
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  </label>
);

const MFLogo = ({ size = 'small' }: { size?: 'small' | 'large' }) => (
  <div
    className={`font-black italic tracking-[-0.08em] ${
      size === 'large' ? 'text-6xl md:text-7xl' : 'text-2xl'
    } drop-shadow-[var(--shadow-glow-22-25)]`}
  >
    <span className="text-[color:var(--color-accent)]">M</span>
    <span className="bg-gradient-to-br from-white via-slate-200 to-slate-500 bg-clip-text text-transparent">F</span>
  </div>
);

const debugDeveloperAuth = (message: string, data?: unknown) => {
  if (import.meta.env.DEV) {
    console.info(`[DeveloperAuth] ${message}`, data ?? '');
  }
};

const getFirebaseDebugError = (error: unknown) => {
  if (typeof error === 'object' && error) {
    return {
      code: 'code' in error ? (error as { code?: string }).code : undefined,
      message: 'message' in error ? (error as { message?: string }).message : undefined,
    };
  }

  return { message: String(error) };
};
