import { Request, Response } from 'express';
import express from 'express';
import jwt from 'jsonwebtoken';

const tokenRouter = express.Router();
const SECRET = process.env.REFRESH_TOKEN_SECRET;

interface CustomRequest extends Request {
  token?: string | null;
  user?: any;
}

tokenRouter.post('/validate', (req: CustomRequest, res: Response) => {
  const user = req.user;
  // Use the middleware UserExtractor to extract the user from the token
  // If the user is not found, it means the token is invalid
  if (!user) {
    res.status(400).json({ error: 'Invalid token' });
  } else {
    res.status(200).json({ message: 'Token is valid'});
  }
});

tokenRouter.post('/refresh', (req: Request, res: Response) => {
  const { refreshToken } = req.cookies.refresgToken;

  if (!refreshToken) {
    res.status(400).json({ message: 'Refresh token is required' });
    return;
  }

  try {
    if (!SECRET) {
      res.status(500).json({ message: 'Server configuration error: SECRET is not defined' });
      return;
    }
    const decoded = jwt.verify(refreshToken, SECRET) as jwt.JwtPayload;

    const newAccessToken = jwt.sign(
      { id: decoded.userId, email: decoded.email },
      SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({ token: newAccessToken });
    return;
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(401).json({ message: 'Invalid or expired refresh token' });
    return; 
  }
});

export default tokenRouter;