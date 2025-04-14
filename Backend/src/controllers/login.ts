import { Request, Response, Router, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../models/User';
import logger from '../utils/logger';
import { TOKENBLACKLIST, TOKENEXPIRATIONTIME } from '../utils/config';

const loginRouter = Router();

const login: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  const { emailOrUsername, password } = req.body;

  logger.info('Logging in with email/username:', emailOrUsername);
  const user = await User.findOne({ 
    $or: [
      { email: emailOrUsername },
      { username: emailOrUsername }
    ]
  });

  if (!user) {
    res.status(401).json({ error: 'Invalid email/username or password' });
    return;
  }

  const passwordCorrect = await bcrypt.compare(password, user.password);
  if (!passwordCorrect) {
    res.status(401).json({ error: 'Invalid email/username or password' });
    return;
  }

  const userForToken = {
    id: user._id,
    email: user.email,
  };
  
  const token = jwt.sign(userForToken, process.env.SECRET as string, { expiresIn: '1h' });
  const refreshToken = jwt.sign(userForToken, process.env.REFRESH_TOKEN_SECRET as string, { expiresIn: '7d' });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, 
  });
  
  res.status(200).json({ token: token, userId: user._id, email: user.email, username: user.username });
};

const logout: RequestHandler = (req: Request, res: Response): void => {
  const authorization = req.get('Authorization');
  if (authorization && authorization.startsWith('Bearer ')) {
    const token = authorization.replace('Bearer ', '');
    const expirationTime = Date.now() + TOKENEXPIRATIONTIME;
    TOKENBLACKLIST.set(token, expirationTime);
    res.clearCookie('refreshToken', { httpOnly: true, secure: true, sameSite: 'strict' });
    res.status(200).json({ message: 'Logged out successfully' });
  } else {
    res.status(400).json({ error: 'Token is missing' });
  }
};

loginRouter.post('/', login);
loginRouter.post('/logout', logout);

export default loginRouter;