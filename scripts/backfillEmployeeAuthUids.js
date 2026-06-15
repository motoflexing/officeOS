import admin from 'firebase-admin';
import fs from 'node:fs';
import path from 'node:path';

/*
  One-time backfill: populate `authUid` on companies/{companyId}/employees docs.

  Why: chat (Workspace DMs) keys on the Firebase Auth UID. Seeded employee docs were created
  with ids like `emp-admin` and never carried an `authUid`, so DM identity resolution had to
  fall back to email — which produced two divergent conversation docs per pair. This backfill
  sets each employee's `authUid` by matching the employee email to its Firebase Auth user.

  Behavior:
  - Only fills employees that are MISSING `authUid`. Never overwrites an existing value.
  - If no Auth user exists for an employee's email, leaves `authUid` unset and logs it
    (that employee stays excluded from the chat picker — they can't be DMed).
  - Idempotent: safe to re-run.

  Required auth (same as scripts/seedFirebase.js):
  - GOOGLE_APPLICATION_CREDENTIALS, or
  - FIREBASE_SERVICE_ACCOUNT_PATH → Firebase service account JSON path.

  Never commit service account JSON files.

  Run:
    node scripts/backfillEmployeeAuthUids.js
*/

const companyId = process.env.VITE_COMPANY_ID || process.env.COMPANY_ID || 'geekynd';
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;

const initializeAdmin = () => {
  if (admin.apps.length) return;

  if (serviceAccountPath) {
    const resolvedPath = path.resolve(serviceAccountPath);
    const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    return;
  }

  admin.initializeApp({ credential: admin.credential.applicationDefault() });
};

const lookupAuthUidByEmail = async (email) => {
  try {
    const user = await admin.auth().getUserByEmail(email);
    return user.uid;
  } catch (error) {
    if (error.code === 'auth/user-not-found') return null;
    throw error;
  }
};

const backfill = async () => {
  initializeAdmin();
  const db = admin.firestore();
  const employeesRef = db.collection('companies').doc(companyId).collection('employees');

  const snapshot = await employeesRef.get();
  const summary = { total: snapshot.size, alreadySet: 0, patched: 0, noAuthUser: 0 };
  const noAuthUserEmails = [];
  const patchedRows = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const email = (data.email || '').trim();

    if (data.authUid) {
      summary.alreadySet += 1;
      continue;
    }
    if (!email) {
      summary.noAuthUser += 1;
      noAuthUserEmails.push(`(empty email on doc ${doc.id})`);
      continue;
    }

    const uid = await lookupAuthUidByEmail(email);
    if (!uid) {
      summary.noAuthUser += 1;
      noAuthUserEmails.push(email);
      continue;
    }

    await doc.ref.set({ authUid: uid }, { merge: true });
    summary.patched += 1;
    patchedRows.push({ empDocId: doc.id, email, authUid: uid });
  }

  console.log(`\nBackfill complete for company: ${companyId}`);
  console.table(patchedRows);
  console.log(summary);
  if (noAuthUserEmails.length > 0) {
    console.log('No Auth user found (left un-DMable, authUid unset):', noAuthUserEmails);
  }
};

backfill().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
