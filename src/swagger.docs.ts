/**
 * Central Swagger/OpenAPI documentation for PickFoo Restaurant API.
 * All endpoints are listed here for /api-docs.
 * (components/securitySchemes are defined in index.ts)
 */

// ==================== Health ====================

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is running
 */
// (route defined in index.ts)

// ==================== Auth ====================

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               role: { type: string, enum: [owner] }
 *               profilePicture: { type: string }
 *     responses:
 *       200: { description: OTP sent to email }
 *       400: { description: User exists or invalid input }
 */
/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Sets cookies and returns user }
 *       401: { description: Invalid credentials }
 */
/**
 * @swagger
 * /api/v1/auth/refresh-token:
 *   post:
 *     summary: Refresh access token using refresh token cookie
 *     tags: [Auth]
 *     responses:
 *       200: { description: New tokens set in cookies }
 *       401: { description: Invalid or expired refresh token }
 */
/**
 * @swagger
 * /api/v1/auth/verify-email:
 *   post:
 *     summary: Verify email with OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email: { type: string }
 *               otp: { type: string }
 *     responses:
 *       200: { description: Email verified, user created }
 *       400: { description: Invalid or expired OTP }
 */
/**
 * @swagger
 * /api/v1/auth/resend-otp:
 *   post:
 *     summary: Resend OTP to email
 *     tags: [Auth]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *     responses:
 *       200: { description: OTP sent }
 *       400: { description: No pending registration for email }
 */
/**
 * @swagger
 * /api/v1/auth/logout:
 *   get:
 *     summary: Logout (clear auth cookies)
 *     tags: [Auth]
 *     responses:
 *       200: { description: Logged out }
 */
/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current user
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Current user }
 *       401: { description: Not authorized }
 */

// ==================== Restaurants ====================

/**
 * @swagger
 * /api/v1/restaurants:
 *   post:
 *     summary: Create restaurant (owner only, one per owner)
 *     description: An owner can only have one restaurant. Returns 400 if they already have one.
 *     tags: [Restaurants]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               address: { type: string }
 *               phone: { type: string }
 *               email: { type: string }
 *               description: { type: string }
 *               cuisineTypes: { type: array, items: { type: string } }
 *               openingHours: { type: object }
 *     responses:
 *       201: { description: Restaurant created }
 *       400: { description: Owner already has a restaurant }
 *       401: { description: Not authorized }
 */
/**
 * @swagger
 * /api/v1/restaurants/my-restaurants:
 *   get:
 *     summary: Get current owner's restaurant (0 or 1 item)
 *     description: Returns array with at most one restaurant. Use for backward compatibility.
 *     tags: [Restaurants]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of restaurants (0 or 1 item) }
 *       401: { description: Not authorized }
 */
/**
 * @swagger
 * /api/v1/restaurants/my-restaurant:
 *   get:
 *     summary: Get current owner's single restaurant
 *     description: Returns the owner's restaurant or null if none. Use for dashboard.
 *     tags: [Restaurants]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Single restaurant object or data null }
 *       401: { description: Not authorized }
 */
/**
 * @swagger
 * /api/v1/restaurants/{id}:
 *   get:
 *     summary: Get restaurant by ID
 *     tags: [Restaurants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Restaurant details }
 *       404: { description: Not found }
 *   put:
 *     summary: Update restaurant (owner only)
 *     tags: [Restaurants]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               address: { type: string }
 *               phone: { type: string }
 *               email: { type: string }
 *               description: { type: string }
 *               cuisineTypes: { type: array, items: { type: string } }
 *               openingHours: { type: object }
 *     responses:
 *       200: { description: Updated restaurant }
 *       401: { description: Not authorized }
 *       404: { description: Not found }
 *   delete:
 *     summary: Delete restaurant (owner only)
 *     tags: [Restaurants]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 *       401: { description: Not authorized }
 *       404: { description: Not found }
 */
/**
 * @swagger
 * /api/v1/restaurants/{id}/submit-verification:
 *   put:
 *     summary: Submit restaurant for verification (owner only)
 *     tags: [Restaurants]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Submitted for verification }
 *       401: { description: Not authorized }
 */

// ==================== Menu ====================

/**
 * @swagger
 * /api/v1/menu:
 *   post:
 *     summary: Create menu item (owner only)
 *     tags: [Menu]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *               category: { type: string }
 *               image: { type: string }
 *               dietaryTags: { type: array, items: { type: string } }
 *               ingredients: { type: array, items: { type: string }, description: List of ingredients }
 *     responses:
 *       201: { description: Menu item created }
 *       401: { description: Not authorized }
 *   get:
 *     summary: Get current owner's menu items
 *     tags: [Menu]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of menu items }
 *       401: { description: Not authorized }
 */
/**
 * @swagger
 * /api/v1/menu/restaurant/{restaurantId}:
 *   get:
 *     summary: Get menu for a restaurant (public)
 *     tags: [Menu]
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Restaurant menu with categories }
 *       404: { description: Not found }
 */
/**
 * @swagger
 * /api/v1/menu/{id}:
 *   put:
 *     summary: Update menu item (owner only)
 *     tags: [Menu]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *               category: { type: string }
 *               image: { type: string }
 *               dietaryTags: { type: array, items: { type: string } }
 *               ingredients: { type: array, items: { type: string }, description: List of ingredients }
 *     responses:
 *       200: { description: Updated menu item }
 *       401: { description: Not authorized }
 *       404: { description: Not found }
 *   delete:
 *     summary: Delete menu item (owner only)
 *     tags: [Menu]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 *       401: { description: Not authorized }
 *       404: { description: Not found }
 */
/**
 * @swagger
 * /api/v1/menu/{id}/assign-restaurants:
 *   put:
 *     summary: Assign menu item to restaurants (owner only)
 *     tags: [Menu]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               restaurantIds: { type: array, items: { type: string } }
 *     responses:
 *       200: { description: Assignment updated }
 *       401: { description: Not authorized }
 */

// ==================== Menu Categories ====================

/**
 * @swagger
 * /api/v1/menu/categories:
 *   post:
 *     summary: Create category (owner only)
 *     tags: [Menu Categories]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               sortOrder: { type: number }
 *     responses:
 *       201: { description: Category created }
 *       401: { description: Not authorized }
 *   get:
 *     summary: Get current owner's categories
 *     tags: [Menu Categories]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of categories }
 *       401: { description: Not authorized }
 */
/**
 * @swagger
 * /api/v1/menu/categories/{id}:
 *   put:
 *     summary: Update category (owner only)
 *     tags: [Menu Categories]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               sortOrder: { type: number }
 *     responses:
 *       200: { description: Updated category }
 *       401: { description: Not authorized }
 *       404: { description: Not found }
 *   delete:
 *     summary: Delete category (owner only)
 *     tags: [Menu Categories]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 *       401: { description: Not authorized }
 *       404: { description: Not found }
 */

// ==================== Orders ====================

/**
 * @swagger
 * /api/v1/orders/my-orders:
 *   get:
 *     summary: Get current owner's orders
 *     tags: [Orders]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of orders }
 *       401: { description: Not authorized }
 */
/**
 * @swagger
 * /api/v1/orders/{id}/status:
 *   put:
 *     summary: Update order status (owner only)
 *     tags: [Orders]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string }
 *     responses:
 *       200: { description: Order status updated }
 *       401: { description: Not authorized }
 *       404: { description: Not found }
 */

// ==================== Reviews ====================

/**
 * @swagger
 * /api/v1/reviews/my-reviews:
 *   get:
 *     summary: Get reviews for owner's restaurants
 *     tags: [Reviews]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of reviews }
 *       401: { description: Not authorized }
 */

// ==================== Transactions ====================

/**
 * @swagger
 * /api/v1/transactions:
 *   get:
 *     summary: Get current owner's transactions
 *     tags: [Transactions]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of transactions }
 *       401: { description: Not authorized }
 */
/**
 * @swagger
 * /api/v1/transactions/stats:
 *   get:
 *     summary: Get transaction statistics (owner only)
 *     tags: [Transactions]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Transaction stats }
 *       401: { description: Not authorized }
 */

// ==================== Upload ====================

/**
 * @swagger
 * /api/v1/upload:
 *   post:
 *     summary: Upload file (S3)
 *     tags: [Upload]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       200: { description: File URL returned }
 *       401: { description: Not authorized }
 *   delete:
 *     summary: Delete file by URL (owner only)
 *     tags: [Upload]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url: { type: string }
 *     responses:
 *       200: { description: File deleted }
 *       401: { description: Not authorized }
 */

// ==================== Notify (internal) ====================

/**
 * @swagger
 * /api/v1/notify/status-update:
 *   post:
 *     summary: Notify owner of restaurant status update (called by admin backend)
 *     tags: [Notify]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               restaurantName: { type: string }
 *               status: { type: string }
 *               ownerId: { type: string }
 *     responses:
 *       200: { description: Notification sent via Socket.IO }
 *       400: { description: Missing ownerId }
 */
