/**
 * @openapi
 * /api/orders:
 *   post:
 *     summary: Passer une nouvelle commande (Client authentifié)
 *     description: Permet à un client connecté de passer une commande de street food. Le serveur valide la disponibilité des stocks pour chaque produit demandé, calcule automatiquement les prix unitaires, les sous-totaux, et le montant total brut de la commande. Les stocks de produits correspondants sont déduits en temps réel.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OrderInput'
 *     responses:
 *       201:
 *         description: Commande enregistrée et préparée avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderSuccessResponse'
 *       400:
 *         description: Panier vide, quantité incorrecte ou produit en rupture de stock.
 *       401:
 *         description: Non authentifié.
 *       404:
 *         description: Un ou plusieurs produits demandés sont introuvables.
 *       500:
 *         description: Erreur interne du serveur.
 * 
 *   get:
 *     summary: Obtenir l'historique des commandes (Client ou Admin)
 *     description: Permet de récupérer la liste des commandes. Les clients standards (`CUSTOMER`) ne recevront que leur propre historique personnel de commandes. Les administrateurs (`ADMIN`) accèdent à l'intégralité des commandes de tous les utilisateurs de la plateforme (avec filtres de pagination, tri, statut, etc.).
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page courante.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Éléments par page.
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, PREPARING, DELIVERING, DELIVERED, CANCELLED]
 *         description: Filtrer par statut de commande.
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [PENDING, PAID, FAILED, REFUNDED]
 *         description: Filtrer par statut de paiement.
 *     responses:
 *       200:
 *         description: Liste des commandes récupérée avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrdersPaginatedResponse'
 *       401:
 *         description: Non authentifié.
 *       500:
 *         description: Erreur interne.
 * 
 * /api/orders/{id}:
 *   get:
 *     summary: Récupérer les détails d'une commande (Propriétaire ou Admin)
 *     description: Extrait les informations de statut de livraison, les détails des articles commandés, l'historique de paiement et le montant global d'une commande par son UUID. Un client standard ne peut consulter que ses propres commandes.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID de la commande à consulter.
 *     responses:
 *       200:
 *         description: Commande récupérée avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderSuccessResponse'
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Accès interdit (Tentative d'accès à la commande d'un autre client).
 *       404:
 *         description: Commande non trouvée.
 *       500:
 *         description: Erreur interne.
 * 
 * /api/orders/{id}/status:
 *   patch:
 *     summary: Modifier le statut d'une commande (Admin uniquement)
 *     description: Permet à l'équipe de cuisine ou de livraison de faire progresser le cycle de vie de la commande (de `PENDING` à `CONFIRMED` -> `PREPARING` -> `DELIVERING` -> `DELIVERED` ou `CANCELLED`). Si une commande est annulée (`CANCELLED`), les stocks déduits sont automatiquement restitués aux produits.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID de la commande à modifier.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, CONFIRMED, PREPARING, DELIVERING, DELIVERED, CANCELLED]
 *                 description: Nouveau statut de la commande.
 *                 example: CONFIRMED
 *             required:
 *               - status
 *     responses:
 *       200:
 *         description: Statut de la commande mis à jour avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderSuccessResponse'
 *       400:
 *         description: Statut invalide ou transition de statut non permise.
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Accès interdit (ADMIN requis).
 *       404:
 *         description: Commande non trouvée.
 *       500:
 *         description: Erreur interne.
 */
export const ordersSwaggerDocsPlaceholder = true;
