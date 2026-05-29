import { prisma } from '../../utils/prisma';
import { AppError } from '../../utils/appError';
import { slugify } from '../../utils/slugify';
import { CreateCategoryDTO, UpdateCategoryDTO, CategoryQueryFilters } from './category.types';

export class CategoryService {
  /**
   * Créer une nouvelle catégorie
   */
  static async create(data: CreateCategoryDTO) {
    // Vérifier si le nom existe déjà
    const existingCategory = await prisma.category.findUnique({
      where: { name: data.name },
    });

    if (existingCategory) {
      throw new AppError('Une catégorie avec ce nom existe déjà.', 400);
    }

    const slug = slugify(data.name);

    // Vérifier si le slug existe déjà (au cas où, bien que name soit unique)
    const existingSlug = await prisma.category.findUnique({
      where: { slug },
    });

    if (existingSlug) {
      throw new AppError('Une catégorie avec ce slug généré existe déjà.', 400);
    }

    return prisma.category.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        image: data.image,
        isActive: data.isActive ?? true,
      },
    });
  }

  /**
   * Récupérer toutes les catégories
   */
  static async getAll(filters: CategoryQueryFilters) {
    const where: any = {};

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive === 'true' || filters.isActive === true;
    }

    return prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }

  /**
   * Récupérer une catégorie par ID
   */
  static async getById(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      throw new AppError('Catégorie introuvable.', 404);
    }

    return category;
  }

  /**
   * Récupérer une catégorie par Slug
   */
  static async getBySlug(slug: string) {
    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        products: {
          where: { isAvailable: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!category) {
      throw new AppError('Catégorie introuvable.', 404);
    }

    return category;
  }

  /**
   * Modifier une catégorie
   */
  static async update(id: string, data: UpdateCategoryDTO) {
    // Vérifier si la catégorie existe
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new AppError('Catégorie introuvable.', 404);
    }

    const updateData: any = { ...data };

    // Si le nom change, on régénère le slug et on vérifie l'unicité
    if (data.name && data.name !== category.name) {
      const existingCategory = await prisma.category.findUnique({
        where: { name: data.name },
      });

      if (existingCategory) {
        throw new AppError('Une catégorie avec ce nom existe déjà.', 400);
      }

      updateData.slug = slugify(data.name);
      
      const existingSlug = await prisma.category.findUnique({
        where: { slug: updateData.slug },
      });

      if (existingSlug && existingSlug.id !== id) {
        throw new AppError('Une catégorie avec ce slug généré existe déjà.', 400);
      }
    }

    return prisma.category.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Supprimer une catégorie
   */
  static async delete(id: string) {
    // Vérifier si la catégorie existe
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new AppError('Catégorie introuvable.', 404);
    }

    // Supprimer la catégorie (la relation CASCADE dans schema.prisma gérera la suppression ou l'impact sur les produits s'il y a lieu)
    return prisma.category.delete({
      where: { id },
    });
  }
}
