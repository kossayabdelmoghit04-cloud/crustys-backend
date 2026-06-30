import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../utils/prisma';
import { logger } from '../../utils/logger';
import { AuditService } from './audit.service';
import { Prisma } from '@prisma/client';

export interface AuditTrailOptions {
  action: string;
  entity?: string;
  getEntityId?: (req: Request) => string | undefined;
}

/**
 * Express middleware to automatically log route actions to the database.
 */
export const auditTrail = (options: AuditTrailOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Déterminer l'identifiant de la ressource concernée
      let entityId = options.getEntityId 
        ? options.getEntityId(req) 
        : req.params.id || req.params.uuid || undefined;

      let oldValue: Prisma.InputJsonValue | null = null;

      // 2. Si c'est une modification (PUT/PATCH/DELETE) et qu'on a un ID,
      // on récupère l'ancienne valeur en base de données avant que l'action s'exécute.
      if (entityId && options.entity && (req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE')) {
        try {
          // Normalisation du nom du modèle Prisma (ex: "Product" -> "product")
          const modelName = options.entity.charAt(0).toLowerCase() + options.entity.slice(1);
          const prismaModel = (prisma as unknown as Record<string, unknown>)[modelName] as { findUnique?: (args: { where: { id: string } }) => Promise<unknown> } | undefined;
          if (prismaModel && typeof prismaModel.findUnique === 'function') {
            oldValue = (await prismaModel.findUnique({ where: { id: entityId } })) as Prisma.InputJsonValue;
          }
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          logger.warn(`[Audit Middleware] Impossible de récupérer l'état précédent de l'entité ${options.entity} (ID: ${entityId}): ${errMsg}`);
        }
      }

      // 3. Intercepter la réponse HTTP pour extraire la nouvelle valeur et écrire le log en arrière-plan
      const originalJson = res.json;
      res.json = function (body: unknown) {
        res.json = originalJson;
        const returnedJson = originalJson.call(this, body as Parameters<typeof originalJson>[0]);

        // N'historiser que les réponses HTTP réussies (2xx)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            // Informations utilisateur tirées de req.user
            let userId = req.user?.userId || req.user?.adminId || null;
            let userEmail = req.user?.email || null;
            let role = req.user?.role || null;

            // Gestion spécifique des actions d'authentification et de création
            let newValue = null;
            const bodyAny = body as any;
            if (options.action === 'auth_login' && bodyAny?.data) {
              const userObj = bodyAny.data.user || bodyAny.data.admin;
              if (userObj) {
                userId = userObj.id;
                userEmail = userObj.email;
                role = userObj.role || (bodyAny.data.admin ? 'ADMIN' : 'CUSTOMER');
              }
            } else if (options.action === 'auth_register' && bodyAny?.data?.user) {
              userId = bodyAny.data.user.id;
              userEmail = bodyAny.data.user.email;
              role = bodyAny.data.user.role || 'CUSTOMER';
            } else if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
              newValue = bodyAny?.data || bodyAny;
            }

            // Si l'ID de l'entité n'était pas dans la requête (POST/création),
            // on essaie de le récupérer dans la réponse.
            const finalEntityId = entityId || bodyAny?.data?.id || bodyAny?.id || null;

            // Infos complémentaires
            const ipAddress = req.ip || req.socket.remoteAddress || null;
            const userAgent = req.headers['user-agent'] || null;

            // Écriture asynchrone du log
            AuditService.create({
              userId,
              userEmail,
              role,
              action: options.action,
              entity: options.entity || null,
              entityId: finalEntityId ? String(finalEntityId) : null,
              oldValue: oldValue as Prisma.InputJsonValue,
              newValue: newValue as Prisma.InputJsonValue,
              ipAddress,
              userAgent,
            }).catch((err: unknown) => {
              const errMsg = err instanceof Error ? err.message : String(err);
              logger.error(`[Audit Middleware] Échec de l'écriture du log d'audit : ${errMsg}`);
            });
          } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : String(err);
            logger.error(`[Audit Middleware] Erreur lors de la capture des métadonnées d'audit : ${errMsg}`);
          }
        }

        return returnedJson;
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error(`[Audit Middleware] Erreur inattendue dans le middleware : ${errMsg}`);
    }

    next();
  };
};
