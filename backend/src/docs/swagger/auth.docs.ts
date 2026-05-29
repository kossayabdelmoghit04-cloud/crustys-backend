/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication & Session Management System (Users & Administrators)
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new customer / user
 *     description: |
 *       Creates a new customer account in the database.
 *       Upon successful registration, it automatically signs the user in and returns the profile details 
 *       along with the JWT authentication tokens (Access Token and Refresh Token).
 *       The Refresh Token is also set inside a secure, HTTP-only cookie named 'refreshToken'.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthRequest'
 *           example:
 *             fullName: "Jean Tremblay"
 *             email: "jean.tremblay@gmail.com"
 *             password: "securePassword123"
 *             phone: "+15145551234"
 *     responses:
 *       201:
 *         description: User account successfully created.
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; Path=/; HttpOnly; Secure; SameSite=Strict
 *             description: Secure HTTP-only cookie containing the refresh token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *             example:
 *               status: "success"
 *               message: "Compte créé avec succès et utilisateur connecté."
 *               data:
 *                 user:
 *                   id: "123e4567-e89b-12d3-a456-426614174000"
 *                   fullName: "Jean Tremblay"
 *                   email: "jean.tremblay@gmail.com"
 *                   phone: "+15145551234"
 *                   avatar: null
 *                   isVerified: false
 *                   createdAt: "2026-05-23T15:00:00.000Z"
 *                   updatedAt: "2026-05-23T15:00:00.000Z"
 *                 tokens:
 *                   accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjNlNDU2Ny1lODliLTEyZDMtYTQ1Ni00MjY2MTQxNzQwMDAiLCJlbWFpbCI6ImplYW4udHJlbWJsYXlAZ21haWwuY29tIiwicm9sZSI6ImNsaWVudCJ9..."
 *                   refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjNlNDU2Ny1lODliLTEyZDMtYTQ1Ni00MjY2MTQxNzQwMDAifQ..."
 *       400:
 *         description: Invalid registration fields or validation failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: "error"
 *               message: "Erreur de validation des données"
 *               errors:
 *                 - path: ["email"]
 *                   message: "L'adresse email doit être valide"
 *                 - path: ["password"]
 *                   message: "Le mot de passe doit contenir au moins 6 caractères"
 *       409:
 *         description: Conflict. A user with the same email address already exists.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: "error"
 *               message: "Un compte avec cette adresse email existe déjà"
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate User or Administrator
 *     description: |
 *       Authenticates credentials (email and password).
 *       On success, returns the profile details (either administrator or user depending on the role)
 *       along with the JWT authentication tokens (Access Token and Refresh Token).
 *       The Refresh Token is also set inside a secure, HTTP-only cookie 'refreshToken'.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginInput'
 *           example:
 *             email: "admin@crustysexpress.com"
 *             password: "securePassword123"
 *     responses:
 *       200:
 *         description: Successfully authenticated. Returns profile and JWT tokens.
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; Path=/; HttpOnly; Secure; SameSite=Strict
 *             description: Secure HTTP-only cookie containing the refresh token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *             example:
 *               status: "success"
 *               message: "Connexion réussie"
 *               data:
 *                 admin:
 *                   id: "876e4567-e89b-12d3-a456-426614174099"
 *                   fullName: "Chef Crusty"
 *                   email: "admin@crustysexpress.com"
 *                   roleId: "998e4567-e89b-12d3-a456-426614174888"
 *                   createdAt: "2026-05-22T10:00:00.000Z"
 *                   updatedAt: "2026-05-22T10:00:00.000Z"
 *                 tokens:
 *                   accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                   refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Validation error or missing credentials fields.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: "error"
 *               message: "Erreur de validation"
 *               errors:
 *                 - path: ["email"]
 *                   message: "L'adresse email est requise"
 *       401:
 *         description: Unauthorized. Invalid email or password.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: "error"
 *               message: "Email ou mot de passe incorrect"
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Retrieve currently authenticated user profile
 *     description: Fetch detailed information about the currently logged-in user or admin using their JWT Access Token.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile details retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *             example:
 *               status: "success"
 *               data:
 *                 user:
 *                   id: "123e4567-e89b-12d3-a456-426614174000"
 *                   fullName: "Jean Tremblay"
 *                   email: "jean.tremblay@gmail.com"
 *                   phone: "+15145551234"
 *                   avatar: "https://cdn.crustysexpress.com/avatars/jean.jpg"
 *                   isVerified: true
 *                   createdAt: "2026-05-23T15:00:00.000Z"
 *                   updatedAt: "2026-05-23T15:00:00.000Z"
 *       401:
 *         description: Unauthorized. Missing, invalid, or expired Access Token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: "error"
 *               message: "Token d'accès manquant ou invalide"
 *       403:
 *         description: Forbidden. Insufficient rights or suspended account.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: "error"
 *               message: "Accès refusé. Compte non vérifié ou bloqué."
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh JWT Access Token
 *     description: |
 *       Exchanges a valid Refresh Token for a brand new Access Token (and sets a new Refresh Token in a cookie).
 *       The Refresh Token can be sent either inside the secure HTTP-only cookie 'refreshToken' (recommended)
 *       or directly in the JSON request body.
 *     tags: [Auth]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Optional refresh token if cookie is not used.
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Access token successfully refreshed.
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; Path=/; HttpOnly; Secure; SameSite=Strict
 *             description: Secure HTTP-only cookie containing the new refresh token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *             example:
 *               status: "success"
 *               message: "Tokens rafraîchis avec succès"
 *               data:
 *                 tokens:
 *                   accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.newAccessTokenHere..."
 *       401:
 *         description: Unauthorized. Refresh token is missing, invalid, or has expired.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: "error"
 *               message: "Refresh token invalide ou expiré"
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh JWT Access Token (Alias)
 *     description: |
 *       Exchanges a valid Refresh Token for a brand new Access Token. Legacy/Alias endpoint for `/api/auth/refresh-token`.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Access token successfully refreshed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Internal server error.
 */

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user / Terminate session
 *     description: |
 *       Clears the HTTP-only cookie containing the Refresh Token, invalidating the session on the client-side.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out successfully and cookie cleared.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Déconnexion réussie
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset email
 *     description: |
 *       Generates a secure password reset token and sends a transactional email to the requested address with a reset URL.
 *       For security reasons, this endpoint uses anti-enumeration techniques: it will always return a 200 OK success message even if the email does not exist in our database.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User account email address
 *                 example: "client@example.com"
 *     responses:
 *       200:
 *         description: Request accepted successfully.
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
 *                   example: "Si l'adresse email existe dans notre système, un e-mail de réinitialisation de mot de passe vous a été envoyé."
 *                 data:
 *                   type: object
 *                   example: {}
 *       400:
 *         description: Invalid registration fields or validation failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error.
 */

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Submit password reset token and change password
 *     description: |
 *       Validates the reset token and updates the user's password.
 *       Upon successful password update, the token is invalidated immediately to prevent replay attacks.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 description: The unhashed random reset token received via email
 *                 example: "d2d79c6d32155e81f185ef3dfc82736417f7bdc9235e2365a6e87b7a69bc9d5c"
 *               password:
 *                 type: string
 *                 description: The new secure password (min 8 chars, 1 uppercase, 1 lowercase, 1 number)
 *                 example: "NewSecurePassword123"
 *     responses:
 *       200:
 *         description: Password successfully updated.
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
 *                   example: "Votre mot de passe a été réinitialisé avec succès."
 *                 data:
 *                   type: object
 *                   example: {}
 *       400:
 *         description: Invalid, expired, or missing token or password validation error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error.
 */
