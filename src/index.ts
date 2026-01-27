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

const app: Express = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [process.env.CLIENT_URL || 'http://localhost:3000', 'https://restaurant.pickfoo.in', 'http://localhost:3001', 'http://localhost:3002'],
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
      title: 'PickFoo API',
      version: '1.0.0',
      description: 'API Documentation for PickFoo Food Delivery App',
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
  },
  apis: ['./src/modules/**/*.ts'], // Path to the API docs
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

// Middleware
app.use(helmet());
app.use(cors({ origin: [process.env.CLIENT_URL || 'http://localhost:3000', 'https://restaurant.pickfoo.in', 'http://localhost:3001', 'http://localhost:3002'], credentials: true }));
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

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/restaurants', restaurantRoutes);
app.use('/api/v1/menu', menuRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/upload', uploadRoutes);

// Notification route from Admin Backend
app.post('/api/v1/notify/status-update', (req, res) => {
  const { restaurantName, status, ownerId } = req.body;
  
  if (!ownerId) {
    res.status(400).json({ success: false });
    return;
  }

  // Emit to owner room
  io.to(`owner_${ownerId}`).emit('restaurant-status-update', {
    message: `Your restaurant "${restaurantName}" status has been updated to ${status}`,
    status,
    timestamp: new Date()
  });

  res.status(200).json({ success: true });
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
