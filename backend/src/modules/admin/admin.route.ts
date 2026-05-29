import { Router } from 'express';
import { AdminController } from './admin.controller';
import { validate } from '../../middlewares/validate';
import { authenticate, requireRole, requirePermissions } from '../auth/auth.middleware';
import { createAdminSchema, createRoleSchema, updateAdminSchema } from './admin.validation';

const router = Router();

// Toutes les routes d'administration nécessitent que l'utilisateur soit connecté
router.use(authenticate);

// Gestion des rôles (Réservé au Super Admin)
router.post('/roles', requireRole('Super Admin'), validate(createRoleSchema), AdminController.createRole);

// Création d'un administrateur (Réservé au Super Admin)
router.post('/', requireRole('Super Admin'), validate(createAdminSchema), AdminController.createAdmin);

// Lecture des administrateurs (Nécessite la permission de lecture)
router.get('/', requirePermissions('read:admins'), AdminController.getAdmins);
router.get('/:id', requirePermissions('read:admins'), AdminController.getAdminById);

// Modification d'un administrateur (Nécessite la permission d'écriture)
router.put('/:id', requirePermissions('write:admins'), validate(updateAdminSchema), AdminController.updateAdmin);

// Suppression d'un administrateur (Réservé au Super Admin)
router.delete('/:id', requireRole('Super Admin'), AdminController.deleteAdmin);

export default router;
