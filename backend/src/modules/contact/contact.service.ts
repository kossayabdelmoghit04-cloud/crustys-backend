import { prisma } from '../../utils/prisma';
import { CreateContactDTO } from './contact.types';
import { AdminNotificationService } from '../admin-notifications/admin-notification.service';
import { logger } from '../../utils/logger';

export class ContactService {
  /**
   * Enregistrer un nouveau message de contact dans PostgreSQL
   */
  static async createContact(data: CreateContactDTO) {
    const contact = await prisma.contact.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        subject: data.subject,
        message: data.message,
      },
    });

    AdminNotificationService.createNotification({
      title: "Nouveau message de contact",
      message: `Nouveau message reçu de ${contact.fullName} : "${contact.subject}"`,
      type: "CONTACT_RECEIVED",
      metadata: {
        contactId: contact.id,
        fullName: contact.fullName,
        email: contact.email,
        subject: contact.subject,
      }
    }).catch(err => {
      logger.error(`[Contact Service] Failed to create admin notification CONTACT_RECEIVED: ${err.message}`);
    });

    return contact;
  }
}
