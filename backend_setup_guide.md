# Guide d'Initialisation du Backend — Crusty’s Express

Ce document fournit un aperçu complet et les instructions d'utilisation pour l'initialisation professionnelle du backend Node.js + TypeScript de **Crusty’s Express**.

---

## 1. Commandes Terminal Complètes

Pour recréer ou initialiser cette configuration dans un dossier vide, les commandes suivantes ont été exécutées :

```bash
# 1. Création du dossier du projet et initialisation
mkdir backend
cd backend
npm init -y

# 2. Installation des dépendances de production
npm install express dotenv cors helmet morgan winston zod @prisma/client express-rate-limit bcryptjs jsonwebtoken

# 3. Installation des dépendances de développement
npm install -D typescript tsx nodemon rimraf @types/express @types/cors @types/morgan @types/node @types/bcryptjs @types/jsonwebtoken prisma

# 4. Initialisation de la configuration Prisma ORM
npx prisma init
```

---

## 2. Dépendances Installées

### Dépendances de Production (`dependencies`)
* **`express`** : Le framework web rapide et minimaliste.
* **`dotenv`** : Chargement sécurisé des variables d'environnement.
* **`cors`** : Middleware pour gérer le Cross-Origin Resource Sharing.
* **`helmet`** : Sécurisation de l'application Express en définissant divers en-têtes HTTP.
* **`morgan`** : Middleware de logging des requêtes HTTP.
* **`winston`** : Système de logging robuste et structuré pour la production.
* **`zod`** : Schémas de validation stricts pour les données d'entrée et les variables d'environnement.
* **`bcryptjs`** : Hashage sécurisé des mots de passe (sans compilation native C++ pour éviter les bugs sous Windows).
* **`jsonwebtoken`** : Génération et validation des jetons JWT pour l'authentification.
* **`@prisma/client`** : ORM moderne pour interagir de façon sécurisée avec PostgreSQL.
* **`express-rate-limit`** : Protection contre les attaques par force brute (limitation du débit de requêtes).

### Dépendances de Développement (`devDependencies`)
* **`typescript`** : Compilateur TypeScript officiel.
* **`tsx`** : Exécuteur TypeScript ultra-rapide basé sur `esbuild` pour le développement local.
* **`nodemon`** : Surveillance des fichiers et rechargement à chaud.
* **`rimraf`** : Nettoyage du dossier de build (`dist/`).
* **`prisma`** : CLI Prisma pour gérer les migrations et générer le client de base de données.
* **`@types/*`** : Déclarations de types TypeScript pour les bibliothèques JS utilisées.

---

## 3. Structure Initiale des Dossiers

Voici la structure de dossier professionnelle et modulaire créée sous `backend/` :

```text
backend/
├── prisma/
│   └── schema.prisma        # Schéma de base de données PostgreSQL
├── src/
│   ├── config/
│   │   └── env.ts           # Validation stricte des variables d'environnement (Zod)
│   ├── middleware/
│   │   ├── errorHandler.ts  # Middleware global de gestion des erreurs
│   │   └── notFound.ts      # Gestionnaire de routes inconnues (404)
│   ├── utils/
│   │   ├── appError.ts      # Classe d'erreur personnalisée (Operational Errors)
│   │   └── logger.ts        # Instance globale Winston pour les logs
│   ├── app.ts               # Configuration et middlewares de l'application Express
│   └── server.ts            # Point d'entrée de l'application
├── .env                     # Variables d'environnement locales (exclues de Git)
├── .env.example             # Modèle de configuration pour l'équipe
├── .gitignore               # Fichiers à ignorer par Git
├── package.json             # Scripts et dépendances
└── tsconfig.json            # Configuration stricte du compilateur TypeScript
```

---

## 4. Configuration de TypeScript (`tsconfig.json`)

Le fichier `tsconfig.json` a été configuré avec des règles strictes garantissant la qualité du code :

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts"]
}
```

---

## 5. Scripts NPM Professionnels (`package.json`)

Les scripts configurés permettent un flux de travail fluide en développement comme en production :

* `npm run dev` : Lance le serveur en mode développement avec rechargement automatique à chaud (`nodemon` + `tsx`).
* `npm run build` : Nettoie le dossier `dist/` et compile le code TypeScript en JavaScript moderne.
* `npm run start` : Exécute le code compilé en production.
* `npm run prisma:generate` : Génère le client Prisma TypeScript après modification du schéma.
* `npm run prisma:migrate` : Crée et applique les migrations de base de données.
* `npm run prisma:studio` : Ouvre l'interface graphique de Prisma pour explorer les données.

---

## 6. Configuration de Base pour Lancer le Serveur

### Validation des Variables d'Environnement (`src/config/env.ts`)
```typescript
import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url('DATABASE_URL doit être une URL valide'),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET doit faire au moins 8 caractères'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Configuration d\'environnement invalide :');
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

export const env = parsedEnv.data;
```

### Application Express (`src/app.ts`)
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { notFound } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const morganFormat = env.NODE_ENV === 'development' ? 'dev' : 'combined';
app.use(morgan(morganFormat, {
  stream: { write: (message) => logger.http(message.trim()) }
}));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
  });
});

app.use(notFound);
app.use(errorHandler);

export default app;
```

### Serveur et Processus (`src/server.ts`)
```typescript
import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Serveur en cours d'exécution en mode ${env.NODE_ENV} sur le port ${env.PORT}`);
});

process.on('unhandledRejection', (err: Error) => {
  logger.error('💥 Unhandled Rejection! Fermeture du serveur...');
  logger.error(err.message, { stack: err.stack });
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err: Error) => {
  logger.error('💥 Uncaught Exception! Fermeture immédiate du serveur...');
  logger.error(err.message, { stack: err.stack });
  process.exit(1);
});
```

---

## 7. Bonnes Pratiques Appliquées dès le Début

1. **Validation Stricte de l'Environnement** : L'utilisation de Zod empêche le serveur de démarrer avec des variables de configuration incorrectes ou manquantes.
2. **Logs Structurés Professionnels** : Morgan (logs HTTP) est connecté à Winston pour écrire des logs formatés avec des niveaux clairs (`error`, `warn`, `info`, `http`, `debug`) adaptés à la production.
3. **Sécurité dès l'Origine** : Intégration de `helmet` pour sécuriser les headers HTTP et configuration de CORS.
4. **Gestion Centralisée des Erreurs** : Séparation stricte entre les erreurs opérationnelles prévisibles (`AppError` : mauvaise requête, authentification invalide) et les bugs de programmation inattendus. Les détails sensibles comme les stack traces sont masqués en production.
5. **Robustesse du Processus Node** : Écoute des événements système `uncaughtException` et `unhandledRejection` pour forcer un arrêt propre et sécurisé du conteneur en cas d'erreur fatale (évitant les fuites de mémoire ou les états instables).
6. **Data Modeling Typé** : Configuration de Prisma PostgreSQL dès le départ avec des types robustes et des clés étrangères explicites.
