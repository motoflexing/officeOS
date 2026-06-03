import { ArrowRight, BriefcaseBusiness, ShieldCheck, UserRound } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BRANDING } from '../config/branding';
import { demoCredentials } from '../data/mockData';
import { isFirebaseConfigured } from '../services/firebase';
import { useAuth } from '../state/AuthContext';
import type { Role } from '../types';

const roles: Array<{ role: Role; label: string; icon: typeof ShieldCheck; copy: string }> = [
  { role: 'Admin', label: 'Admin', icon: ShieldCheck, copy: 'Full company control and settings' },
  { role: 'HR', label: 'HR', icon: BriefcaseBusiness, copy: 'People, attendance, and leave workflows' },
  { role: 'Employee', label: 'Employee', icon: UserRound, copy: 'Daily work, reports, and announcements' },
];

export const LoginPage = () => {
  const [selectedRole, setSelectedRole] = useState<Role>('Admin');
  const [email, setEmail] = useState<string>(demoCredentials.Admin.email);
  const [password, setPassword] = useState<string>(demoCredentials.Admin.password);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const chooseRole = (role: Role) => {
    setSelectedRole(role);
    setEmail(demoCredentials[role].email);
    setPassword(demoCredentials[role].password);
    setError('');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (!isFirebaseConfigured) {
        const demo = demoCredentials[selectedRole];
        if (email !== demo.email || password !== demo.password) {
          setError('Use the selected role demo credentials to continue.');
          return;
        }
      }

      await login(selectedRole, email, password);
      navigate('/dashboard');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="grid w-full max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-black/55 p-8 shadow-glow backdrop-blur">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-accent-500 to-red-900 font-bold text-white shadow-[0_0_28px_rgba(239,35,43,0.28)]">
              GH
            </div>
            <h1 className="mt-8 text-4xl font-semibold tracking-normal text-white">{BRANDING.workspaceName}</h1>
            <p className="mt-3 text-lg text-slate-400">{BRANDING.tagline}</p>
          </div>

          <div className="mt-12 grid gap-3">
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm font-semibold text-white">
                {isFirebaseConfigured ? 'Firebase access' : 'Demo access'}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {isFirebaseConfigured
                  ? 'Use a Firebase Auth user with a matching workspace profile.'
                  : 'Select a role to load matching credentials.'}
              </p>
            </div>
            <div className="rounded-lg border border-accent-500/20 bg-gradient-to-br from-accent-500/12 to-black/10 p-4 text-sm text-accent-100">
              {BRANDING.productName} is prepared behind the{' '}
              {isFirebaseConfigured ? 'Firebase backend.' : 'local prototype data layer.'}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="surface p-6 md:p-8">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent-500">Secure workspace</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Sign in to your company portal</h2>
          </div>

          <div className="mt-7 grid gap-3 md:grid-cols-3">
            {roles.map((item) => (
              <button
                key={item.role}
                type="button"
                onClick={() => chooseRole(item.role)}
                className={`rounded-xl border p-4 text-left transition hover:-translate-y-0.5 ${
                  selectedRole === item.role
                    ? 'border-accent-500 bg-accent-500/12 shadow-[0_0_30px_rgba(239,35,43,0.18)]'
                    : 'border-white/10 bg-black/25 hover:border-accent-500/35 hover:bg-accent-500/[0.06]'
                }`}
              >
                <item.icon className={selectedRole === item.role ? 'text-accent-500' : 'text-slate-400'} size={22} />
                <p className="mt-4 font-semibold text-white">{item.label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{item.copy}</p>
              </button>
            ))}
          </div>

          <div className="mt-7 grid gap-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Email</span>
              <input className="field" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Password</span>
              <input
                className="field"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
          </div>

          {error ? (
            <p className="mt-4 rounded-lg border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </p>
          ) : null}

          <button type="submit" className="btn-primary mt-7 w-full" disabled={submitting}>
            {submitting ? 'Signing in...' : `Login as ${selectedRole}`}
            <ArrowRight size={18} />
          </button>
        </form>
      </section>
    </main>
  );
};
