import { Router } from 'express';
import { authRouter } from './auth.routes';
import { userRouter } from './user.routes';
import { roleRouter } from './role.routes';
import { auditLogRouter } from './auditLog.routes';
import { healthRouter } from './health.routes';
import { categoryRouter, supplierRouter, warehouseRouter, productRouter } from './catalogue.routes';
import {
  stockRouter,
  requestRouter,
  purchaseOrderRouter,
  deliveryRouter,
  notificationRouter,
  favouriteRouter,
  dashboardRouter,
} from './operations.routes';

export const apiRouter = Router();
apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/roles', roleRouter);
apiRouter.use('/audit-logs', auditLogRouter);

apiRouter.use('/categories', categoryRouter);
apiRouter.use('/suppliers', supplierRouter);
apiRouter.use('/warehouses', warehouseRouter);
apiRouter.use('/products', productRouter);

apiRouter.use('/stock', stockRouter);
apiRouter.use('/requests', requestRouter);
apiRouter.use('/purchase-orders', purchaseOrderRouter);
apiRouter.use('/deliveries', deliveryRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/favourites', favouriteRouter);
apiRouter.use('/dashboard', dashboardRouter);
