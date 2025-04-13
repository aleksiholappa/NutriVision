import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import logger from './logger';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { TOKENBLACKLIST } from './config';

interface CustomRequest extends Request {
  token?: string | null;
  user?: any;
}

const requestLogger = (request: Request, response: Response, next: NextFunction) => {
  const sanitizedBody = { ...request.body };
  if (sanitizedBody.password) {
    sanitizedBody.password = '********';
  }

  logger.info('Method:', request.method);
  logger.info('Path:  ', request.path);
  logger.info('Body:  ', sanitizedBody);
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

const userExtractor = async (request: CustomRequest, response: Response, next: NextFunction): Promise<void> => {
  try {
    const authorization = (request as Request).get('Authorization');
    if (authorization && authorization.startsWith('Bearer ')) {
      const token = authorization.replace('Bearer ', '');
      const decodedToken = jwt.verify(token, process.env.SECRET as string) as { id: string };

      if (!decodedToken.id) {
        response.status(401).json({ error: 'token missing or invalid' });
        return;
      }

      request.user = await User.findById(decodedToken.id);
    } else {
      request.user = null;
    }
    next();
  } catch (error: any) {
    next(error);
  }
};

const isTokenBlacklisted = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1];

  if (token) {
    // Remove expired tokens from the blacklist
    const currentTime = Date.now();
    for (const [blacklistedToken, expirationTime] of TOKENBLACKLIST.entries()) {
      if (expirationTime <= currentTime) {
        TOKENBLACKLIST.delete(blacklistedToken);
      }
    }

    // Check if the token is blacklisted
    if (TOKENBLACKLIST.has(token)) {
      res.status(401).json({ error: 'Token is invalid or blacklisted' });
      return;
    }
  }

  next();
};

export {
  requestLogger,
  unknownEndpoint,
  errorHandler,
  userExtractor,
  isTokenBlacklisted,
}