/**
 * Centralized Constants for the Users Module
 */
export const USERS_CONSTANTS = {
  // Fields compatible with standard database string searches (contains query)
  SEARCHABLE_FIELDS: ['firstName', 'lastName', 'email', 'fullName'],
  
  // Fields permitted for direct equality filtering in queries
  FILTER_FIELDS: ['role', 'isActive'],
  
  // Direct filter fields that must be parsed as booleans
  BOOLEAN_FIELDS: ['isActive'],
};
