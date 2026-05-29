import { AppError } from '../../utils/appError';

/**
 * Calculates the actual product price to be charged, prioritizing the discount price if available.
 */
export const calculateProductPrice = (price: number, discountPrice: number | null): number => {
  if (price < 0) {
    throw new AppError('Le prix du produit ne peut pas être négatif.', 400);
  }
  if (discountPrice !== null) {
    if (discountPrice < 0) {
      throw new AppError('Le prix de réduction ne peut pas être négatif.', 400);
    }
    if (discountPrice > price) {
      throw new AppError('Le prix de réduction ne peut pas être supérieur au prix initial.', 400);
    }
    return discountPrice;
  }
  return price;
};

/**
 * Validates if the current stock is sufficient for the requested quantity.
 */
export const validateStock = (currentStock: number, requestedQuantity: number): boolean => {
  if (requestedQuantity <= 0) {
    throw new AppError('La quantité demandée doit être supérieure à zéro.', 400);
  }
  if (currentStock < 0) {
    throw new AppError('Le stock actuel ne peut pas être négatif.', 400);
  }
  return currentStock >= requestedQuantity;
};

/**
 * Applies a percentage discount to a price.
 */
export const applyDiscount = (price: number, discountPercentage: number): number => {
  if (price < 0) {
    throw new AppError('Le prix de base ne peut pas être négatif.', 400);
  }
  if (discountPercentage < 0 || discountPercentage > 100) {
    throw new AppError('Le pourcentage de réduction doit être compris entre 0 et 100.', 400);
  }
  const discountAmount = (price * discountPercentage) / 100;
  return Number((price - discountAmount).toFixed(2));
};

/**
 * Helper to calculate offset pagination metrics
 */
export const calculatePagination = (pageStr: string | number | undefined, limitStr: string | number | undefined) => {
  const page = Math.max(1, typeof pageStr === 'number' ? pageStr : parseInt(pageStr || '1', 10) || 1);
  const limit = Math.max(1, typeof limitStr === 'number' ? limitStr : parseInt(limitStr || '10', 10) || 10);
  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
  };
};
