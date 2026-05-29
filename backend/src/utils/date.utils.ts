import { AppError } from './appError';

/**
 * Standardizes any Date object or ISO string to an YYYY-MM-DD string representation.
 */
export const formatDateToISOString = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    throw new AppError('Format de date invalide pour la conversion.', 400);
  }
  return d.toISOString().slice(0, 10);
};

/**
 * Adds or subtracts days from a Date object.
 */
export const addDaysToDate = (date: Date, days: number): Date => {
  if (isNaN(date.getTime())) {
    throw new AppError('Date de départ invalide.', 400);
  }
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Normalizes a Date to the start of the day in Local/UTC timezone.
 */
export const startOfDay = (date: Date): Date => {
  if (isNaN(date.getTime())) {
    throw new AppError('Date invalide pour obtenir le début de journée.', 400);
  }
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};
