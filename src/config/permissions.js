/**
 * Standardized Permissions Registry for Smart Youth ICT
 * Granular permissions that can be dynamically delegated by Branch Managers to Employees.
 */
const PERMISSIONS = {
  // Leads & CRM
  LEADS_VIEW: 'leads:view',
  LEADS_MANAGE: 'leads:manage',
  LEADS_DELETE: 'leads:delete',

  // Payments & Financials
  PAYMENTS_VIEW: 'payments:view',
  PAYMENTS_VERIFY: 'payments:verify',
  INVOICES_VIEW: 'invoices:view',
  INVOICES_MANAGE: 'invoices:manage',

  // Students & Admissions
  STUDENTS_VIEW: 'students:view',
  STUDENTS_ENROLL: 'students:enroll',
  STUDENTS_MANAGE: 'students:manage',

  // Courses & Batches
  COURSES_VIEW: 'courses:view',
  COURSES_MANAGE: 'courses:manage',

  // Live Sessions
  SESSIONS_VIEW: 'sessions:view',
  SESSIONS_MANAGE: 'sessions:manage',

  // Seminars & Workshops
  SEMINARS_VIEW: 'seminars:view',
  SEMINARS_MANAGE: 'seminars:manage',

  // Staff Management (Branch Admin only)
  STAFF_MANAGE: 'staff:manage',
};

const PERMISSION_METADATA = [
  {
    category: 'CRM & Leads',
    permissions: [
      { id: PERMISSIONS.LEADS_VIEW, name: 'View Leads', description: 'View incoming customer leads and inquiries' },
      { id: PERMISSIONS.LEADS_MANAGE, name: 'Manage Leads', description: 'Update lead status, follow-up dates, and add notes' },
      { id: PERMISSIONS.LEADS_DELETE, name: 'Delete Leads', description: 'Remove invalid or spam leads' },
    ],
  },
  {
    category: 'Payments & Billing',
    permissions: [
      { id: PERMISSIONS.PAYMENTS_VIEW, name: 'View Payments', description: 'View student fee transactions and history' },
      { id: PERMISSIONS.PAYMENTS_VERIFY, name: 'Verify Payments', description: 'Approve or reject manual/bank payment receipts' },
      { id: PERMISSIONS.INVOICES_VIEW, name: 'View Invoices', description: 'View student invoices and billing records' },
      { id: PERMISSIONS.INVOICES_MANAGE, name: 'Manage Invoices', description: 'Issue or update student fee invoices' },
    ],
  },
  {
    category: 'Students & Enrollment',
    permissions: [
      { id: PERMISSIONS.STUDENTS_VIEW, name: 'View Students', description: 'View student list and contact info' },
      { id: PERMISSIONS.STUDENTS_ENROLL, name: 'Admit & Enroll', description: 'Enroll students into courses manually' },
      { id: PERMISSIONS.STUDENTS_MANAGE, name: 'Manage Students', description: 'Update student profiles and status' },
    ],
  },
  {
    category: 'Courses & Batches',
    permissions: [
      { id: PERMISSIONS.COURSES_VIEW, name: 'View Courses', description: 'View courses assigned to this branch' },
      { id: PERMISSIONS.COURSES_MANAGE, name: 'Manage Courses', description: 'Update branch batch schedules and pricing' },
    ],
  },
  {
    category: 'Live Classes & Sessions',
    permissions: [
      { id: PERMISSIONS.SESSIONS_VIEW, name: 'View Sessions', description: 'View schedule of live classes and meetings' },
      { id: PERMISSIONS.SESSIONS_MANAGE, name: 'Manage Sessions', description: 'Create and launch live class meetings' },
    ],
  },
  {
    category: 'Seminars & Workshops',
    permissions: [
      { id: PERMISSIONS.SEMINARS_VIEW, name: 'View Registrations', description: 'View seminar participant signups' },
      { id: PERMISSIONS.SEMINARS_MANAGE, name: 'Manage Attendance', description: 'Mark seminar attendance and contact leads' },
    ],
  },
];

module.exports = {
  PERMISSIONS,
  PERMISSION_METADATA,
};
