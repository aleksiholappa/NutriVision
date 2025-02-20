import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import logger from './logger';
import jwt from 'jsonwebtoken';
import User from '../models/user';

interface CustomRequest extends Request {
  token?: string | null;
  user?: any;
}

const requestLogger = (request: Request, response: Response, next: NextFunction) => {
  logger.info('Method:', request.method);
  logger.info('Path:  ', request.path);
  logger.info('Body:  ', request.body);
  logger.info('---');
  next();
};

const unknownEndpoint = (request: Request, response: Response) => {
  response.status(404).send({ error: 'unknown endpoint' });
};

const errorHandler: ErrorRequestHandler = (err: any, request: Request, response: Response, next: NextFunction): void => {
  if (err.name === 'CastError') {
    response.status(400).send({ error: 'malformatted id' });
  } else if (err.name === 'ValidationError') {
    response.status(400).json({ error: err.message });
  } else if (err.name === 'MongoServerError' && err.code === 11000) {
    response.status(400).json({ error: 'Username or email already taken.' });
  } else if (err.name === 'JsonWebTokenError') {
    response.status(400).json({ error: 'token missing or invalid' });
  } else {
    next(err);
  }
};

const tokenExtractor = (request: CustomRequest, response: Response, next: NextFunction) => {
  const authorization = (request as Request).get('authorization');
  if (authorization && authorization.startsWith('Bearer ')) {
    request.token = authorization.replace('Bearer ', '');
  } else {
    request.token = null;
  }
  next();
};

const userExtractor = async (request: CustomRequest, response: Response, next: NextFunction) => {
  const authorization = (request as Request).get('authorization');
  if (authorization && authorization.startsWith('Bearer ')) {
    const token = authorization.replace('Bearer ', '');
    const decodedToken = jwt.verify(token, process.env.SECRET as string) as { id: string };
    if (!token || !decodedToken.id) {
      return response.status(401).json({ error: 'token missing or invalid' });
    }
    request.user = await User.findById(decodedToken.id);
  } else {
    request.user = null;
  }
  next();
};

export {
  requestLogger,
  unknownEndpoint,
  errorHandler,
  tokenExtractor,
  userExtractor
}