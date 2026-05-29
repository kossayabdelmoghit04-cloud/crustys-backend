import { prisma } from '../../src/utils/prisma';
import bcrypt from 'bcryptjs';
import { UserRole, OrderStatus, ReservationStatus, PaymentStatus, PaymentMethod } from '@prisma/client';

const hashPasswordSync = (password: string) => {
  return bcrypt.hashSync(password, 10);
};

export async function createTestUser(overrides: any = {}) {
  const email = overrides.email || `user_${Math.random().toString(36).substring(7)}@test.com`;
  const password = overrides.password ? hashPasswordSync(overrides.password) : hashPasswordSync('User123!');
  
  return prisma.user.create({
    data: {
      email,
      password,
      firstName: overrides.firstName || 'John',
      lastName: overrides.lastName || 'Doe',
      fullName: overrides.fullName || 'John Doe',
      phone: overrides.phone || '0612345678',
      role: overrides.role || UserRole.CUSTOMER,
      isVerified: overrides.isVerified !== undefined ? overrides.isVerified : true,
      isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    },
  });
}

export async function createAdmin(overrides: any = {}) {
  const email = overrides.email || `admin_${Math.random().toString(36).substring(7)}@test.com`;
  const password = overrides.password ? hashPasswordSync(overrides.password) : hashPasswordSync('Admin123!');
  
  // Find or create role
  let role = await prisma.role.findFirst({
    where: { name: overrides.roleName || 'Super Admin' },
  });

  if (!role) {
    role = await prisma.role.create({
      data: {
        name: overrides.roleName || 'Super Admin',
        permissions: overrides.permissions || ['*'],
      },
    });
  }

  return prisma.admin.create({
    data: {
      fullName: overrides.fullName || 'Super Administrator',
      email,
      password,
      roleId: role.id,
    },
  });
}

export async function createManager(overrides: any = {}) {
  return createAdmin({
    fullName: 'Test Manager',
    roleName: 'Manager',
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
    ...overrides,
  });
}

export async function createCategory(overrides: any = {}) {
  const name = overrides.name || `Category ${Math.random().toString(36).substring(7)}`;
  const slug = overrides.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  
  return prisma.category.create({
    data: {
      name,
      slug,
      description: overrides.description || 'Test category description',
      isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    },
  });
}

export async function createProduct(overrides: any = {}) {
  let categoryId = overrides.categoryId;
  if (!categoryId) {
    const category = await createCategory();
    categoryId = category.id;
  }

  const name = overrides.name || `Product ${Math.random().toString(36).substring(7)}`;
  const slug = overrides.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return prisma.product.create({
    data: {
      name,
      slug,
      description: overrides.description || 'Test product description',
      price: overrides.price || 15.99,
      discountPrice: overrides.discountPrice || null,
      stockQuantity: overrides.stockQuantity !== undefined ? overrides.stockQuantity : 50,
      calories: overrides.calories || 650,
      isFeatured: overrides.isFeatured || false,
      isAvailable: overrides.isAvailable !== undefined ? overrides.isAvailable : true,
      categoryId,
    },
  });
}

export async function createOrder(overrides: any = {}) {
  let userId = overrides.userId;
  if (!userId && overrides.createCustomer !== false) {
    const user = await createTestUser();
    userId = user.id;
  }

  const orderNumber = overrides.orderNumber || `CRUSTY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const totalPrice = overrides.totalPrice || 25.50;

  return prisma.order.create({
    data: {
      userId: userId || null,
      orderNumber,
      totalPrice,
      deliveryType: overrides.deliveryType || 'pickup',
      paymentStatus: overrides.paymentStatus || 'pending',
      orderStatus: overrides.orderStatus || OrderStatus.PENDING,
      customerAddress: overrides.customerAddress || '123 Test Street, Montreal',
      customerPhone: overrides.customerPhone || '5141234567',
      notes: overrides.notes || 'No onions, please',
      items: overrides.items ? {
        create: overrides.items,
      } : undefined,
    },
    include: {
      items: true,
    },
  });
}

export async function createReservation(overrides: any = {}) {
  let userId = overrides.userId;
  if (!userId && overrides.createCustomer !== false) {
    const user = await createTestUser();
    userId = user.id;
  }

  return prisma.reservation.create({
    data: {
      userId: userId || null,
      customerName: overrides.customerName || 'Alice Cooper',
      customerPhone: overrides.customerPhone || '5149876543',
      customerEmail: overrides.customerEmail || 'alice@example.com',
      reservationDate: overrides.reservationDate || new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
      reservationTime: overrides.reservationTime || '19:00',
      guestsCount: overrides.guestsCount || 4,
      status: overrides.status || ReservationStatus.PENDING,
      notes: overrides.notes || 'Window seat if possible',
    },
  });
}
