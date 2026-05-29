import { Router } from 'express';
import { UsersController } from './users.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { validate } from '../../middlewares/validate';
import { 
  updateUserSchema, 
  updateUserRoleSchema, 
  updateUserStatusSchema, 
  getUserQuerySchema 
} from './users.validation';

const router = Router();

/**
 * All User Management routes are fully secured by JWT authentication
 */
router.use(authenticate);

// 1. Fetch paginated, searched, and sorted list of users (Admin only)
router.get(
  '/',
  authorize('ADMIN'),
  validate(getUserQuerySchema),
  UsersController.getUsers
);

// 2. Fetch profile details for a specific user ID (Admin or Profile Owner)
router.get(
  '/:id',
  UsersController.getUserById
);

// 3. Update profile details (firstName, lastName, email) (Admin or Profile Owner)
router.patch(
  '/:id',
  validate(updateUserSchema),
  UsersController.updateUser
);

// 4. Archive a user account via Soft-Delete (Admin only)
router.delete(
  '/:id',
  authorize('ADMIN'),
  UsersController.deleteUser
);

// 5. Update user role (Admin only)
router.patch(
  '/:id/role',
  authorize('ADMIN'),
  validate(updateUserRoleSchema),
  UsersController.updateUserRole
);

// 6. Activate or Suspend a user account (Admin only)
router.patch(
  '/:id/status',
  authorize('ADMIN'),
  validate(updateUserStatusSchema),
  UsersController.updateUserStatus
);

export default router;
