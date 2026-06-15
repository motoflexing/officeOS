# Firebase Setup for OfficeOS MVP

This backend is owned by Moto Flexing. The first workspace tenant is `geekynd`.

## 1. Create Firebase Project

1. Open the Firebase Console.
2. Create a new Firebase project for OfficeOS.
3. Register a Web App.
4. Copy the Firebase web config values.

## 2. Enable Authentication

1. Go to Authentication.
2. Enable the Email/Password provider.
3. Create test users:
   - `admin@geekynd.com`
   - `hr@geekynd.com`
   - `employee@geekynd.com`

## 3. Configure Environment Variables

Copy `.env.example` to `.env.local` in the project root:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_COMPANY_ID=geekynd
```

If these values are missing, OfficeOS automatically falls back to the existing localStorage demo mode.

For the seed script only, set one of these environment variables:

```env
FIREBASE_SERVICE_ACCOUNT_PATH=C:\absolute\path\to\serviceAccount.json
```

or:

```env
GOOGLE_APPLICATION_CREDENTIALS=C:\absolute\path\to\serviceAccount.json
```

Do not commit service account JSON files. Keep them outside the repo or in an ignored private folder.

Recommended temporary demo password format:

```text
OfficeOSDemo@2026
```

You can override it while seeding:

```powershell
$env:FIREBASE_DEMO_PASSWORD='OfficeOSDemo@2026'
```

## 4. Create Firestore Database

Create Firestore in production or test mode, then add this structure:

```text
companies/{companyId}
companies/{companyId}/users/{uid}
companies/{companyId}/employees/{employeeId}
companies/{companyId}/attendance/{attendanceId}
companies/{companyId}/leaveRequests/{leaveRequestId}
companies/{companyId}/reports/{reportId}
companies/{companyId}/announcements/{announcementId}
companies/{companyId}/settings/main
```

For this MVP, use:

```text
companies/geekynd
```

## 5. Create User Profile Docs

You can create these manually, or run the seed script in section 7.

For each Firebase Auth user, copy the Auth `uid` and create:

```text
companies/geekynd/users/{uid}
```

Admin:

```json
{
  "name": "Admin User",
  "email": "admin@geekynd.com",
  "role": "Admin",
  "department": "Management",
  "designation": "Administrator",
  "status": "Active"
}
```

HR:

```json
{
  "name": "HR User",
  "email": "hr@geekynd.com",
  "role": "HR",
  "department": "Human Resources",
  "designation": "HR Manager",
  "status": "Active"
}
```

Employee:

```json
{
  "name": "Employee User",
  "email": "employee@geekynd.com",
  "role": "Employee",
  "department": "Engineering",
  "designation": "Software Developer",
  "status": "Active"
}
```

## 6. Optional Settings Doc

Create:

```text
companies/geekynd/settings/main
```

Example:

```json
{
  "workspaceName": "Geekynd Hub",
  "productName": "OfficeOS",
  "websiteUrl": "https://www.motoflexing.com",
  "websiteLabel": "www.motoflexing.com",
  "officeStartTime": "10:00",
  "officeEndTime": "19:00",
  "workModePolicy": "Hybrid",
  "allowHrAnnouncements": true,
  "requireDailyReports": true,
  "timezone": "Asia/Kolkata"
}
```

## 7. Run the Seed Script

The seed script uses the Firebase Admin SDK and seeds:

- Firebase Auth demo users
- `companies/geekynd`
- `users`
- `employees`
- `attendance`
- `leaveRequests`
- `reports`
- `announcements`
- `settings/main`

Install dependencies first:

```powershell
npm install
```

Run the seed script:

```powershell
$env:FIREBASE_SERVICE_ACCOUNT_PATH='C:\absolute\path\to\serviceAccount.json'
$env:FIREBASE_DEMO_PASSWORD='OfficeOSDemo@2026'
npm run seed:firebase
```

If you use Google Application Default Credentials instead:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS='C:\absolute\path\to\serviceAccount.json'
npm run seed:firebase
```

The script is idempotent for the demo records: it creates or updates the same known document IDs.

## 8. Deploy Firestore Rules and Indexes

Do not use Firebase test-mode rules for the demo. Test-mode rules are effectively temporary open access and can expose tenant data if the project is shared or accidentally left online.

This repo includes MVP/demo rules in:

```text
firestore.rules
```

Deploy rules:

```powershell
firebase deploy --only firestore:rules
```

This repo also includes common indexes in:

```text
firestore.indexes.json
```

Deploy indexes:

```powershell
firebase deploy --only firestore:indexes
```

The index file includes common query shapes for:

- `leaveRequests`: `status + createdAt`
- `reports`: `status + createdAt`
- `attendance`: `userId + date`
- `attendance`: `employeeEmail + date`

Firebase may still suggest additional indexes later as the app adds new filters or sorting.

## 9. How Roles Connect to Rules

The seed script sets Firebase Auth custom claims:

```json
{
  "companyId": "geekynd",
  "role": "admin"
}
```

Supported claim roles:

- `admin`
- `hr`
- `employee`

The rules prefer custom claims for role checks. For MVP resilience, they also fall back to the matching Firestore profile doc:

```text
companies/geekynd/users/{uid}
```

Firestore profile roles use display casing:

- `Admin`
- `HR`
- `Employee`

Before production, tighten these rules around immutable fields, employee-owned attendance, employee-owned leave/report documents, audit logs, backups, and billing monitoring.
