import { Router } from 'express';
import { TestimonialController } from '../controller/testimonial.controller';
import { validate } from '../../../middlewares/validate';
import { sanitizeBody } from '../../../middlewares/sanitizeBody';
import { testimonialRateLimiter } from '../../../middlewares/rate-limit/testimonialsLimit';
import { authenticate, authorize } from '../../../middlewares/authPlaceholders';
import {
  createTestimonialSchema,
  queryTestimonialsSchema,
  getTestimonialByIdSchema,
  approveTestimonialSchema,
  deleteTestimonialSchema,
} from '../validation/testimonial.validation';
import { auditTrail } from '../../audit/audit.middleware';

const router = Router();

// --- Public Routes ---
// Submit a testimonial (open to guests/customers)
// Secured with Rate Limiter (5 requests / 15 mins) and XSS Sanitization
router.post(
  '/',
  testimonialRateLimiter,
  sanitizeBody,
  validate(createTestimonialSchema),
  TestimonialController.createTestimonial
);

// Fetch testimonials (filtered by approved status by default, with paginated hardening & search)
router.get(
  '/',
  validate(queryTestimonialsSchema),
  TestimonialController.getAllTestimonials
);

// --- Admin/Moderation Routes ---
// Protected by authenticate and authorize('ADMIN') placeholders

// Get a testimonial by its ID
router.get(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate(getTestimonialByIdSchema),
  TestimonialController.getTestimonialById
);

// Moderate testimonial (approve or reject)
router.patch(
  '/:id/approve',
  authenticate,
  authorize('ADMIN'),
  sanitizeBody,
  validate(approveTestimonialSchema),
  auditTrail({ action: 'testimonial_moderate', entity: 'Testimonial' }),
  TestimonialController.approveTestimonial
);

// Delete a testimonial
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate(deleteTestimonialSchema),
  auditTrail({ action: 'testimonial_delete', entity: 'Testimonial' }),
  TestimonialController.deleteTestimonial
);

export default router;
