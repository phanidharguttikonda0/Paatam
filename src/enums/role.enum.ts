export enum UserRole {
  CORPORATE_ADMIN = 'CORPORATE_ADMIN',
  BRANCH_ADMIN = 'BRANCH_ADMIN', // Generic branch-level admin
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
}

export const BRANCH_ADMIN_ROLES = [
  UserRole.BRANCH_ADMIN,
  'DEAN',
  'PRINCIPAL',
  'VICE_PRINCIPAL',
  'OTHER',
];

