/**
 * Modèles de réponse standardisés pour l'ensemble de l'API Crusty's Express.
 * Permet d'uniformiser les payloads de retour pour les clients (Frontend, Mobile, tests).
 */

export interface ApiSuccessResponse<T> {
  status: 'success';
  message?: string;
  data: T;
}

export interface ApiErrorResponse {
  status: 'error' | 'fail';
  message: string;
  errors?: Array<{
    field?: string;
    message: string;
  }>;
  stack?: string;
}
