import { AppError } from './appError';

/**
 * Formats a numeric amount to Canadian Dollar (CAD) currency representation.
 * Supports standard English format ($10.99) and French Canadian format (10,99 $).
 */
export const formatCurrencyCAD = (amount: number, locale: 'en' | 'fr' = 'en'): string => {
  if (isNaN(amount)) {
    throw new AppError('Le montant doit être un nombre valide.', 400);
  }

  if (locale === 'fr') {
    // French Canadian format: 10,99 $
    return amount.toLocaleString('fr-CA', {
      style: 'currency',
      currency: 'CAD',
    }).replace(/\s/g, ' '); // Standardize non-breaking spaces to standard spaces for testing comparison
  }

  // English Canadian format: $10.99
  return amount.toLocaleString('en-CA', {
    style: 'currency',
    currency: 'CAD',
  });
};

/**
 * Standardizes raw phone strings into standard +1 (514) 555-1234 formats or generic +E.164.
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    // 5145551234 -> (514) 555-1234
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    // 15145551234 -> +1 (514) 555-1234
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  return phone.trim();
};
