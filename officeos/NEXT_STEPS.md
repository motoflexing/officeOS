# OfficeOS Next Steps

Last reviewed: 2026-06-04

This list is for planning the next phase safely. It separates demo polish, real bugs, publishing decisions, and deferred work.

## Immediate Polish Before Demo

1. Verify all three live Firebase demo users can log in:
   - Admin: `admin@geekynd.com`
   - HR: `hr@geekynd.com`
   - Employee: `employee@geekynd.com`
   - Use the live demo password from the owner/seed environment, not from committed docs.
2. Walk the main demo path in Firebase mode:
   - Login.
   - Dashboard check-in/check-out.
   - Attendance history.
   - Employee leave request.
   - HR/Admin leave approval.
   - Employee daily report.
   - HR/Admin report review.
   - Announcement creation and role visibility.
   - Settings save as Admin.
3. Fix or hide obvious placeholder UI:
   - Workspace Groups card.
   - Workspace Internal mail card.
   - HR onboarding static counts.
   - Candidate resume placeholder links.
4. Fix Workspace separator mojibake (`Â·`) in user metadata.
5. Confirm MotoFlexing/Geekynd copy is consistent:
   - Geekynd = tenant workspace.
   - OfficeOS = product.
   - MotoFlexing = owner/powered-by brand.
6. Confirm Vercel environment variables are set for the intended Firebase project.
7. Confirm Firestore rules and indexes are deployed before sharing the demo URL.

## Bugs to Fix

1. Direct message permission/loading issue between roles.
   - Reproduce Admin to HR, HR to Employee, Employee to Admin.
   - Confirm Auth token email matches `participantEmails`.
   - Confirm each user has a profile doc under `companies/{companyId}/users/{uid}`.
   - Confirm conversation creation and message creation pass rules sequentially.
   - Add focused Firebase-mode error messages for conversation and message reads.
2. Employee leave/report Firebase reads.
   - Current employee pages can call full collection reads and filter client-side.
   - Replace with email-scoped Firestore queries for employee sessions.
   - Keep Admin/HR full collection reads.
3. Dashboard pending leave count.
   - Avoid full leave request reads for employees.
   - Use own leave requests for Employee and all pending leave for Admin/HR.
4. HR/ATS security rules.
   - Add explicit rules for `jobOpenings`, `candidates`, and `interviews`.
   - Decide whether HR can read/write all ATS records.
   - Avoid relying on Admin-only catch-all.
5. Seed coverage.
   - Seed job openings, candidates, and interviews if ATS remains visible for demo.
   - Optionally seed a direct conversation for DM demo verification.
6. Announcement security.
   - Consider enforcing target-role visibility and author role consistency in rules before production.
7. Firebase bundle-size warning.
   - Keep modular imports.
   - Consider route-level code splitting later if bundle size remains high.

## Features to Remove or Disable Before Publishing

- Disable or clearly mark Direct Messages if Firebase permissions are not fixed before demo.
- Disable or hide ATS tabs if HR cannot access them under deployed rules.
- Hide Workspace Groups and Internal mail if they are not part of the demo story.
- Hide placeholder resume links or replace them with safe demo files/labels.
- Avoid showing static onboarding counts as real operational data.
- Do not publish live demo passwords in the repository or public docs.

## Recommended Next Sprint

1. Stabilize Firebase access patterns.
   - Add role-aware Firestore reads for leave, reports, dashboard counts, and ATS.
   - Align UI permissions with Firestore rules.
2. Stabilize Direct Messages.
   - Reproduce the role issue.
   - Add scoped tests/manual scripts for Admin/HR/Employee conversations.
   - Improve error states and loading states.
3. Finish demo data.
   - Expand seed script to include ATS demo data.
   - Add optional DM demo records.
   - Keep seed idempotent.
4. Production-readiness pass on security.
   - Stricter field validation.
   - Immutable owner/email/company fields.
   - Audit logs for Admin/HR actions.
   - Billing alerts and backups.
5. Product boundary decision.
   - Decide what remains in OfficeOS for the next release.
   - Decide what is only a prototype for future ATS/Workspace SaaS.

## What Not to Build Yet

- Do not build full payroll, invoices, or finance workflows.
- Do not build a full Slack/Teams replacement before DM and presence are stable.
- Do not build a full ATS SaaS until OfficeOS demo operations are stable.
- Do not add multi-tenant onboarding/payment flows yet.
- Do not add analytics dashboards beyond what the demo needs.
- Do not refactor the whole persistence layer until the current Firebase permission bugs are fixed and documented.
- Do not introduce more production domains until the OfficeOS/ATS/Workspace boundary is decided.
