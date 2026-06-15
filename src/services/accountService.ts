import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getSecondaryAuth } from './firebase';

export const accountService = {
  createAuthUser: async (email: string, temporaryPassword: string) => {
    const secondaryAuth = getSecondaryAuth();

    try {
      const credential = await createUserWithEmailAndPassword(secondaryAuth, email, temporaryPassword);
      return credential.user.uid;
    } finally {
      await signOut(secondaryAuth).catch(() => undefined);
    }
  },
};
