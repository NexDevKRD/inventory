import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { createUserSchema, updateUserSchema, PermissionKey } from '@inventory/shared';
import { createUser, updateUser, deactivateUser, getUser, listUsers } from '../controllers/user.controller';

export const userRouter = Router();
userRouter.use(authenticate);
userRouter.get('/', authorize(PermissionKey.USER_CREATE), listUsers);
userRouter.get('/:id', authorize(PermissionKey.USER_CREATE), getUser);
userRouter.post('/', authorize(PermissionKey.USER_CREATE), validate(createUserSchema), createUser);
userRouter.patch('/:id', authorize(PermissionKey.USER_UPDATE), validate(updateUserSchema), updateUser);
userRouter.delete('/:id', authorize(PermissionKey.USER_DEACTIVATE), deactivateUser);
