import filterXSS from 'xss';

/**
 * Nettoie une chaîne de caractères contre les failles XSS (balises HTML, scripts, etc.)
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  return filterXSS(input.trim());
}

/**
 * Nettoie récursivement les champs de type string d'un objet (utile pour req.body)
 */
export function sanitizeObject<T>(obj: T): T {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const result: any = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = obj[key];
      if (typeof val === 'string') {
        result[key] = sanitizeInput(val);
      } else if (typeof val === 'object' && val !== null) {
        result[key] = sanitizeObject(val);
      } else {
        result[key] = val;
      }
    }
  }

  return result as T;
}
