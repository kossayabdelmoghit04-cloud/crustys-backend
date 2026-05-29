export interface CreateProductDTO {
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  discountPrice?: number;
  stockQuantity?: number;
  calories?: number;
  image?: string;
  isFeatured?: boolean;
  isAvailable?: boolean;
  images?: string[]; // URLs pour product_images
}

export interface UpdateProductDTO {
  categoryId?: string;
  name?: string;
  description?: string;
  price?: number;
  discountPrice?: number;
  stockQuantity?: number;
  calories?: number;
  image?: string;
  isFeatured?: boolean;
  isAvailable?: boolean;
  images?: string[]; // Remplacera ou mettra à jour product_images
}

export interface ProductQueryFilters {
  page?: string | number;
  limit?: string | number;
  categoryId?: string;
  categorySlug?: string;
  isAvailable?: string | boolean;
  isFeatured?: string | boolean;
  minPrice?: string | number;
  maxPrice?: string | number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
