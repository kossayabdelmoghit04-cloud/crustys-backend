import { prisma } from '../../utils/prisma';
import { CreateContactDTO } from './contact.types';

export class ContactService {
  /**
   * Enregistrer un nouveau message de contact dans PostgreSQL
   */
  static async createContact(data: CreateContactDTO) {
    return prisma.contact.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        subject: data.subject,
        message: data.message,
      },
    });
  }
}
