/**
 * @openapi
 * /api/products:
 *   get:
 *     summary: Obtenir la liste paginée et filtrée des produits
 *     description: Récupère la liste des produits actifs du menu. Permet de trier, paginer, rechercher textuellement (nom/description), filtrer par catégorie, par fourchette de prix, par produit mis en avant (featured) ou disponibilité de stock. Route publique.
 *     tags:
 *       - Products
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page courante de la pagination.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Nombre de produits par page.
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Recherche textuelle insensible à la casse dans le nom ou la description du produit.
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filtrer par slug de catégorie (e.g. 'burgers', 'street-poutines').
 *       - in: query
 *         name: featured
 *         schema:
 *           type: boolean
 *         description: Filtrer les produits mis en avant.
 *       - in: query
 *         name: priceMin
 *         schema:
 *           type: number
 *         description: Prix minimum de filtrage.
 *       - in: query
 *         name: priceMax
 *         schema:
 *           type: number
 *         description: Prix maximum de filtrage.
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Champ de tri (e.g., price, name, stockQuantity, createdAt).
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sens du tri.
 *     responses:
 *       200:
 *         description: Liste de produits paginée récupérée avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductsPaginatedResponse'
 *       400:
 *         description: Paramètres de requête invalides.
 *       500:
 *         description: Erreur interne du serveur.
 * 
 *   post:
 *     summary: Ajouter un nouveau produit au catalogue (Admin uniquement)
 *     description: Enregistre un nouveau produit dans le menu de Crusty's Express. Gère le téléversement de son image d'illustration principale via `multipart/form-data` ou via payload brut JSON si l'image est déjà hébergée.
 *     tags:
 *       - Products
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Fichier image du produit à téléverser (Formats acceptés JPEG, PNG, WEBP).
 *               name:
 *                 type: string
 *                 description: Nom du produit (unique).
 *                 example: "Spicy Crusty Chicken Burger"
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *                 description: UUID unique de la catégorie parente.
 *                 example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
 *               price:
 *                 type: number
 *                 format: float
 *                 description: Prix unitaire hors taxes.
 *                 example: 15.99
 *               description:
 *                 type: string
 *                 description: Description savoureuse du plat.
 *                 example: "Poulet croustillant frit aux épices de Montréal, salade de chou fraîche, et sauce secrète."
 *               stockQuantity:
 *                 type: integer
 *                 description: Nombre de portions disponibles (Stock initial).
 *                 example: 30
 *               calories:
 *                 type: integer
 *                 description: Nombre de calories estimées pour information nutritionnelle.
 *                 example: 710
 *               isFeatured:
 *                 type: boolean
 *                 description: Marquer le produit à mettre en valeur sur la vitrine.
 *                 default: false
 *               isAvailable:
 *                 type: boolean
 *                 description: Activer ou désactiver l'apparition du produit dans le menu client.
 *                 default: true
 *             required:
 *               - name
 *               - categoryId
 *               - price
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductInput'
 *     responses:
 *       201:
 *         description: Produit ajouté et configuré avec succès dans le catalogue.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductSuccessResponse'
 *       400:
 *         description: Format d'entrées invalide ou catégorie inexistante.
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Accès interdit (ADMIN requis).
 *       409:
 *         description: Conflit (Nom de produit déjà existant dans le catalogue).
 *       500:
 *         description: Erreur interne du serveur.
 * 
 * /api/products/{id}:
 *   get:
 *     summary: Récupérer les détails d'un produit par ID ou Slug
 *     description: Extrait les informations nutritionnelles, de stock, d'images secondaires, et le prix d'un produit spécifique en fournissant soit son identifiant unique (UUID), soit son slug d'URL unique. Route publique.
 *     tags:
 *       - Products
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID ou Slug unique du produit (e.g. 'classic-burger').
 *     responses:
 *       200:
 *         description: Produit récupéré avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductSuccessResponse'
 *       404:
 *         description: Produit non trouvé dans le catalogue.
 *       500:
 *         description: Erreur interne du serveur.
 * 
 *   patch:
 *     summary: Modifier un produit existant (Admin uniquement)
 *     description: Permet à un administrateur d'ajuster le prix, de modifier la catégorie, d'actualiser la quantité de stock ou de téléverser une nouvelle image principale pour un produit existant. Les modifications de stock recalculent dynamiquement l'état de disponibilité (`isAvailable`) si le stock tombe à 0.
 *     tags:
 *       - Products
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID du produit à modifier.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Nouveau fichier image de remplacement.
 *               name:
 *                 type: string
 *                 example: "Classic Burger XL"
 *               price:
 *                 type: number
 *                 example: 16.99
 *               discountPrice:
 *                 type: number
 *                 example: 13.99
 *               stockQuantity:
 *                 type: integer
 *                 example: 10
 *               isAvailable:
 *                 type: boolean
 *                 example: true
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductInput'
 *     responses:
 *       200:
 *         description: Produit mis à jour avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductSuccessResponse'
 *       400:
 *         description: Format d'entrée ou IDs invalides.
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Accès interdit (ADMIN requis).
 *       404:
 *         description: Produit non trouvé.
 *       409:
 *         description: Conflit (Le nouveau nom ou slug est déjà attribué).
 *       500:
 *         description: Erreur interne.
 * 
 *   delete:
 *     summary: Supprimer définitivement un produit du catalogue (Admin uniquement)
 *     description: Retire définitivement un produit de la base de données. Attention, si le produit est présent dans des commandes existantes, la suppression physique sera protégée ou gérée selon l'intégrité de la base de données.
 *     tags:
 *       - Products
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID unique du produit à éliminer.
 *     responses:
 *       200:
 *         description: Produit supprimé avec succès.
 *         content:
 *           application/json:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *                 example: true
 *               message:
 *                 type: string
 *                 example: "Produit supprimé du catalogue avec succès"
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Accès interdit (ADMIN requis).
 *       404:
 *         description: Produit non trouvé.
 *       500:
 *         description: Erreur interne.
 */
export const productsSwaggerDocsPlaceholder = true;
