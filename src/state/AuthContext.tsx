import { createContext, useContext, useMemo, useState } from 'react';
import { defaultProfiles } from '../data/mockData';
import { storage } from '../services/storage';
import type { Role, UserProfile } from '../types';

interface AuthState {
  role: Role | null;
  profile: UserProfile | null;
  login: (role: Role) => void;
  logout: () => void;
  updateProfile: (profile: UserProfile) => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [role, setRole] = useState<Role | null>(() => storage.getRole());
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const savedRole = storage.getRole();
    return savedRole ? storage.getProfile(savedRole) : null;
  });

  const value = useMemo<AuthState>(
    () => ({
      role,
      profile,
      login: (nextRole) => {
        storage.setRole(nextRole);
        setRole(nextRole);
        setProfile(storage.getProfile(nextRole) ?? defaultProfiles[nextRole]);
      },
      logout: () => {
        storage.clearSession();
        setRole(null);
        setProfile(null);
      },
      updateProfile: (nextProfile) => {
        storage.setProfile(nextProfile);
        setProfile(nextProfile);
      },
    }),
    [role, profile],
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
