export interface CreateCategoryDTO {
  name: string;
  description?: string;
  image?: string;
  isActive?: boolean;
}

export interface UpdateCategoryDTO {
  name?: string;
  description?: string;
  image?: string;
  isActive?: boolean;
}

export interface CategoryQueryFilters {
  isActive?: boolean | string;
}
