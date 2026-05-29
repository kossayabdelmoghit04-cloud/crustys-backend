/**
 * @openapi
 * /api/payments/create-intent:
 *   post:
 *     summary: Créer un Stripe PaymentIntent pour une commande (Client connecté)
 *     description: Initialise le processus de paiement sécurisé pour une commande spécifique. Calcule le montant total à facturer à partir de la commande enregistrée, puis crée un PaymentIntent Stripe. Retourne le `clientSecret` requis côté application front-end pour finaliser la saisie bancaire en conformité PCI-DSS (sans que les cartes ne transitent par nos serveurs).
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         schema:
 *           type: string
 *         description: Clé unique pour éviter les doubles facturations en cas de replay réseau.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentIntentInput'
 *     responses:
 *       200:
 *         description: PaymentIntent initialisé avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentIntentResponse'
 *       400:
 *         description: Commande déjà payée, annulée ou invalide.
 *       401:
 *         description: Non authentifié.
 *       404:
 *         description: Commande non trouvée.
 *       500:
 *         description: Erreur lors de la communication avec la passerelle Stripe.
 * 
 * /api/payments/webhook:
 *   post:
 *     summary: Point de réception des webhooks Stripe (Public / Vérification de signature)
 *     description: Endpoint public appelé directement par Stripe lors des événements de paiement. **Attention - Cette route ne doit pas être protégée par un token JWT.** Elle requiert la validation de la signature Stripe via l'en-tête `Stripe-Signature` et le traitement du corps brut de la requête (Raw Request Body) pour éviter les rejeux de requêtes.
 *     tags:
 *       - Payments
 *     parameters:
 *       - in: header
 *         name: Stripe-Signature
 *         required: true
 *         schema:
 *           type: string
 *         description: Signature cryptographique Stripe pour valider la provenance de la requête.
 *         example: "t=1716480000,v1=abcde12345..."
 *     requestBody:
 *       required: true
 *       description: Payload brut envoyé par Stripe.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WebhookEvent'
 *     responses:
 *       200:
 *         description: Événement traité avec succès par l'application (Statuts mis à jour, stocks confirmés).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 received:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Signature invalide ou payload corrompu.
 *       500:
 *         description: Erreur lors du traitement de l'événement.
 * 
 * /api/payments/refund:
 *   post:
 *     summary: Effectuer un remboursement total ou partiel d'un paiement (Admin uniquement)
 *     description: Permet à un administrateur d'ordonner un remboursement via Stripe pour un paiement complété. Si le remboursement est validé par Stripe, le montant total ou partiel est re-crédité sur le moyen de paiement d'origine et le statut de la commande bascule en `REFUNDED` ou `PARTIALLY_REFUNDED`.
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefundInput'
 *     responses:
 *       200:
 *         description: Remboursement traité et enregistré avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RefundResponse'
 *       400:
 *         description: Paramètres incorrects (Montant supérieur au paiement initial, transaction non éligible).
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Accès interdit (ADMIN requis).
 *       404:
 *         description: Transaction ou paiement introuvable.
 *       500:
 *         description: Échec du traitement Stripe.
 * 
 * /api/payments/{id}:
 *   get:
 *     summary: Consulter les détails d'une transaction de paiement (Client ou Admin)
 *     description: Permet de vérifier les informations de paiement Stripe, le statut et l'historique d'une transaction. Les clients ne peuvent interroger que les transactions liées à leurs propres commandes.
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID de la transaction ou ID PaymentIntent Stripe.
 *     responses:
 *       200:
 *         description: Informations de transaction récupérées avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payment'
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Accès interdit (Non propriétaire de la commande payée).
 *       404:
 *         description: Transaction introuvable.
 *       500:
 *         description: Erreur interne.
 */
export const paymentsSwaggerDocsPlaceholder = true;
