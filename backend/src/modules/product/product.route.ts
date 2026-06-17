import { Router } from 'express';
import { ProductController } from './product.controller';
import { validate } from '../../middlewares/validate';
import { createProductSchema, updateProductSchema, productQuerySchema } from './product.validation';
import { authenticate, requirePermissions } from '../auth/auth.middleware';
import { auditTrail } from '../audit/audit.middleware';

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
  auditTrail({ action: 'product_create', entity: 'Product' }),
  ProductController.createProduct
);

router.patch(
  '/:id',
  authenticate,
  requirePermissions('write:products'),
  validate(updateProductSchema),
  auditTrail({ action: 'product_update', entity: 'Product' }),
  ProductController.updateProduct
);

router.delete(
  '/:id',
  authenticate,
  requirePermissions('write:products'),
  auditTrail({ action: 'product_delete', entity: 'Product' }),
  ProductController.deleteProduct
);

export default router;
