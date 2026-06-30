import { prisma } from '../../utils/prisma';
import { AppError } from '../../utils/appError';
import { slugify } from '../../utils/slugify';
import { CreateProductDTO, UpdateProductDTO, ProductQueryFilters } from './product.types';
import { StockAlertService } from '../stock-alerts/stock-alert.service';

export class ProductService {
  /**
   * Créer un nouveau produit
   */
  static async create(data: CreateProductDTO) {
    // 1. Vérifier si la catégorie existe
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });

    if (!category) {
      throw new AppError('La catégorie spécifiée n\'existe pas.', 400);
    }

    // 2. Générer le slug et vérifier s'il est unique
    let slug = slugify(data.name);
    let existingProduct = await prisma.product.findUnique({
      where: { slug },
    });

    // Si le slug existe déjà, on lui ajoute un timestamp ou un suffixe aléatoire pour assurer l'unicité
    if (existingProduct) {
      const suffix = Math.random().toString(36).substring(2, 6);
      slug = `${slug}-${suffix}`;
    }

    // 3. Créer le produit avec les images secondaires associées
    const { images, ...productData } = data;

    return prisma.product.create({
      data: {
        ...productData,
        slug,
        images: images && images.length > 0 
          ? {
              create: images.map((imageUrl) => ({ imageUrl })),
            }
          : undefined,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: true,
      },
    });
  }

  /**
   * Récupérer tous les produits avec pagination, filtrage et recherche
   */
  static async getAll(filters: ProductQueryFilters) {
    const page = Math.max(1, parseInt(filters.page as string || '1', 10));
    const limit = Math.max(1, parseInt(filters.limit as string || '10', 10));
    const skip = (page - 1) * limit;

    const where: any = {};

    // Filtrage par catégorie ID
    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    // Filtrage par catégorie Slug
    if (filters.categorySlug) {
      where.category = {
        slug: filters.categorySlug,
      };
    }

    // Filtrage par disponibilité
    if (filters.isAvailable !== undefined) {
      where.isAvailable = filters.isAvailable === 'true' || filters.isAvailable === true;
    }

    // Filtrage par vedette (featured)
    if (filters.isFeatured !== undefined) {
      where.isFeatured = filters.isFeatured === 'true' || filters.isFeatured === true;
    }

    // Filtrage par plage de prix
    if (filters.minPrice || filters.maxPrice) {
      where.price = {};
      if (filters.minPrice) {
        where.price.gte = parseFloat(filters.minPrice as string);
      }
      if (filters.maxPrice) {
        where.price.lte = parseFloat(filters.maxPrice as string);
      }
    }

    // Recherche par mot-clé (Nom ou Description)
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Tri
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    // Récupérer le total des éléments correspondants
    const totalProducts = await prisma.product.count({ where });

    // Récupérer les produits paginés
    const products = await prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          select: {
            id: true,
            imageUrl: true,
          },
        },
      },
    });

    const totalPages = Math.ceil(totalProducts / limit);

    return {
      products,
      pagination: {
        total: totalProducts,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Récupérer un produit par ID
   */
  static async getById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
          },
        },
        images: {
          select: {
            id: true,
            imageUrl: true,
          },
        },
      },
    });

    if (!product) {
      throw new AppError('Produit introuvable.', 404);
    }

    return product;
  }

  /**
   * Récupérer un produit par son Slug
   */
  static async getBySlug(slug: string) {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
          },
        },
        images: {
          select: {
            id: true,
            imageUrl: true,
          },
        },
      },
    });

    if (!product) {
      throw new AppError('Produit introuvable.', 404);
    }

    return product;
  }

  /**
   * Modifier un produit
   */
  static async update(id: string, data: UpdateProductDTO) {
    // 1. Vérifier si le produit existe
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new AppError('Produit introuvable.', 404);
    }

    const { images, ...productData } = data;
    const updateData: any = { ...productData };

    // 2. Si la catégorie change, valider son existence
    if (data.categoryId && data.categoryId !== product.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });

      if (!category) {
        throw new AppError('La catégorie spécifiée n\'existe pas.', 400);
      }
    }

    // 3. Si le nom change, régénérer le slug
    if (data.name && data.name !== product.name) {
      let slug = slugify(data.name);
      const existingProduct = await prisma.product.findFirst({
        where: {
          slug,
          id: { not: id },
        },
      });

      if (existingProduct) {
        const suffix = Math.random().toString(36).substring(2, 6);
        slug = `${slug}-${suffix}`;
      }
      updateData.slug = slug;
    }

    // 4. Mettre à jour dans une transaction si des images secondaires sont passées
    const updatedProduct = await prisma.$transaction(async (tx) => {
      if (images !== undefined) {
        // Supprimer les anciennes images secondaires
        await tx.productImage.deleteMany({
          where: { productId: id },
        });

        // Ajouter les nouvelles images secondaires
        if (images.length > 0) {
          updateData.images = {
            create: images.map((imageUrl) => ({ imageUrl })),
          };
        }
      }

      return tx.product.update({
        where: { id },
        data: updateData,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          images: true,
        },
      });
    });

    // Déclencher la vérification de stock après la mise à jour du produit
    StockAlertService.checkProductStock(id).catch(err => {
      console.error(`[Product Service] Failed checking stock level for product ${id}: ${err.message}`);
    });

    return updatedProduct;
  }

  /**
   * Supprimer un produit
   */
  static async delete(id: string) {
    // Vérifier si le produit existe
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new AppError('Produit introuvable.', 404);
    }

    // La cascade configurée au niveau Prisma et de la DB gère la suppression des product_images associées
    return prisma.product.delete({
      where: { id },
    });
  }
}
