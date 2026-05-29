import swaggerJSDoc from 'swagger-jsdoc';
import { getZodOpenApiComponents } from '../docs/openapi';

// Import schemas to ensure they get registered in the OpenAPIRegistry before compiling
import '../docs/schemas/common.schema';
import '../docs/schemas/auth.schema';
import '../docs/schemas/product.schema';
import '../docs/schemas/users.schema';
import '../docs/schemas/category.schema';
import '../docs/schemas/order.schema';
import '../docs/schemas/reservation.schema';
import '../docs/schemas/payment.schema';

/**
 * Enterprise Swagger-JSDoc Options configuration
 */
const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: "Crusty's Express API",
      version: '1.0.0',
      description: 'API REST d\'entreprise et de production de Crusty\'s Express, la plateforme canadienne premium de street food. Intègre la gestion des comptes utilisateurs, l\'authentification sécurisée avec rotation de jetons, le catalogue de produits, les commandes transactionnelles et la passerelle de paiement Stripe.',
      termsOfService: 'https://crustysexpress.com/terms',
      contact: {
        name: "Crusty's Express Backend Team",
        email: "backend@crustysexpress.com",
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000/api/v1',
        description: 'Serveur de Développement Local',
      },
      {
        url: 'https://api.crustysexpress.com/api/v1',
        description: 'Serveur de Production Principal (SaaS)',
      },
    ],
    externalDocs: {
      description: 'Documentation Complémentaire Postman & Directives API',
      url: 'https://documenter.getpostman.com/view/crustys-express-api',
    },
    tags: [
      { name: 'Auth', description: 'Système d\'authentification unifié, connexion client/admin, session et rotation de rafraîchissement JWT.' },
      { name: 'Users', description: 'Gestion des comptes utilisateurs, activation/suspension, archivage (Soft-Delete) et contrôle d\'accès (RBAC).' },
      { name: 'Categories', description: 'Taxonomie et classification des catégories de produits du menu (e.g. Burgers, Poutines).' },
      { name: 'Products', description: 'Gestion du menu de plats, indicateurs de stock, calories, visibilité et téléversement multimédia.' },
      { name: 'Orders', description: 'Traitement des commandes clients en temps réel, calculs de sous-totaux, statut de commande et restitution sur annulation.' },
      { name: 'Reservations', description: 'Système de réservation de tables physiques avec contraintes de plages horaires et de capacité d\'invités.' },
      { name: 'Payments', description: 'Intégration de Stripe PaymentIntent, gestion de remboursement administrative et vérification de signatures de Webhooks.' },
      { name: 'Testimonials', description: 'Avis clients, témoignages et modération administrative des retours d\'expérience.' },
      { name: 'Health', description: 'Surveillance de la santé du serveur et de l\'état des files d\'attente (BullMQ/Redis).' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Entrez votre jeton d\'accès JWT Bearer dans le format : Bearer <token>',
        },
      },
      schemas: {},
    },
  },
  // Auto-scan routes and jsdoc comments in both development (.ts) and production (.js) builds
  apis: [
    './src/docs/swagger/*.docs.ts',
    './src/docs/swagger/*.docs.js',
    './dist/docs/swagger/*.docs.js',
    './src/modules/**/*.route.ts',
    './src/modules/**/*.route.js',
    './dist/modules/**/*.route.js',
  ],
};

/**
 * Compile Swagger JSON Specification
 */
const swaggerSpec = swaggerJSDoc(options) as any;

// Dynamically fetch Zod components and merge them into the compiled JSDoc Swagger specification
const zodComponents = getZodOpenApiComponents();
if (zodComponents && zodComponents.schemas) {
  swaggerSpec.components = swaggerSpec.components || {};
  swaggerSpec.components.schemas = {
    ...swaggerSpec.components.schemas,
    ...zodComponents.schemas,
  };
}

export { swaggerSpec };
