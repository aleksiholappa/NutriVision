import { Request, Response, Router, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../models/User';
import logger from '../utils/logger';

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
  
  res.status(200).json({ token, email: user.email, username: user.username });
};

loginRouter.post('/', login);

export default loginRouter;