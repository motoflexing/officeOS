import { useState } from 'react';
import { ProfileCard } from '../components/ProfileCard';
import { Toast } from '../components/Toast';
import { useAuth } from '../state/AuthContext';
import type { UserProfile } from '../types';

export const ProfilePage = () => {
  const { profile, updateProfile } = useAuth();
  const [toast, setToast] = useState('');

  if (!profile) return null;

  const save = (nextProfile: UserProfile) => {
    updateProfile(nextProfile);
    setToast('Profile saved');
    window.setTimeout(() => setToast(''), 2200);
  };

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast} /> : null}
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent-500">Profile</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">My Profile</h2>
      </div>
      <ProfileCard profile={profile} onSave={save} />
    </div>
  );
};
