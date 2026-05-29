import { AppError } from '../../utils/appError';

/**
 * Calculates the total price of an order from its line items.
 */
export const calculateOrderTotal = (items: Array<{ price: number; quantity: number }>): number => {
  if (!items || items.length === 0) {
    return 0;
  }

  let total = 0;
  for (const item of items) {
    if (item.price < 0) {
      throw new AppError('Le prix de l\'article ne peut pas être négatif.', 400);
    }
    if (item.quantity <= 0) {
      throw new AppError('La quantité d\'un article doit être supérieure à zéro.', 400);
    }
    total += item.price * item.quantity;
  }

  return Number(total.toFixed(2));
};

/**
 * Calculates Canadian tax (e.g., GST or combined GST/QST) on an order amount.
 * Standard tax rate defaults to 14.975% (combined 5% GST + 9.975% PST/QST) or a specified rate.
 */
export const calculateOrderTax = (subtotal: number, taxRatePercentage: number = 14.975): number => {
  if (subtotal < 0) {
    throw new AppError('Le sous-total ne peut pas être négatif.', 400);
  }
  if (taxRatePercentage < 0 || taxRatePercentage > 100) {
    throw new AppError('Le taux de taxe doit être compris entre 0 et 100.', 400);
  }

  const taxAmount = (subtotal * taxRatePercentage) / 100;
  return Math.round(taxAmount * 100) / 100;
};
