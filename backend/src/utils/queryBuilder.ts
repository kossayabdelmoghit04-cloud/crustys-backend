/**
 * Reusable Query Builder for Prisma pagination, filtering, searching, and sorting.
 * Fully compatible with Users, Products, Orders, and Reservations modules.
 */

export interface QueryParams {
  page?: number | string;
  limit?: number | string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: any;
}

export interface BuildQueryParamsOptions {
  searchableFields?: string[]; // Fields to apply the global text search (e.g., ['firstName', 'email'])
  filterFields?: string[];     // Fields that can be directly filtered (e.g., ['role', 'isActive'])
  booleanFields?: string[];    // Direct filter fields that need boolean conversion
}

export interface PrismaQueryBuildResult {
  where: any;
  orderBy: any;
  skip: number;
  take: number;
  page: number;
  limit: number;
}

/**
 * Builds Prisma-compatible query options from standard HTTP query parameters.
 */
export function buildPrismaQuery(
  params: QueryParams,
  options: BuildQueryParamsOptions = {}
): PrismaQueryBuildResult {
  // 1. Pagination Boundaries (Defensive boundaries to prevent database DOS attacks)
  const page = Math.max(1, parseInt(params.page as string, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(params.limit as string, 10) || 10));
  const skip = (page - 1) * limit;

  const where: any = {};
  const andConditions: any[] = [];

  // 2. Text Search (OR across all searchable fields, case-insensitive)
  if (params.search && options.searchableFields && options.searchableFields.length > 0) {
    const searchVal = params.search.trim();
    const orConditions = options.searchableFields.map((field) => ({
      [field]: {
        contains: searchVal,
        mode: 'insensitive',
      },
    }));
    andConditions.push({ OR: orConditions });
  }

  // 3. Direct Filters (e.g., role=ADMIN or isActive=true)
  if (options.filterFields) {
    options.filterFields.forEach((field) => {
      if (params[field] !== undefined && params[field] !== null && params[field] !== '') {
        let value = params[field];

        // Convert string representation of booleans to true booleans
        if (options.booleanFields?.includes(field)) {
          value = value === 'true' || value === true;
        }

        andConditions.push({ [field]: value });
      }
    });
  }

  // Assemble the where block
  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  // 4. Sorting (Defaults to descending order of createdAt)
  const sortBy = params.sortBy || 'createdAt';
  const sortOrder = params.sortOrder === 'asc' ? 'asc' : 'desc';
  const orderBy = { [sortBy]: sortOrder };

  return {
    where,
    orderBy,
    skip,
    take: limit,
    page,
    limit,
  };
}

/**
 * Helper to construct a standardized, scalable paginated response envelope
 */
export interface PaginatedResult<T> {
  success: boolean;
  message: string;
  data: {
    items: T[];
    meta: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
}

export function formatPaginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
  message = 'Données récupérées avec succès'
): PaginatedResult<T> {
  const pages = Math.ceil(total / limit) || 1;
  return {
    success: true,
    message,
    data: {
      items,
      meta: {
        total,
        page,
        limit,
        pages,
      },
    },
  };
}
