import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { auth, isFirebaseConfigured } from '../services/firebase';
import { firestoreService } from '../services/firestoreService';
import type { DeveloperProfile } from '../types';

export const DeveloperGuard = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [developer, setDeveloper] = useState<DeveloperProfile | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return undefined;
    }

    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setDeveloper(null);
        setLoading(false);
        return;
      }

      const profile = await firestoreService.getCurrentDeveloperProfile(user.uid);
      if (profile) {
        await firestoreService.updateDeveloperLastLogin(user.uid).catch(() => undefined);
      }
      setDeveloper(profile);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="min-h-screen p-6 text-sm text-slate-400">Checking developer access...</div>;
  if (!developer) return <Navigate to="/developer-login" replace />;

  return <>{children}</>;
};
