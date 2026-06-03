# OfficeOS Security Notes

OfficeOS uses Firebase client config in the frontend and Firebase Admin SDK only in local/server-side tooling.

## Secrets

- Do not commit Firebase service account JSON files.
- Do not put Admin SDK credentials in frontend code.
- Keep service account keys outside the repo or in ignored private paths.
- Rotate any service account key that is accidentally shared.

## Firebase Client Config

Firebase web config values such as `VITE_FIREBASE_API_KEY` and `VITE_FIREBASE_PROJECT_ID` are public identifiers. They are not Admin SDK secrets.

Firestore security rules protect tenant data, so rules must be deployed before using a shared demo project.

## Before Paid Production

Add stricter tenant isolation, including:

- custom-claim enforcement for every company-scoped read/write
- immutable `companyId`, `employeeEmail`, `createdAt`, and owner fields
- audit logs for HR/Admin actions
- backup and restore process
- billing budget alerts and usage monitoring
- stricter report, leave, attendance, and announcement validation
- separate environments for development, staging, and production

The current `firestore.rules` file is MVP/demo-ready, not final paid-production policy.
