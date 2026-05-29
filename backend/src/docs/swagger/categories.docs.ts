/**
 * @openapi
 * /api/categories:
 *   get:
 *     summary: Obtenir la liste de toutes les catégories de produits
 *     description: Récupère l'intégralité des catégories actives sur la plateforme Crusty's Express. Cette route est publique et ne nécessite pas de jeton d'authentification.
 *     tags:
 *       - Categories
 *     responses:
 *       200:
 *         description: Liste des catégories récupérée avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoriesListResponse'
 *       500:
 *         description: Erreur interne du serveur.
 * 
 *   post:
 *     summary: Créer une nouvelle catégorie de produits (Admin uniquement)
 *     description: Permet à un administrateur d'enregistrer une nouvelle catégorie dans le catalogue de Crusty's Express (e.g., Burgers, Street Poutines, Boissons). Le `slug` d'URL unique est automatiquement généré à partir du nom.
 *     tags:
 *       - Categories
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoryInput'
 *     responses:
 *       201:
 *         description: Catégorie créée avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategorySuccessResponse'
 *       400:
 *         description: Données d'entrée invalides (Nom requis, format invalide).
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Accès interdit (Rôle ADMIN requis).
 *       409:
 *         description: Conflit (Nom de catégorie déjà existant ou slug dupliqué).
 *       500:
 *         description: Erreur interne du serveur.
 * 
 * /api/categories/{id}:
 *   get:
 *     summary: Récupérer une catégorie par son ID ou son Slug
 *     description: Permet d'extraire les détails complets d'une catégorie spécifique en fournissant son identifiant unique (UUID) ou son slug unique (e.g., 'burgers'). Route publique.
 *     tags:
 *       - Categories
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID ou Slug de la catégorie à obtenir.
 *     responses:
 *       200:
 *         description: Détails de la catégorie récupérés avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategorySuccessResponse'
 *       404:
 *         description: Catégorie non trouvée.
 *       500:
 *         description: Erreur interne du serveur.
 * 
 *   patch:
 *     summary: Modifier une catégorie existante (Admin uniquement)
 *     description: Permet à un administrateur de modifier les attributs d'une catégorie (nom, description, image, ou statut actif). Le slug d'URL est automatiquement recalculé et mis à jour si le nom change.
 *     tags:
 *       - Categories
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID de la catégorie à modifier.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoryInput'
 *     responses:
 *       200:
 *         description: Catégorie mise à jour avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategorySuccessResponse'
 *       400:
 *         description: Entrées invalides.
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Accès interdit (Rôle ADMIN requis).
 *       404:
 *         description: Catégorie non trouvée.
 *       409:
 *         description: Conflit (Le nouveau nom ou slug est déjà attribué).
 *       500:
 *         description: Erreur interne.
 * 
 *   delete:
 *     summary: Supprimer une catégorie (Admin uniquement)
 *     description: Supprime définitivement une catégorie de produits de la base de données. Attention, cette action supprimera également tous les produits qui lui sont rattachés par cascade.
 *     tags:
 *       - Categories
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID de la catégorie à supprimer.
 *     responses:
 *       200:
 *         description: Catégorie supprimée avec succès.
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
 *                   example: "Catégorie supprimée avec succès (suppression en cascade appliquée)"
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Accès interdit (Rôle ADMIN requis).
 *       404:
 *         description: Catégorie non trouvée.
 *       500:
 *         description: Erreur interne.
 */
export const categoriesSwaggerDocsPlaceholder = true;
