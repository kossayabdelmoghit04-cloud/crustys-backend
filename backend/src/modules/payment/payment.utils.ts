import { AppError } from '../../utils/appError';

/**
 * Calculates refund amount. Can support partial refunds with restocking/fee deduction.
 */
export const calculateRefundAmount = (
  originalAmount: number,
  refundPercentage: number = 100,
  feeDeduction: number = 0
): number => {
  if (originalAmount < 0) {
    throw new AppError('Le montant d\'origine ne peut pas être négatif.', 400);
  }
  if (refundPercentage < 0 || refundPercentage > 100) {
    throw new AppError('Le pourcentage de remboursement doit être compris entre 0 et 100.', 400);
  }
  if (feeDeduction < 0) {
    throw new AppError('La déduction de frais ne peut pas être négative.', 400);
  }

  const refundBase = (originalAmount * refundPercentage) / 100;
  const netRefund = refundBase - feeDeduction;

  return Math.max(0, Number(netRefund.toFixed(2)));
};

/**
 * Maps database PaymentStatus enum to localized client strings.
 */
export const mapPaymentStatusToClient = (status: string): string => {
  const normalized = status.toUpperCase();
  switch (normalized) {
    case 'PENDING':
      return 'En attente';
    case 'PAID':
      return 'Payé';
    case 'FAILED':
      return 'Échoué';
    case 'REFUNDED':
      return 'Remboursé';
    default:
      return 'Inconnu';
  }
};
