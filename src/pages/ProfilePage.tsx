import { FormEvent, useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { ProfileCard } from '../components/ProfileCard';
import { Toast } from '../components/Toast';
import { auth, isFirebaseConfigured } from '../services/firebase';
import { useAuth } from '../state/AuthContext';
import type { UserProfile } from '../types';

export const ProfilePage = () => {
  const { profile, updateProfile } = useAuth();
  const [toast, setToast] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  if (!profile) return null;

  const save = (nextProfile: UserProfile) => {
    updateProfile(nextProfile);
    setToast('Profile saved');
    window.setTimeout(() => setToast(''), 2200);
  };

  const updateAccountPassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordError('');

    if (!isFirebaseConfigured || !auth?.currentUser?.email) {
      setPasswordError('Password updates are available only for Firebase accounts.');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setPasswordError('Confirm new password must match.');
      return;
    }

    if (passwordForm.newPassword === passwordForm.currentPassword) {
      setPasswordError('New password must be different from current password.');
      return;
    }

    setPasswordSubmitting(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, passwordForm.currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      setToast('Password updated successfully.');
      window.setTimeout(() => setToast(''), 2200);
    } catch (error) {
      setPasswordError(getPasswordErrorMessage(error));
    } finally {
      setPasswordSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast} /> : null}
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent-500">Profile</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">My Profile</h2>
      </div>
      <ProfileCard profile={profile} onSave={save} />
      <form onSubmit={updateAccountPassword} className="surface max-w-4xl p-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent-500">Account Security</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Account Security</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Use a strong password and do not share it with anyone.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <PasswordField
            label="Current Password"
            value={passwordForm.currentPassword}
            onChange={(value) => setPasswordForm({ ...passwordForm, currentPassword: value })}
          />
          <PasswordField
            label="New Password"
            value={passwordForm.newPassword}
            onChange={(value) => setPasswordForm({ ...passwordForm, newPassword: value })}
          />
          <PasswordField
            label="Confirm New Password"
            value={passwordForm.confirmNewPassword}
            onChange={(value) => setPasswordForm({ ...passwordForm, confirmNewPassword: value })}
          />
        </div>

        {passwordError ? (
          <p className="mt-4 rounded-lg border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {passwordError}
          </p>
        ) : null}

        <button type="submit" className="btn-primary mt-5" disabled={passwordSubmitting}>
          {passwordSubmitting ? 'Updating Password...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
};

const PasswordField = ({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) => (
  <label>
    <span className="mb-2 block text-sm font-medium text-slate-300">{label}</span>
    <input className="field" required type="password" value={value} onChange={(event) => onChange(event.target.value)} />
  </label>
);

const getPasswordErrorMessage = (error: unknown) => {
  if (typeof error === 'object' && error && 'code' in error) {
    const code = (error as { code?: string }).code;
    if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      return 'Current password is incorrect.';
    }
    if (code === 'auth/requires-recent-login') {
      return 'Please sign in again before changing your password.';
    }
  }

  return error instanceof Error ? error.message : 'Unable to update password.';
};
