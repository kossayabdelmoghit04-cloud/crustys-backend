import bcrypt from 'bcryptjs';
import { prisma } from '../../utils/prisma';
import { AppError } from '../../utils/appError';
import { CreateAdminInput, CreateRoleInput, UpdateAdminInput } from './admin.validation';

export class AdminService {
  /**
   * Crée un nouveau rôle avec ses permissions
   */
  public static async createRole(data: CreateRoleInput['body']) {
    const existingRole = await prisma.role.findUnique({
      where: { name: data.name },
    });

    if (existingRole) {
      throw new AppError('Ce rôle existe déjà', 400);
    }

    const role = await prisma.role.create({
      data: {
        name: data.name,
        permissions: data.permissions,
      },
    });

    return role;
  }

  /**
   * Crée un nouvel administrateur
   */
  public static async createAdmin(data: CreateAdminInput['body']) {
    // Vérifier si l'adresse email est déjà prise
    const existingAdmin = await prisma.admin.findUnique({
      where: { email: data.email },
    });

    if (existingAdmin) {
      throw new AppError('Cette adresse email est déjà utilisée par un autre administrateur', 400);
    }

    // Vérifier si le rôle existe
    const role = await prisma.role.findUnique({
      where: { id: data.roleId },
    });

    if (!role) {
      throw new AppError('Le rôle spécifié est introuvable', 404);
    }

    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Enregistrer en base
    const admin = await prisma.admin.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        password: hashedPassword,
        roleId: data.roleId,
      },
      include: {
        role: true,
      },
    });

    // Retourner l'admin sans le mot de passe
    const { password, ...adminWithoutPassword } = admin;
    return adminWithoutPassword;
  }

  /**
   * Liste tous les administrateurs
   */
  public static async getAdmins() {
    const admins = await prisma.admin.findMany({
      include: {
        role: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Retirer les mots de passe
    return admins.map(({ password, ...adminWithoutPassword }) => adminWithoutPassword);
  }

  /**
   * Récupère un administrateur par son ID
   */
  public static async getAdminById(id: string) {
    const admin = await prisma.admin.findUnique({
      where: { id },
      include: {
        role: true,
      },
    });

    if (!admin) {
      throw new AppError('Administrateur introuvable', 404);
    }

    const { password, ...adminWithoutPassword } = admin;
    return adminWithoutPassword;
  }

  /**
   * Modifie un administrateur
   */
  public static async updateAdmin(id: string, data: UpdateAdminInput['body']) {
    const admin = await prisma.admin.findUnique({
      where: { id },
    });

    if (!admin) {
      throw new AppError('Administrateur introuvable', 404);
    }

    const updateData: any = { ...data };

    // Si changement d'email, vérifier s'il est déjà pris
    if (data.email && data.email !== admin.email) {
      const emailExists = await prisma.admin.findUnique({
        where: { email: data.email },
      });
      if (emailExists) {
        throw new AppError('Cette adresse email est déjà utilisée', 400);
      }
    }

    // Si changement de mot de passe, le hacher
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 12);
    }

    // Si changement de rôle, vérifier son existence
    if (data.roleId) {
      const role = await prisma.role.findUnique({
        where: { id: data.roleId },
      });
      if (!role) {
        throw new AppError('Le rôle spécifié est introuvable', 404);
      }
    }

    const updatedAdmin = await prisma.admin.update({
      where: { id },
      data: updateData,
      include: {
        role: true,
      },
    });

    const { password, ...adminWithoutPassword } = updatedAdmin;
    return adminWithoutPassword;
  }

  /**
   * Supprime un administrateur
   */
  public static async deleteAdmin(id: string) {
    const admin = await prisma.admin.findUnique({
      where: { id },
      include: {
        role: true,
      },
    });

    if (!admin) {
      throw new AppError('Administrateur introuvable', 404);
    }

    // Empêcher la suppression si c'est le seul "Super Admin" pour éviter le blocage du système
    if (admin.role.name === 'Super Admin') {
      const superAdminsCount = await prisma.admin.count({
        where: {
          role: {
            name: 'Super Admin',
          },
        },
      });

      if (superAdminsCount <= 1) {
        throw new AppError('Impossible de supprimer le dernier Super Administrateur.', 400);
      }
    }

    await prisma.admin.delete({
      where: { id },
    });

    return { message: 'Administrateur supprimé avec succès' };
  }
}
