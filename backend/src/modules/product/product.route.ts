import { Router } from 'express';
import { ProductController } from './product.controller';
import { validate } from '../../middlewares/validate';
import { createProductSchema, updateProductSchema, productQuerySchema } from './product.validation';
import { authenticate, requirePermissions } from '../auth/auth.middleware';

const router = Router();

// Routes publiques
router.get('/', validate(productQuerySchema), ProductController.getAllProducts);
router.get('/:id', ProductController.getProductById);
router.get('/slug/:slug', ProductController.getProductBySlug);

// Routes privées (Admin / Super Admin avec la permission requise)
router.post(
  '/',
  authenticate,
  requirePermissions('write:products'),
  validate(createProductSchema),
  ProductController.createProduct
);

router.patch(
  '/:id',
  authenticate,
  requirePermissions('write:products'),
  validate(updateProductSchema),
  ProductController.updateProduct
);

router.delete(
  '/:id',
  authenticate,
  requirePermissions('write:products'),
  ProductController.deleteProduct
);

export default router;
