/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: Obtenir la liste paginée des utilisateurs (Admin uniquement)
 *     description: Permet à un administrateur de lister les comptes utilisateurs de la plateforme (clients et admins). Les comptes supprimés (soft-deleted) sont automatiquement exclus. Gère la recherche globale par texte, le filtrage par rôle/statut, ainsi que le tri.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Numéro de la page à retourner.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Nombre maximal d'éléments retournés par page.
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Recherche textuelle insensible à la casse sur firstName, lastName, email, ou fullName.
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [ADMIN, CUSTOMER]
 *         description: Filtrer par rôle.
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filtrer par statut d'activité (compte actif ou suspendu).
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Attribut de tri (e.g. createdAt, email, lastName).
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sens du tri.
 *     responses:
 *       200:
 *         description: Liste paginée récupérée avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UsersPaginatedResponse'
 *       400:
 *         description: Paramètres de requête invalides.
 *       401:
 *         description: Authentification requise (Token manquant ou expiré).
 *       403:
 *         description: Accès interdit (Rôle ADMIN requis).
 *       500:
 *         description: Erreur interne du serveur.
 * 
 * /api/users/{id}:
 *   get:
 *     summary: Récupérer les détails d'un utilisateur par ID (Propriétaire ou Admin)
 *     description: Permet à un administrateur d'accéder à n'importe quel profil d'utilisateur, ou à un client connecté de récupérer ses propres informations personnelles.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Identifiant unique (CUID) de l'utilisateur à récupérer.
 *     responses:
 *       200:
 *         description: Profil utilisateur récupéré avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserSuccessResponse'
 *       401:
 *         description: Authentification requise.
 *       403:
 *         description: Accès interdit (Tentative d'accéder au compte d'un autre utilisateur).
 *       404:
 *         description: Utilisateur non trouvé ou archivé (soft-deleted).
 *       500:
 *         description: Erreur interne du serveur.
 * 
 *   patch:
 *     summary: Mettre à jour le profil d'un utilisateur (Propriétaire ou Admin)
 *     description: Permet de mettre à jour les informations personnelles (firstName, lastName, email) d'un utilisateur connecté. Un client standard ne peut mettre à jour que son propre compte. Les validations d'unicité d'email et de format s'appliquent.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Identifiant unique (CUID) de l'utilisateur à modifier.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserInput'
 *     responses:
 *       200:
 *         description: Profil utilisateur mis à jour avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserSuccessResponse'
 *       400:
 *         description: Données d'entrée invalides (erreur de validation Zod).
 *       401:
 *         description: Authentification requise.
 *       403:
 *         description: Accès interdit (Tentative de modifier le compte d'un autre utilisateur).
 *       404:
 *         description: Utilisateur non trouvé.
 *       409:
 *         description: Conflit (L'adresse email est déjà prise).
 *       500:
 *         description: Erreur interne du serveur.
 * 
 *   delete:
 *     summary: Archiver un utilisateur par Soft-Delete (Admin uniquement)
 *     description: Supprime de façon logique (Soft-Delete) un compte utilisateur en renseignant l'attribut `deletedAt`. Les données ne sont jamais supprimées physiquement de la base de données PostgreSQL pour préserver l'intégrité référentielle des commandes et réservations. Les sessions actives du compte supprimé sont instantanément révoquées.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Identifiant unique (CUID) de l'utilisateur à archiver.
 *     responses:
 *       200:
 *         description: Utilisateur archivé avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Utilisateur supprimé (archivé) avec succès"
 *       401:
 *         description: Authentification requise.
 *       403:
 *         description: Accès interdit (Rôle ADMIN requis).
 *       404:
 *         description: Utilisateur non trouvé ou déjà archivé.
 *       500:
 *         description: Erreur interne du serveur.
 * 
 * /api/users/{id}/role:
 *   patch:
 *     summary: Modifier le rôle d'un utilisateur (Admin uniquement)
 *     description: Met à jour le rôle (ADMIN, CUSTOMER) d'un utilisateur spécifié. Protégé contre l'escalade de privilèges non autorisée.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Identifiant unique (CUID) de l'utilisateur.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserRoleInput'
 *     responses:
 *       200:
 *         description: Rôle utilisateur mis à jour avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserSuccessResponse'
 *       400:
 *         description: Données d'entrée invalides ou rôle manquant.
 *       401:
 *         description: Authentification requise.
 *       403:
 *         description: Accès interdit (Rôle ADMIN requis).
 *       404:
 *         description: Utilisateur non trouvé.
 *       500:
 *         description: Erreur interne du serveur.
 * 
 * /api/users/{id}/status:
 *   patch:
 *     summary: Activer ou suspendre le compte d'un utilisateur (Admin uniquement)
 *     description: Active ou désactive l'accès à la plateforme pour un utilisateur. Si le compte est désactivé (`isActive = false`), ses jetons actifs de session sont immédiatement révoqués en base de données, l'empêchant de continuer à naviguer ou de s'authentifier à nouveau.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Identifiant unique (CUID) de l'utilisateur.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserStatusInput'
 *     responses:
 *       200:
 *         description: Statut d'activité du compte mis à jour avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserSuccessResponse'
 *       400:
 *         description: Données d'entrée invalides.
 *       401:
 *         description: Authentification requise.
 *       403:
 *         description: Accès interdit (Rôle ADMIN requis).
 *       404:
 *         description: Utilisateur non trouvé.
 *       500:
 *         description: Erreur interne du serveur.
 */
export const usersSwaggerDocumentationPlaceholder = true;
