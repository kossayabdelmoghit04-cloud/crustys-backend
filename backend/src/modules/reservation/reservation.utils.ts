import { AppError } from '../../utils/appError';

/**
 * Validates if the reservation date is today or in the future.
 */
export const isReservationDateValid = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new AppError('Format de date invalide.', 400);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);

  return compareDate >= today;
};

/**
 * Validates if the reservation time falls within the allowed booking hours (10:00 - 23:00) and format is HH:MM.
 */
export const isReservationTimeValid = (time: string): boolean => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(time)) {
    throw new AppError('Le format d\'heure doit être HH:MM (24h).', 400);
  }

  const [hourStr, minuteStr] = time.split(':');
  const hour = Number(hourStr);
  const minutes = Number(minuteStr);

  if (hour < 10 || hour > 23) {
    return false;
  }
  if (hour === 23 && minutes > 0) {
    return false;
  }
  return true;
};

/**
 * Checks if reservation count is within the maximum slot capacity (default is 20).
 */
export const checkCapacityLimit = (currentBookings: number, maxCapacity: number = 20): boolean => {
  if (currentBookings < 0) {
    throw new AppError('Le nombre de réservations existantes ne peut pas être négatif.', 400);
  }
  return currentBookings < maxCapacity;
};
