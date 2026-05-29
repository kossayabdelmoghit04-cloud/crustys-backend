/**
 * @openapi
 * /api/reservations:
 *   post:
 *     summary: Créer une nouvelle réservation de table (Client ou Admin)
 *     description: Permet à un utilisateur de réserver une table. Le système valide automatiquement que la date n'est pas dans le passé (comparaison temporelle ISO 8601 en UTC), que l'heure se situe dans les plages d'ouverture du restaurant, et que le nombre maximum de convives (maximum 20 personnes) n'est pas dépassé. Des algorithmes d'allocation et de vérification des chevauchements de plages horaires s'appliquent.
 *     tags:
 *       - Reservations
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReservationInput'
 *     responses:
 *       201:
 *         description: Réservation créée et mise en attente (ou confirmée) avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReservationSuccessResponse'
 *       400:
 *         description: Erreur de validation (Date passée, format incorrect, capacité dépassée).
 *       401:
 *         description: Non authentifié.
 *       409:
 *         description: Conflit de réservation (Plus de table disponible pour ce créneau ou réservation doublon).
 *       422:
 *         description: Entité non traitable (Ex. restaurant fermé ce jour-là).
 *       500:
 *         description: Erreur interne du serveur.
 * 
 *   get:
 *     summary: Obtenir la liste paginée des réservations (Client ou Admin)
 *     description: Liste les réservations de la plateforme. Un utilisateur de rôle `CUSTOMER` obtiendra exclusivement ses propres réservations. Un utilisateur de rôle `ADMIN` accède à l'intégralité des réservations et peut filtrer par utilisateur, par statut, ou par date.
 *     tags:
 *       - Reservations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Index de la page.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Taille de la page de résultats.
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW]
 *         description: Filtrer par statut de réservation.
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtrer pour une date spécifique au format YYYY-MM-DD.
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 *         description: Filtrer par identifiant client (ADMIN uniquement).
 *     responses:
 *       200:
 *         description: Liste des réservations récupérée avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReservationsPaginatedResponse'
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Interdit (Tentative pour un CUSTOMER de spécifier un `customerId` autre que le sien).
 *       500:
 *         description: Erreur interne.
 * 
 * /api/reservations/{id}:
 *   get:
 *     summary: Récupérer les détails d'une réservation (Propriétaire ou Admin)
 *     description: Permet d'accéder au détail complet d'une réservation. Les contrôles de sécurité interdisent à un client d'accéder à la réservation d'un tiers.
 *     tags:
 *       - Reservations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID unique de la réservation.
 *     responses:
 *       200:
 *         description: Réservation récupérée avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReservationSuccessResponse'
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Accès interdit (Non propriétaire de la réservation).
 *       404:
 *         description: Réservation non trouvée.
 *       500:
 *         description: Erreur interne.
 * 
 *   patch:
 *     summary: Mettre à jour une réservation ou modifier son statut (Propriétaire ou Admin)
 *     description: Permet de modifier le créneau, le nombre d'invités ou le statut d'une réservation. Les clients peuvent annuler leur propre réservation (`CANCELLED`) sous réserve de respect des règles d'annulation tardive. Les administrateurs peuvent assigner des numéros de table, confirmer (`CONFIRMED`), marquer comme honorée (`COMPLETED`) ou non-honorée (`NO_SHOW`).
 *     tags:
 *       - Reservations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID de la réservation.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date-time
 *                 example: '2026-06-01T20:00:00.000Z'
 *               guests:
 *                 type: integer
 *                 example: 6
 *               specialRequests:
 *                 type: string
 *                 example: "Besoin d'une chaise haute pour bébé"
 *               status:
 *                 type: string
 *                 enum: [PENDING, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW]
 *                 example: CONFIRMED
 *               tableNumber:
 *                 type: integer
 *                 description: Numéro de table assigné (ADMIN uniquement)
 *                 example: 8
 *     responses:
 *       200:
 *         description: Réservation mise à jour avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReservationSuccessResponse'
 *       400:
 *         description: Données de mise à jour ou transition de statut invalides.
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Accès interdit (Tentative d'escalade ou modification non permise).
 *       404:
 *         description: Réservation non trouvée.
 *       409:
 *         description: Conflit de disponibilité de table.
 *       500:
 *         description: Erreur interne.
 * 
 *   delete:
 *     summary: Annuler ou supprimer une réservation
 *     description: Supprime définitivement une réservation de la base de données (ou procède à une annulation définitive selon la logique métier sous-jacente). Limité aux administrateurs ou au client propriétaire.
 *     tags:
 *       - Reservations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID de la réservation.
 *     responses:
 *       200:
 *         description: Réservation annulée ou supprimée avec succès.
 *         content:
 *           application/json:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *                 example: true
 *               message:
 *                 type: string
 *                 example: "Réservation supprimée avec succès"
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Interdit.
 *       404:
 *         description: Réservation introuvable.
 *       500:
 *         description: Erreur interne.
 */
export const reservationsSwaggerDocsPlaceholder = true;
