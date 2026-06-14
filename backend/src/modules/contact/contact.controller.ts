import { Request, Response, NextFunction } from 'express';
import { ContactService } from './contact.service';
import { sanitizeInput } from '../../utils/sanitizeInput';

export class ContactController {
  /**
   * @route   POST /api/v1/contacts
   * @desc    Soumettre le formulaire de contact
   * @access  Public
   */
  static async createContact(req: Request, res: Response, next: NextFunction) {
    try {
      const sanitizedData = {
        fullName: sanitizeInput(req.body.fullName),
        email: req.body.email.trim().toLowerCase(),
        subject: sanitizeInput(req.body.subject),
        message: sanitizeInput(req.body.message),
      };

      const contact = await ContactService.createContact(sanitizedData);

      res.status(201).json({
        success: true,
        status: 'success',
        message: 'Contact message sent successfully',
        data: { contact },
      });
    } catch (error) {
      next(error);
    }
  }
}
