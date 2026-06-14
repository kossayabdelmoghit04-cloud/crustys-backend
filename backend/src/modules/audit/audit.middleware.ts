import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../utils/prisma';
import { logger } from '../../utils/logger';
import { AuditService } from './audit.service';

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

      let oldValue: any = null;

      // 2. Si c'est une modification (PUT/PATCH/DELETE) et qu'on a un ID,
      // on récupère l'ancienne valeur en base de données avant que l'action s'exécute.
      if (entityId && options.entity && (req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE')) {
        try {
          // Normalisation du nom du modèle Prisma (ex: "Product" -> "product")
          const modelName = options.entity.charAt(0).toLowerCase() + options.entity.slice(1);
          const prismaModel = (prisma as any)[modelName];
          if (prismaModel && typeof prismaModel.findUnique === 'function') {
            oldValue = await prismaModel.findUnique({ where: { id: entityId } });
          }
        } catch (err: any) {
          logger.warn(`[Audit Middleware] Impossible de récupérer l'état précédent de l'entité ${options.entity} (ID: ${entityId}): ${err.message}`);
        }
      }

      // 3. Intercepter la réponse HTTP pour extraire la nouvelle valeur et écrire le log en arrière-plan
      const originalJson = res.json;
      res.json = function (body: any) {
        res.json = originalJson;
        const returnedJson = originalJson.call(this, body);

        // N'historiser que les réponses HTTP réussies (2xx)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            // Informations utilisateur tirées de req.user
            let userId = req.user?.userId || req.user?.adminId || null;
            let userEmail = req.user?.email || null;
            let role = req.user?.role || null;

            // Gestion spécifique des actions d'authentification et de création
            let newValue = null;
            if (options.action === 'auth_login' && body?.data) {
              const userObj = body.data.user || body.data.admin;
              if (userObj) {
                userId = userObj.id;
                userEmail = userObj.email;
                role = userObj.role || (body.data.admin ? 'ADMIN' : 'CUSTOMER');
              }
            } else if (options.action === 'auth_register' && body?.data?.user) {
              userId = body.data.user.id;
              userEmail = body.data.user.email;
              role = body.data.user.role || 'CUSTOMER';
            } else if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
              newValue = body?.data || body;
            }

            // Si l'ID de l'entité n'était pas dans la requête (POST/création),
            // on essaie de le récupérer dans la réponse.
            const finalEntityId = entityId || body?.data?.id || body?.id || null;

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
              oldValue,
              newValue,
              ipAddress,
              userAgent,
            }).catch((err: any) => {
              logger.error(`[Audit Middleware] Échec de l'écriture du log d'audit : ${err.message}`);
            });
          } catch (err: any) {
            logger.error(`[Audit Middleware] Erreur lors de la capture des métadonnées d'audit : ${err.message}`);
          }
        }

        return returnedJson;
      };
    } catch (err: any) {
      logger.error(`[Audit Middleware] Erreur inattendue dans le middleware : ${err.message}`);
    }

    next();
  };
};
