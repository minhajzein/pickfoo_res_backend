import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerJsDoc from 'swagger-jsdoc';

import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db.js';

dotenv.config();

// Connect to Database
connectDB();

import { initCronJobs } from './tasks/restaurantSchedule.js';
initCronJobs();

const app: Express = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [process.env.CLIENT_URL || 'http://localhost:3000', 'https://restaurant.pickfoo.in', 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
    credentials: true,
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join-owner-room', (ownerId) => {
    socket.join(`owner_${ownerId}`);
    console.log(`Socket ${socket.id} joined owner_${ownerId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const port = process.env.PORT || 5000;

// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PickFoo Restaurant API',
      version: '1.0.0',
      description: 'API documentation for PickFoo Restaurant Backend. Use Bearer token (from login) or cookies for protected routes.',
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: 'Local server',
      },
      {
        url: 'https://api.restaurant.pickfoo.in',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access token from login (or use cookie accessToken)',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string', enum: ['owner', 'admin'] },
            profilePicture: { type: 'string' },
          },
        },
      },
    },
  },
  apis: ['./src/swagger.docs.ts'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

// Middleware
app.use(helmet());
app.use(cors({ origin: [process.env.CLIENT_URL || 'http://localhost:3000', 'https://restaurant.pickfoo.in', 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://localhost:3002'], credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Swagger Route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Mount Routes
import authRoutes from './modules/auth/auth.routes.js';
import restaurantRoutes from './modules/restaurant/restaurant.routes.js';
import menuRoutes from './modules/menu/menu.routes.js';
import orderRoutes from './modules/order/order.routes.js';
import reviewRoutes from './modules/review/review.routes.js';
import transactionRoutes from './modules/transaction/transaction.routes.js';
import uploadRoutes from './modules/upload/upload.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import bankAccountRoutes from './modules/bankAccount/bankAccount.routes.js';
import withdrawalRoutes from './modules/withdrawal/withdrawal.routes.js';
import notificationRoutes from './modules/notification/notification.routes.js';
import Notification from './modules/notification/notification.model.js';

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/restaurants', restaurantRoutes);
app.use('/api/v1/menu', menuRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/bank-accounts', bankAccountRoutes);
app.use('/api/v1/withdrawals', withdrawalRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// Notification route from Admin Backend
app.post('/api/v1/notify/status-update', async (req, res) => {
  const { restaurantName, status, ownerId, restaurantId } = req.body as {
    restaurantName?: string;
    status?: string;
    ownerId?: string;
    restaurantId?: string;
  };
  
  if (!ownerId || !status) {
    res.status(400).json({ success: false, message: 'ownerId and status are required' });
    return;
  }

  try {
    // Persist notification so owner apps (web, mobile) can display history.
    const notification = await Notification.create({
      user: ownerId,
      targetRole: 'owner',
      type: 'restaurant_status',
      title: 'Restaurant Status Update',
      message: `Your restaurant "${restaurantName ?? ''}" status has been updated to ${status}`,
      restaurant: restaurantId,
      metadata: { status, restaurantName },
    });

    const payload = {
      id: notification._id.toString(),
      type: notification.type,
      title: notification.title,
      message: notification.message,
      status,
      createdAt: notification.createdAt,
    };

    // Emit generic notification event
    io.to(`owner_${ownerId}`).emit('notification:new', payload);

    // Backwards-compatible event for existing web owner client
    io.to(`owner_${ownerId}`).emit('restaurant-status-update', {
      message: payload.message,
      status,
      timestamp: notification.createdAt,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to create status notification', error);
    res.status(500).json({ success: false, message: 'Failed to send notification' });
  }
});

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {},
  });
});

httpServer.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
  console.log(`[server]: Swagger docs available at http://localhost:${port}/api-docs`);
});

export default app;
