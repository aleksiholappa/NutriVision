import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { MONGODB_URI } from './utils/config';
import usersRouter from './controllers/users';
import loginRouter from './controllers/login';
import { requestLogger, unknownEndpoint, errorHandler, tokenExtractor } from './utils/middleware';
import logger from './utils/logger';

const app = express();

mongoose.set('strictQuery', false);

logger.info('connecting to MongoDB');

mongoose.connect(MONGODB_URI as string)
  .then(() => {
    logger.info('connected to MongoDB');
  })
  .catch((error: Error) => {
    logger.err('error connection to MongoDB:', error.message);
  });

app.use(cors());
app.use(express.static('dist'));
app.use(express.json());
app.use(requestLogger);
app.use(tokenExtractor);

app.use('/api/users', usersRouter);
app.use('/api/login', loginRouter);
app.use('/api/register', usersRouter);

if (process.env.NODE_ENV === 'test') {
  const testingRouter = require('./controllers/testing');
  app.use('/api/testing', testingRouter);
}

app.use(unknownEndpoint);
app.use(errorHandler);

export default app;