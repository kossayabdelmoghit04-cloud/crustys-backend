import { Router } from 'express';
import { ContactController } from './contact.controller';
import { validate } from '../../middlewares/validate';
import { createContactSchema } from './contact.validation';
import { auditTrail } from '../audit/audit.middleware';

const router = Router();

/**
 * @route   POST /api/v1/contacts
 * @desc    Soumettre le formulaire de contact (Public)
 * @access  Public
 */
router.post(
  '/',
  validate(createContactSchema),
  auditTrail({ action: 'contact_submit', entity: 'Contact' }),
  ContactController.createContact
);

export default router;
