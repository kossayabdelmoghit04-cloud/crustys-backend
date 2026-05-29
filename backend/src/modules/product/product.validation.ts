import { z } from 'zod';

export const createProductSchema = z.object({
  body: z
    .object({
      categoryId: z
        .string({ required_error: 'L\'ID de la catégorie est requis' })
        .uuid('L\'ID de la catégorie doit être un UUID valide'),
      name: z
        .string({ required_error: 'Le nom du produit est requis' })
        .min(2, 'Le nom doit faire au moins 2 caractères')
        .max(100, 'Le nom ne doit pas dépasser 100 caractères')
        .trim(),
      description: z
        .string()
        .max(1000, 'La description ne doit pas dépasser 1000 caractères')
        .optional()
        .nullable(),
      price: z
        .number({ required_error: 'Le prix est requis' })
        .min(0, 'Le prix ne peut pas être négatif'),
      discountPrice: z
        .number()
        .min(0, 'Le prix réduit ne peut pas être négatif')
        .optional()
        .nullable(),
      stockQuantity: z
        .number()
        .int('La quantité en stock doit être un nombre entier')
        .min(0, 'La quantité en stock ne peut pas être négative')
        .optional(),
      calories: z
        .number()
        .int('Les calories doivent être un nombre entier')
        .min(0, 'Les calories ne peuvent pas être négatives')
        .optional()
        .nullable(),
      image: z
        .string()
        .url('L\'image principale doit être une URL valide')
        .or(z.string().regex(/^\/[a-zA-Z0-9_\-\/]+\.(jpg|jpeg|png|webp|svg)$/, 'Format de chemin d\'image invalide'))
        .optional()
        .nullable(),
      isFeatured: z.boolean().optional(),
      isAvailable: z.boolean().optional(),
      images: z
        .array(
          z.string().url('L\'image doit être une URL valide').or(
            z.string().regex(/^\/[a-zA-Z0-9_\-\/]+\.(jpg|jpeg|png|webp|svg)$/, 'Format de chemin d\'image invalide')
          )
        )
        .optional(),
    })
    .refine(
      (data) => {
        if (data.discountPrice !== undefined && data.discountPrice !== null) {
          return data.discountPrice < data.price;
        }
        return true;
      },
      {
        message: 'Le prix de réduction doit être inférieur au prix normal',
        path: ['discountPrice'],
      }
    ),
});

export const updateProductSchema = z.object({
  body: z
    .object({
      categoryId: z.string().uuid('L\'ID de la catégorie doit être un UUID valide').optional(),
      name: z
        .string()
        .min(2, 'Le nom doit faire au moins 2 caractères')
        .max(100, 'Le nom ne doit pas dépasser 100 caractères')
        .trim()
        .optional(),
      description: z
        .string()
        .max(1000, 'La description ne doit pas dépasser 1000 caractères')
        .optional()
        .nullable(),
      price: z.number().min(0, 'Le prix ne peut pas être négatif').optional(),
      discountPrice: z
        .number()
        .min(0, 'Le prix réduit ne peut pas être négatif')
        .optional()
        .nullable(),
      stockQuantity: z
        .number()
        .int('La quantité en stock doit être un nombre entier')
        .min(0, 'La quantité en stock ne peut pas être négative')
        .optional(),
      calories: z
        .number()
        .int('Les calories doivent être un nombre entier')
        .min(0, 'Les calories ne peuvent pas être négatives')
        .optional()
        .nullable(),
      image: z
        .string()
        .url('L\'image principale doit être une URL valide')
        .or(z.string().regex(/^\/[a-zA-Z0-9_\-\/]+\.(jpg|jpeg|png|webp|svg)$/, 'Format de chemin d\'image invalide'))
        .optional()
        .nullable(),
      isFeatured: z.boolean().optional(),
      isAvailable: z.boolean().optional(),
      images: z
        .array(
          z.string().url('L\'image doit être une URL valide').or(
            z.string().regex(/^\/[a-zA-Z0-9_\-\/]+\.(jpg|jpeg|png|webp|svg)$/, 'Format de chemin d\'image invalide')
          )
        )
        .optional(),
    })
    .refine(
      (data) => {
        // En cas d'update, si les deux champs sont fournis, on valide
        if (data.price !== undefined && data.discountPrice !== undefined && data.discountPrice !== null) {
          return data.discountPrice < data.price;
        }
        return true;
      },
      {
        message: 'Le prix de réduction doit être inférieur au prix normal',
        path: ['discountPrice'],
      }
    ),
});

export const productQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    categoryId: z.string().uuid('ID de catégorie invalide').optional(),
    categorySlug: z.string().optional(),
    isAvailable: z.enum(['true', 'false']).optional(),
    isFeatured: z.enum(['true', 'false']).optional(),
    minPrice: z.string().optional(),
    maxPrice: z.string().optional(),
    search: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
