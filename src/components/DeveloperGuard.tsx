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

      debugDeveloperAuth('DeveloperGuard Firebase user detected', { uid: user.uid });

      try {
        const profile = await firestoreService.getCurrentDeveloperProfile(user.uid);
        debugDeveloperAuth('DeveloperGuard profile authorization result', { authorized: Boolean(profile) });
        if (profile) {
          await firestoreService.updateDeveloperLastLogin(user.uid).catch((error) => {
            debugDeveloperAuth('DeveloperGuard lastLoginAt update failed', getFirebaseDebugError(error));
          });
        }
        setDeveloper(profile);
      } catch (error) {
        debugDeveloperAuth('DeveloperGuard profile check failed', getFirebaseDebugError(error));
        setDeveloper(null);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  if (loading) return <div className="min-h-screen p-6 text-sm text-[color:var(--color-text-secondary)]">Checking developer access...</div>;
  if (!developer) return <Navigate to="/developer-login" replace />;

  return <>{children}</>;
};

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
