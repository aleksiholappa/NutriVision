import { Request, Response, Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../models/user';
import logger from '../utils/logger';

const loginRouter = Router();

const login = async (req: Request, res: Response): Promise<Response | void> => {
  const { emailOrUsername, password } = req.body;

  logger.info('Logging in with email/username:', emailOrUsername);
  const user = await User.findOne({ 
    $or: [
      { email: emailOrUsername },
      { username: emailOrUsername }
    ]
  });

  if (!user) {
    return res.status(401).json({ error: 'Invalid email/username or password' });
  }

  logger.info('Password: ', password);
  logger.info('User password', user.password);
  const passwordCorrect = await bcrypt.compare(password, user.password);
  if (!passwordCorrect) {
    return res.status(401).json({ error: 'Invalid email/username or password' });
  }

  const userForToken = {
    id: user._id,
    email: user.email,
  };

  const token = jwt.sign(userForToken, process.env.SECRET as string, { expiresIn: '1h' });

  res.status(200).json({ token, email: user.email, username: user.username });
};

loginRouter.post('/', login);

export default loginRouter;