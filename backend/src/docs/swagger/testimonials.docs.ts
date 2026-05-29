/**
 * @swagger
 * tags:
 *   name: Testimonials
 *   description: Customer Reviews and Feedback Management
 */

/**
 * @swagger
 * /api/testimonials:
 *   get:
 *     summary: Retrieve approved testimonials
 *     description: Fetch list of approved customer reviews to display on the landing page showcase.
 *     tags: [Testimonials]
 *     responses:
 *       200:
 *         description: List of approved testimonials.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "cli2a19b80000abc123456xyz"
 *                       customerName:
 *                         type: string
 *                         example: "Mathieu Lemieux"
 *                       message:
 *                         type: string
 *                         example: "La meilleure poutine de Montréal ! Service super rapide."
 *                       rating:
 *                         type: integer
 *                         minimum: 1
 *                         maximum: 5
 *                         example: 5
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 */

/**
 * @swagger
 * /api/testimonials:
 *   post:
 *     summary: Submit a new testimonial
 *     description: Allow customers to leave their reviews about the experience. Testimonials are hidden until approved by an Admin.
 *     tags: [Testimonials]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerName
 *               - message
 *               - rating
 *             properties:
 *               customerName:
 *                 type: string
 *                 example: "Chantal L."
 *               message:
 *                 type: string
 *                 example: "Des portions très généreuses et le burger au poulet frit est délicieux !"
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *     responses:
 *       201:
 *         description: Testimonial submitted successfully.
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
 *                   example: "Témoignage soumis avec succès. En attente de validation."
 */

/**
 * @swagger
 * /api/testimonials/{id}/approve:
 *   patch:
 *     summary: Approve a testimonial (Admin only)
 *     description: Approve a submitted customer testimonial to make it visible publicly on the platform.
 *     tags: [Testimonials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Testimonial ID
 *     responses:
 *       200:
 *         description: Testimonial approved successfully.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 *       404:
 *         description: Testimonial not found.
 */
