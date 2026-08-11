import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { apiRouter } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { NotFoundError } from './lib/errors';

export const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.WEB_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1', apiRouter);
// Unknown routes answer in the same JSON envelope as everything else, not Express' HTML page.
app.use((_req, _res, next) => next(new NotFoundError('Route not found')));
app.use(errorHandler);
