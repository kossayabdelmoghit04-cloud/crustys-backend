import { UserRole } from '@prisma/client';

export type Role = UserRole;

/**
 * Interface representing payloads permitted for a standard User Profile update
 */
export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  email?: string;
}

/**
 * Interface representing payloads permitted for Role Updates (Admin only)
 */
export interface UpdateUserRoleInput {
  role: UserRole;
}

/**
 * Interface representing payloads permitted for Account status updates (Admin only)
 */
export interface UpdateUserStatusInput {
  isActive: boolean;
}
