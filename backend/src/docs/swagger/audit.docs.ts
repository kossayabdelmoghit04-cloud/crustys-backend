/**
 * @swagger
 * tags:
 *   name: Audit Logs
 *   description: Gestion administrative des logs d'audit et de l'historique des modifications du système.
 */

/**
 * @swagger
 * /audit-logs:
 *   get:
 *     summary: Récupérer la liste des logs d'audit (paginée et filtrée)
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Numéro de la page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Nombre d'éléments par page (max 100)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Date de début pour le filtrage (ISO-8601)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Date de fin pour le filtrage (ISO-8601)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filtrer par identifiant utilisateur
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filtrer par action spécifique (ex. auth_login, product_create)
 *       - in: query
 *         name: entity
 *         schema:
 *           type: string
 *         description: Filtrer par entité modifiée (ex. Product, Category, Order)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Recherche textuelle (recherche dans l'email, l'action, l'entité, l'agent utilisateur ou l'adresse IP)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Champ à utiliser pour le tri
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Ordre de tri
 *     responses:
 *       200:
 *         description: Liste des logs d'audit récupérée avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     logs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AuditLog'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       401:
 *         description: Authentification requise.
 *       403:
 *         description: Droits insuffisants (requiert la permission read:auditlogs).
 */

/**
 * @swagger
 * /audit-logs/export:
 *   get:
 *     summary: Exporter tous les logs d'audit correspondants à des filtres (sans pagination)
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: entity
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, xlsx, json]
 *           default: json
 *         description: Format d'export du fichier
 *     responses:
 *       200:
 *         description: Fichier exporté avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AuditLog'
 *           text/csv:
 *             schema:
 *               type: string
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Authentification requise.
 *       403:
 *         description: Droits insuffisants (requiert la permission export:auditlogs).
 */

/**
 * @swagger
 * /audit-logs/{id}:
 *   get:
 *     summary: Récupérer les détails d'un log d'audit par son ID
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID unique du log d'audit
 *     responses:
 *       200:
 *         description: Détails du log d'audit récupérés.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/AuditLog'
 *       401:
 *         description: Authentification requise.
 *       403:
 *         description: Droits insuffisants (requiert la permission read:auditlogs).
 *       404:
 *         description: Log d'audit introuvable.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AuditLog:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: d3b07384-d113-4956-a5db-80d4b68e9f5e
 *         userId:
 *           type: string
 *           nullable: true
 *           example: usr_123456
 *         userEmail:
 *           type: string
 *           nullable: true
 *           example: admin@crustys.com
 *         role:
 *           type: string
 *           nullable: true
 *           example: ADMIN
 *         action:
 *           type: string
 *           example: product_create
 *         entity:
 *           type: string
 *           nullable: true
 *           example: Product
 *         entityId:
 *           type: string
 *           nullable: true
 *           example: prod_78910
 *         oldValue:
 *           type: object
 *           nullable: true
 *           description: Représentation JSON de l'ancien état (pour modifications/suppressions)
 *         newValue:
 *           type: object
 *           nullable: true
 *           description: Représentation JSON du nouvel état (pour créations/modifications)
 *         ipAddress:
 *           type: string
 *           nullable: true
 *           example: 127.0.0.1
 *         userAgent:
 *           type: string
 *           nullable: true
 *           example: Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: 2026-06-14T17:59:56Z
 */
