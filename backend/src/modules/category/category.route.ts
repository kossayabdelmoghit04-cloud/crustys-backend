import { Router } from 'express';
import { CategoryController } from './category.controller';
import { validate } from '../../middlewares/validate';
import { createCategorySchema, updateCategorySchema } from './category.validation';
import { authenticate, requirePermissions } from '../auth/auth.middleware';

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
  CategoryController.createCategory
);

router.patch(
  '/:id',
  authenticate,
  requirePermissions('write:categories'),
  validate(updateCategorySchema),
  CategoryController.updateCategory
);

router.delete(
  '/:id',
  authenticate,
  requirePermissions('write:categories'),
  CategoryController.deleteCategory
);

export default router;
