import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { defaultProfiles } from '../data/mockData';
import { auth, isFirebaseConfigured } from '../services/firebase';
import { firestoreService } from '../services/firestoreService';
import { storage } from '../services/storage';
import type { Role, UserProfile } from '../types';

interface AuthState {
  role: Role | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (role: Role, email?: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profile: UserProfile) => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [role, setRole] = useState<Role | null>(() => storage.getRole());
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const savedRole = storage.getRole();
    return savedRole ? storage.getProfile(savedRole) : null;
  });
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return undefined;
    }

    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        storage.clearSession();
        setRole(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const nextProfile = await firestoreService.getUserProfile(user.uid);
        if (!nextProfile) {
          const developerProfile = await firestoreService.getCurrentDeveloperProfile(user.uid);
          if (developerProfile) {
            storage.clearSession();
            setRole(null);
            setProfile(null);
            setLoading(false);
            return;
          }

          storage.clearSession();
          setRole(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        storage.setRole(nextProfile.role);
        storage.setProfile(nextProfile);
        setRole(nextProfile.role);
        setProfile(nextProfile);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      role,
      profile,
      loading,
      login: async (nextRole, email, password) => {
        if (isFirebaseConfigured && auth) {
          if (!email || !password) {
            throw new Error('Email and password are required.');
          }

          const credential = await signInWithEmailAndPassword(auth, email, password);
          const nextProfile = await firestoreService.getUserProfile(credential.user.uid);

          if (!nextProfile) {
            await signOut(auth);
            throw new Error('No workspace profile found for this Firebase user.');
          }

          storage.setRole(nextProfile.role);
          storage.setProfile(nextProfile);
          setRole(nextProfile.role);
          setProfile(nextProfile);
          return;
        }

        storage.setRole(nextRole);
        setRole(nextRole);
        setProfile(storage.getProfile(nextRole) ?? defaultProfiles[nextRole]);
      },
      logout: async () => {
        if (isFirebaseConfigured && auth) {
          await signOut(auth);
        }
        storage.clearSession();
        setRole(null);
        setProfile(null);
      },
      updateProfile: (nextProfile) => {
        storage.setProfile(nextProfile);
        setProfile(nextProfile);
      },
    }),
    [loading, role, profile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
};
