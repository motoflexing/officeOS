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
      const developer = await firestoreService.getCurrentDeveloperProfile(credential.user.uid);
      if (!developer) {
        await signOut(auth);
        setError('This account is not authorized for MotoFlexing developer access.');
        return;
      }

      await firestoreService.updateDeveloperLastLogin(credential.user.uid);
      navigate('/developer');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to sign in as developer.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <form onSubmit={submit} className="surface w-full max-w-md p-6 md:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent-500">MotoFlexing</p>
        <h1 className="mt-3 text-2xl font-semibold text-white">Developer Login</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Developer accounts are managed separately from company Admin, HR, and Employee accounts.
        </p>

        <div className="mt-6 grid gap-4">
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-300">Email</span>
            <input className="field" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-300">Password</span>
            <input
              className="field"
              required
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

        <button type="submit" className="btn-primary mt-6 w-full" disabled={submitting}>
          {submitting ? 'Checking access...' : 'Sign in'}
        </button>
      </form>
    </main>
  );
};
