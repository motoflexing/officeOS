import admin from 'firebase-admin';
import fs from 'node:fs';
import path from 'node:path';

/*
  OfficeOS Firebase seed script for Moto Flexing-owned SaaS backend.

  Firestore structure seeded:
  companies/{companyId}
  companies/{companyId}/users/{uid}
  companies/{companyId}/employees/{employeeId}
  companies/{companyId}/attendance/{attendanceId}
  companies/{companyId}/leaveRequests/{leaveRequestId}
  companies/{companyId}/reports/{reportId}
  companies/{companyId}/announcements/{announcementId}
  companies/{companyId}/settings/main

  Required auth:
  - Set GOOGLE_APPLICATION_CREDENTIALS to a Firebase service account JSON path, or
  - Set FIREBASE_SERVICE_ACCOUNT_PATH to a Firebase service account JSON path.

  Never commit service account JSON files.
*/

const companyId = process.env.VITE_COMPANY_ID || process.env.COMPANY_ID || 'geekynd';
const demoPassword = process.env.FIREBASE_DEMO_PASSWORD || 'OfficeOSDemo@2026';
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;

const seedUsers = [
  {
    key: 'admin',
    email: 'admin@geekynd.com',
    password: demoPassword,
    profile: {
      name: 'Admin User',
      email: 'admin@geekynd.com',
      role: 'Admin',
      department: 'Management',
      designation: 'Administrator',
      status: 'Active',
      workMode: 'Hybrid',
    },
  },
  {
    key: 'hr',
    email: 'hr@geekynd.com',
    password: demoPassword,
    profile: {
      name: 'HR User',
      email: 'hr@geekynd.com',
      role: 'HR',
      department: 'Human Resources',
      designation: 'HR Manager',
      status: 'Active',
      workMode: 'Office',
    },
  },
  {
    key: 'employee',
    email: 'employee@geekynd.com',
    password: demoPassword,
    profile: {
      name: 'Employee User',
      email: 'employee@geekynd.com',
      role: 'Employee',
      department: 'Engineering',
      designation: 'Software Developer',
      status: 'Active',
      workMode: 'Hybrid',
    },
  },
];

const employees = [
  {
    id: 'emp-admin',
    name: 'Admin User',
    email: 'admin@geekynd.com',
    role: 'Admin',
    department: 'Management',
    designation: 'Administrator',
    status: 'Active',
    joiningDate: '2024-01-15',
    phone: '+91 90000 11001',
    location: 'Kolkata',
  },
  {
    id: 'emp-hr',
    name: 'HR User',
    email: 'hr@geekynd.com',
    role: 'HR',
    department: 'Human Resources',
    designation: 'HR Manager',
    status: 'Active',
    joiningDate: '2024-03-01',
    phone: '+91 90000 11002',
    location: 'Kolkata',
  },
  {
    id: 'emp-employee',
    name: 'Employee User',
    email: 'employee@geekynd.com',
    role: 'Employee',
    department: 'Engineering',
    designation: 'Software Developer',
    status: 'Active',
    joiningDate: '2025-07-01',
    phone: '+91 90000 11003',
    location: 'Remote',
  },
  {
    id: 'emp-designer',
    name: 'Adit Saha',
    email: 'adit@geekynd.com',
    role: 'Employee',
    department: 'Design',
    designation: 'Product Designer',
    status: 'On Leave',
    joiningDate: '2025-04-14',
    phone: '+91 90000 11004',
    location: 'Kolkata',
  },
];

const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const attendance = [
  {
    id: `employee@geekynd.com-${today}`,
    employeeName: 'Employee User',
    employeeEmail: 'employee@geekynd.com',
    date: today,
    checkIn: '10:03 AM',
    checkOut: undefined,
    workMode: 'Hybrid',
    status: 'At Work',
  },
  {
    id: `hr@geekynd.com-${today}`,
    employeeName: 'HR User',
    employeeEmail: 'hr@geekynd.com',
    date: today,
    checkIn: '09:54 AM',
    checkOut: undefined,
    workMode: 'Office',
    status: 'At Work',
  },
  {
    id: `employee@geekynd.com-${yesterday}`,
    employeeName: 'Employee User',
    employeeEmail: 'employee@geekynd.com',
    date: yesterday,
    checkIn: '10:08 AM',
    checkOut: '07:02 PM',
    workMode: 'Hybrid',
    status: 'Checked Out',
  },
];

const leaveRequests = [
  {
    id: 'leave-demo-1',
    employeeName: 'Employee User',
    employeeEmail: 'employee@geekynd.com',
    leaveType: 'Casual Leave',
    startDate: '2026-06-10',
    endDate: '2026-06-10',
    reason: 'Personal appointment during office hours.',
    status: 'Pending',
    submittedAt: new Date().toISOString(),
  },
  {
    id: 'leave-demo-2',
    employeeName: 'Adit Saha',
    employeeEmail: 'adit@geekynd.com',
    leaveType: 'Sick Leave',
    startDate: '2026-06-04',
    endDate: '2026-06-05',
    reason: 'Medical rest.',
    status: 'Approved',
    submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    reviewedBy: 'HR User',
    reviewedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

const reports = [
  {
    id: 'report-demo-1',
    employeeName: 'Employee User',
    employeeEmail: 'employee@geekynd.com',
    date: today,
    tasksCompleted: 'Completed dashboard QA and verified attendance flows.',
    tasksInProgress: 'Preparing Firebase demo walkthrough.',
    blockers: 'Waiting for final Firestore rules confirmation.',
    nextPlan: 'Test leave request and report review flows.',
    status: 'Submitted',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'report-demo-2',
    employeeName: 'Employee User',
    employeeEmail: 'employee@geekynd.com',
    date: yesterday,
    tasksCompleted: 'Seeded employee directory and checked UI polish.',
    tasksInProgress: 'None.',
    blockers: 'None.',
    nextPlan: 'Continue Firebase setup.',
    status: 'Reviewed',
    reviewedBy: 'HR User',
    reviewedAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

const announcements = [
  {
    id: 'ann-demo-1',
    title: 'OfficeOS Demo Workspace Ready',
    message: 'Geekynd Hub is connected to the Moto Flexing Firebase demo backend.',
    authorName: 'Admin User',
    authorRole: 'Admin',
    targetRole: 'Everyone',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ann-demo-2',
    title: 'Submit Daily Reports',
    message: 'Please submit daily reports before the end of the workday.',
    authorName: 'HR User',
    authorRole: 'HR',
    targetRole: 'Employee',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

const settings = {
  workspaceName: 'Geekynd Hub',
  productName: 'OfficeOS',
  websiteUrl: 'https://www.motoflexing.com',
  websiteLabel: 'www.motoflexing.com',
  officeStartTime: '10:00',
  officeEndTime: '19:00',
  workModePolicy: 'Hybrid',
  allowHrAnnouncements: true,
  requireDailyReports: true,
  timezone: 'Asia/Kolkata',
};

const initializeAdmin = () => {
  if (admin.apps.length) return;

  if (serviceAccountPath) {
    const resolvedPath = path.resolve(serviceAccountPath);
    const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    return;
  }

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
};

const removeUndefined = (value) =>
  Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));

const upsertAuthUser = async ({ email, password, profile }) => {
  const roleClaim = profile.role.toLowerCase();

  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(user.uid, {
      password,
      displayName: profile.name,
      disabled: false,
    });
    await admin.auth().setCustomUserClaims(user.uid, { companyId, role: roleClaim });
    return user.uid;
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;

    const user = await admin.auth().createUser({
      email,
      password,
      displayName: profile.name,
      emailVerified: true,
      disabled: false,
    });
    await admin.auth().setCustomUserClaims(user.uid, { companyId, role: roleClaim });
    return user.uid;
  }
};

const setCollectionDocs = async (db, collectionName, records) => {
  const batch = db.batch();
  records.forEach((record) => {
    const ref = db.collection('companies').doc(companyId).collection(collectionName).doc(record.id);
    batch.set(ref, removeUndefined(record), { merge: true });
  });
  await batch.commit();
};

const seed = async () => {
  initializeAdmin();

  const db = admin.firestore();
  const companyRef = db.collection('companies').doc(companyId);

  await companyRef.set(
    {
      workspaceName: settings.workspaceName,
      productName: settings.productName,
      seededAt: new Date().toISOString(),
      owner: 'Moto Flexing',
    },
    { merge: true },
  );

  for (const user of seedUsers) {
    const uid = await upsertAuthUser(user);
    await companyRef.collection('users').doc(uid).set(user.profile, { merge: true });
    console.log(`Seeded auth/profile: ${user.email} (${uid})`);
  }

  await setCollectionDocs(db, 'employees', employees);
  await setCollectionDocs(db, 'attendance', attendance);
  await setCollectionDocs(db, 'leaveRequests', leaveRequests);
  await setCollectionDocs(db, 'reports', reports);
  await setCollectionDocs(db, 'announcements', announcements);
  await companyRef.collection('settings').doc('main').set(settings, { merge: true });

  console.log(`Seeded OfficeOS demo data for company: ${companyId}`);
  console.log(`Demo password used: ${demoPassword}`);
};

seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
