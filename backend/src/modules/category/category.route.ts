import { Router } from 'express';
import { CategoryController } from './category.controller';
import { validate } from '../../middlewares/validate';
import { createCategorySchema, updateCategorySchema } from './category.validation';
import { authenticate, requirePermissions } from '../auth/auth.middleware';
import { auditTrail } from '../audit/audit.middleware';

const router = Router();

// Routes publiques
router.get('/', CategoryController.getAllCategories);
router.get('/:id', CategoryController.getCategoryById);
router.get('/slug/:slug', CategoryController.getCategoryBySlug);

// Routes privées (Admin / Super Admin avec la permission requise)
router.post(
  '/',
  authenticate,
  requirePermissions('write:categories'),
  validate(createCategorySchema),
  auditTrail({ action: 'category_create', entity: 'Category' }),
  CategoryController.createCategory
);

router.patch(
  '/:id',
  authenticate,
  requirePermissions('write:categories'),
  validate(updateCategorySchema),
  auditTrail({ action: 'category_update', entity: 'Category' }),
  CategoryController.updateCategory
);

router.delete(
  '/:id',
  authenticate,
  requirePermissions('write:categories'),
  auditTrail({ action: 'category_delete', entity: 'Category' }),
  CategoryController.deleteCategory
);

export default router;
