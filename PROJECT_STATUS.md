# OfficeOS Project Status

Last reviewed: 2026-06-04

OfficeOS is a MotoFlexing-owned internal operations workspace. The current tenant/client branding is Geekynd Hub, with the product positioned as OfficeOS and "Powered by MotoFlexing" shown in the app. This document summarizes the current codebase without changing behavior.

## Technology Snapshot

- React 19 + TypeScript + Vite.
- Tailwind CSS with a dark, black/red MotoFlexing visual system.
- React Router routes under a protected app layout.
- Firebase client SDK for Auth and Firestore when env vars are configured.
- Firebase Admin SDK seed script for demo Auth users and tenant data.
- localStorage fallback/demo mode when Firebase config is missing.

## Product Positioning

- OfficeOS should focus on internal company operations: employees, attendance, leave, reporting, announcements, settings, workspace presence, and internal communication.
- MotoFlexing owns the product.
- Geekynd is the first tenant/client workspace.
- ATS/hiring workflows are currently inside OfficeOS but may later become a separate SaaS at `ats.motoflexing.com`.
- Workspace/presence/direct messaging is currently inside OfficeOS but may later become a separate SaaS at `workspace.motoflexing.com`.
- The current strategic split should be: OfficeOS = internal operations, ATS = hiring SaaS candidate, Workspace = collaboration SaaS candidate.

## Branding Rules

- Source: `src/config/branding.ts`, `src/components/PoweredBy.tsx`, `tailwind.config.js`, and `src/index.css`.
- Workspace name: Geekynd Hub.
- Product name: OfficeOS.
- Owner/powered-by brand: MotoFlexing.
- Website label/url: MotoFlexing website.
- Visual system: dark background, red/accent gradients, black surfaces, compact operational UI.
- Sidebar shows Geekynd Hub/OfficeOS. Admin users also see the MotoFlexing powered-by card.
- Keep tenant branding separate from product ownership: Geekynd is the workspace/client, MotoFlexing owns OfficeOS.

## Current Features

### Login/Auth

- Route: `/login`.
- Firebase mode: uses Email/Password Auth and then loads `companies/{companyId}/users/{uid}`.
- Local fallback mode: uses role-selected demo credentials from `src/data/mockData.ts` and stores the selected role/profile in localStorage.
- Auth state is managed in `src/state/AuthContext.tsx`.
- If Firebase is configured, missing email/password or missing Firestore profile prevents login.

### Role-Based Access

- Roles: `Admin`, `HR`, `Employee`.
- Route gates in `src/App.tsx`:
  - Admin/HR: Employees and HR Panel.
  - Admin only: Settings.
  - Logged-in users: Dashboard, Workspace, Attendance, Reports, Leave, Announcements, Profile.
- Sidebar navigation changes by role.
- Firebase rules use custom claims first, then fall back to the user profile doc role.

### Dashboard

- Route: `/dashboard`.
- Shows today's date, check-in, check-out, status, remote-work toggle, quick actions, task summary cards, and pending leave count.
- Check-in/check-out writes attendance to Firestore or localStorage.
- Admin/HR quick actions emphasize employee management and review flows.
- Employee quick actions emphasize leave, reports, attendance, and announcements.

### Employees

- Route: `/employees`.
- Admin/HR only.
- Search, role filter, status filter.
- Add, edit, and delete employees.
- Stores to `companies/{companyId}/employees` or `geekynd:employees`.
- Duplicate email validation exists client-side.

### Attendance

- Route: `/attendance`.
- Admin/HR see all attendance records.
- Employees see their own attendance records.
- Firebase service has both full attendance read and email-scoped read.
- Local fallback stores per-user attendance and a shared attendance index.

### Leave

- Route: `/leave`.
- Users can submit leave requests and view their own leave request history.
- HR/Admin review is handled in the HR Panel overview.
- Leave requests store status, reviewedBy, reviewedAt, date range, reason, and employee identity.

### Reports

- Route: `/reports`.
- Employees submit daily reports.
- Admin/HR can filter by employee, date, and status and mark reports as reviewed.
- Report normalization supports older field names such as `completedTasks`, `workInProgress`, and `plannedTasks`.

### Announcements

- Route: `/announcements`.
- Admin can post announcements.
- HR can post announcements if `allowHrAnnouncements` is enabled in settings.
- Announcements can target Everyone, Admin, HR, or Employee.
- Visibility is filtered client-side by role.

### Settings

- Route: `/settings`.
- Admin only.
- Manages workspace branding, product name, website URL/label, office hours, work-mode policy, timezone, HR announcement permission, and daily report requirement.
- Settings are stored at `companies/{companyId}/settings/main` or `geekynd:settings`.

### HR/ATS

- Route: `/hr`.
- Admin/HR only.
- Overview includes employee status stats, leave review, pending reports, and ATS stats.
- ATS tabs include Job Openings, Candidates, and Interviews.
- Job openings can be added, edited, paused/closed through status changes.
- Candidates can be added, viewed, and moved through Applied, Screening, Interview, Selected, Rejected.
- Interviews can be scheduled, edited, marked completed/cancelled, and annotated.
- Some onboarding figures are static placeholders.
- Resume links can be placeholders.

### Workspace/Presence

- Route: `/workspace`.
- Shows workspace users, presence status, and last active values.
- Current user can update presence: Online, Away, On Break, In Meeting, Offline.
- Firebase mode stores presence on the current user's `users/{uid}` doc.
- Local fallback stores workspace users in `geekynd:workspaceUsers`.
- Groups and Internal mail are explicitly marked Coming soon.

### Direct Messages Prototype

- Route: `/workspace`, Direct Messages section.
- One-to-one conversations are generated from sorted participant emails.
- Firestore shape:
  - `companies/{companyId}/directConversations/{conversationId}`
  - `companies/{companyId}/directConversations/{conversationId}/messages/{messageId}`
- localStorage shape:
  - `geekynd:directConversations`
  - `geekynd:directMessages:{conversationId}`
- Messages load the latest 30 messages.
- Prototype is functional in localStorage mode and partially wired for Firebase mode, but it has known permission/loading risk between roles.

## Backend Setup

### Firebase Project Usage

- Firebase is optional at runtime.
- Firebase config is read from Vite env vars in `src/services/firebase.ts`.
- `VITE_COMPANY_ID` defaults to `geekynd`.
- If any required Firebase web config value is missing, the app falls back to localStorage demo mode.
- Do not document or commit `.env.local` values.
- Do not commit service account JSON files.

### Auth

- Firebase Email/Password Auth is used when configured.
- Seed script creates or updates demo Auth users.
- Seed script sets custom claims:
  - `companyId`
  - `role`: `admin`, `hr`, or `employee`
- Firestore profile docs use display roles:
  - `Admin`
  - `HR`
  - `Employee`

### Firestore Tenant Model

All app data is scoped under:

```text
companies/{companyId}
```

The current tenant is:

```text
companies/geekynd
```

### Security Rules

- File: `firestore.rules`.
- Rules are MVP/demo-oriented, not final paid-production rules.
- Rules prefer custom claims but can fall back to the profile doc at `companies/{companyId}/users/{uid}`.
- Users can read the company/user data if they are in the company.
- Admin can write company root and settings.
- Admin/HR can manage employees.
- Employees can create/read their own attendance, leave, and report documents only when rules can prove ownership.
- Admin/HR can review leave and reports.
- Announcements are readable by all company users; Admin can create/update/delete, HR can create valid Admin/HR-authored announcements.
- Direct conversations/messages are participant-gated by authenticated email.
- Unknown nested collections fall through to Admin-only read/write.

### Indexes

- File: `firestore.indexes.json`.
- Current indexes:
  - `leaveRequests`: `status ASC`, `createdAt DESC`.
  - `reports`: `status ASC`, `createdAt DESC`.
  - `attendance`: `userId ASC`, `date DESC`.
  - `attendance`: `employeeEmail ASC`, `date DESC`.
- Direct conversation query uses `participantEmails array-contains`; no custom composite index is currently defined for it.

### Seed Script

- File: `scripts/seedFirebase.js`.
- Command: `npm run seed:firebase`.
- Requires Admin SDK credentials through `FIREBASE_SERVICE_ACCOUNT_PATH` or `GOOGLE_APPLICATION_CREDENTIALS`.
- Optional `FIREBASE_DEMO_PASSWORD` controls live seeded demo user password.
- Seeds:
  - Firebase Auth users.
  - `companies/{companyId}` root doc.
  - `users`.
  - `employees`.
  - `attendance`.
  - `leaveRequests`.
  - `reports`.
  - `announcements`.
  - `settings/main`.
- It does not currently seed job openings, candidates, interviews, direct conversations, or direct messages.

### localStorage Fallback

- Source: `src/services/storage.ts`.
- Used when Firebase env vars are not fully configured.
- Main keys:
  - `geekynd:selectedRole`
  - `geekynd:profile:{role}`
  - `geekynd:attendance:{email}`
  - `geekynd:attendance:index`
  - `geekynd:employees`
  - `geekynd:reports`
  - `geekynd:announcements`
  - `geekynd:leaveRequests`
  - `geekynd:settings`
  - `geekynd:jobOpenings`
  - `geekynd:candidates`
  - `geekynd:interviews`
  - `geekynd:workspaceUsers`
  - `geekynd:directConversations`
  - `geekynd:directMessages:{conversationId}`

## Current Firestore Collections

### `companies/{companyId}/users`

- Used for auth profile, role, department, designation, work mode/status, presenceStatus, and lastActiveAt.
- Document id is Firebase Auth UID for seeded users.
- Workspace presence reads all company users.

### `companies/{companyId}/employees`

- Employee directory records.
- Managed by Admin/HR.
- Stores role, department, designation, employment status, joining date, phone, and location.

### `companies/{companyId}/attendance`

- Attendance index records keyed by `{employeeEmail}-{date}`.
- Stores employee name/email, date, check-in/out, workMode, and status.
- Employee reads/writes should be email-scoped.

### `companies/{companyId}/leaveRequests`

- Leave application records.
- Employees submit own requests.
- Admin/HR review status.
- Known risk: current page/service can attempt full collection reads for employees.

### `companies/{companyId}/reports`

- Daily report records.
- Employees submit own reports.
- Admin/HR review.
- Known risk: current page/service can attempt full collection reads for employees.

### `companies/{companyId}/announcements`

- Role-targeted announcements.
- Read by company users, filtered client-side by target role.
- Admin can manage; HR can create when settings allow in UI and rule validates authorRole.

### `companies/{companyId}/settings`

- Main settings document at `settings/main`.
- Admin writes, company users read.

### `companies/{companyId}/jobOpenings`

- ATS job opening records.
- Used by HR Panel.
- Current explicit Firestore rules do not define this collection; fallback makes it Admin-only.
- This conflicts with the UI, which allows HR users into ATS management.

### `companies/{companyId}/candidates`

- ATS candidate records.
- Used by HR Panel.
- Current explicit Firestore rules do not define this collection; fallback makes it Admin-only.
- This conflicts with the UI, which allows HR users into ATS management.

### `companies/{companyId}/interviews`

- ATS interview records.
- Used by HR Panel.
- Current explicit Firestore rules do not define this collection; fallback makes it Admin-only.
- This conflicts with the UI, which allows HR users into ATS management.

### Workspace/Direct Message Collections

- `companies/{companyId}/directConversations`
- `companies/{companyId}/directConversations/{conversationId}/messages`
- Used by Workspace Direct Messages prototype.
- Conversation docs include participant emails/names, last message, createdAt, updatedAt.
- Message docs include sender/receiver email, sender name, text, createdAt.

## Known Issues and Risks

- Direct messages have known permission/loading issues between roles. Likely causes include participant email matching, profile/custom claim mismatch, conversation existence checks before message writes, or rules/query shape mismatches.
- Employee-facing leave/report reads currently use full collection reads and then client-side filtering. Firestore rules require employee-owned reads, so Firebase employee sessions may fail where localStorage works.
- Dashboard loads all leave requests to count pending leave. Employee users may hit Firestore permission errors.
- HR/ATS Firestore rules are incomplete for HR. `jobOpenings`, `candidates`, and `interviews` fall through to Admin-only access, while the UI allows HR.
- Seed script does not seed ATS or direct-message data, so Firebase demo may look thinner than local fallback data.
- Firebase bundle-size warning may appear because Firebase SDK is included in the client bundle. Current imports are modular, but bundle review/code splitting may still be needed later.
- Groups and Internal mail in Workspace are Coming soon.
- HR onboarding cards are static placeholder values.
- Candidate resume links can be `#` or placeholder text.
- Workspace text currently contains a mojibake separator in a couple places (`Â·`) instead of a clean separator.
- Announcements are role-filtered in the client, not enforced per target role in Firestore rules.
- Firestore rules are demo-ready but need stricter validation, immutable fields, audit logging, backups, billing limits, and environment separation before paid production.
- Workspace may later move to `workspace.motoflexing.com`.
- ATS may later move to `ats.motoflexing.com`.

## Deployment Checklist

1. Confirm no secrets are committed:
   - Do not include `.env.local`.
   - Do not include service account JSON.
   - Do not paste live passwords into docs or commits.
2. Install dependencies if needed:
   - `npm install`
3. Type-check:
   - `npx tsc --noEmit -p tsconfig.app.json`
4. Build:
   - `npm run build`
5. Deploy Firestore rules:
   - `firebase deploy --only firestore:rules`
6. Deploy Firestore indexes:
   - `firebase deploy --only firestore:indexes`
7. Configure Vercel env vars:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_COMPANY_ID`
8. Confirm demo accounts:
   - Admin email: `admin@geekynd.com`
   - HR email: `hr@geekynd.com`
   - Employee email: `employee@geekynd.com`
   - Live Firebase demo password should come from the owner/seed environment, not from committed docs.
9. Push after verification:
   - `git push`

## Current Verification

Run after documentation changes:

```powershell
npm run build
npx tsc --noEmit -p tsconfig.app.json
```
