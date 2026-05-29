import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du peuplement de la base de données (seeding)...');

  // 1. Initialisation / Mise à jour des rôles avec permissions associées
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'Super Admin' },
    update: {
      permissions: ['*'], // Accès total
    },
    create: {
      name: 'Super Admin',
      permissions: ['*'],
    },
  });
  console.log(`- Rôle créé ou mis à jour : ${superAdminRole.name}`);

  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {
      permissions: [
        'read:admins',
        'write:admins',
        'read:products',
        'write:products',
        'read:categories',
        'write:categories',
        'read:orders',
        'write:orders',
        'read:reservations',
        'write:reservations',
        'read:payments',
        'write:payments',
        'read:analytics',
      ],
    },
    create: {
      name: 'Admin',
      permissions: [
        'read:admins',
        'write:admins',
        'read:products',
        'write:products',
        'read:categories',
        'write:categories',
        'read:orders',
        'write:orders',
        'read:reservations',
        'write:reservations',
        'read:payments',
        'write:payments',
        'read:analytics',
      ],
    },
  });
  console.log(`- Rôle créé ou mis à jour : ${adminRole.name}`);

  const managerRole = await prisma.role.upsert({
    where: { name: 'Manager' },
    update: {
      permissions: [
        'read:products',
        'read:categories',
        'read:orders',
        'write:orders',
        'read:reservations',
        'write:reservations',
        'read:payments',
        'read:analytics',
      ],
    },
    create: {
      name: 'Manager',
      permissions: [
        'read:products',
        'read:categories',
        'read:orders',
        'write:orders',
        'read:reservations',
        'write:reservations',
        'read:payments',
        'read:analytics',
      ],
    },
  });
  console.log(`- Rôle créé ou mis à jour : ${managerRole.name}`);

  // 2. Création de l'administrateur par défaut
  const defaultAdminEmail = 'admin@crustys.com';
  const hashedPassword = await bcrypt.hash('Admin123!', 12);

  const defaultAdmin = await prisma.admin.upsert({
    where: { email: defaultAdminEmail },
    update: {
      fullName: 'Super Administrateur',
      password: hashedPassword,
      roleId: superAdminRole.id,
    },
    create: {
      fullName: 'Super Administrateur',
      email: defaultAdminEmail,
      password: hashedPassword,
      roleId: superAdminRole.id,
    },
  });

  console.log(`- Administrateur créé ou mis à jour : ${defaultAdmin.email}`);
  console.log('✅ Seeding terminé avec succès !');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding de la base de données :', e);
    process.exit(1);
  })
  .finally(async () => {
    // Fermeture de la connexion Prisma
    await prisma.$disconnect();
  });
