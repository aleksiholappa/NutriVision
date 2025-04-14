import { Router, Request, Response, NextFunction } from 'express';
import User from '../models/User';

interface CustomRequest extends Request {
    token?: string | null;
    user?: any;
  }

const profileRouter = Router();

// Update profile information
profileRouter.post('/', async (req: CustomRequest, res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { healthConditions, diet, allergies, favoriteDishes, dislikedDishes } = req.body;
  try {
    user.healthConditions = healthConditions || [];
    user.diet = diet || [];
    user.allergies = allergies || [];
    user.favoriteDishes = favoriteDishes || [];
    user.dislikedDishes = dislikedDishes || [];
    const updatedUser = await user.save();
    res.json(updatedUser);
  } catch (err: any) {
    console.error(err.message);
    next(err);
  }
});

// Get profile information
profileRouter.get('/', async (req: CustomRequest, res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const userProfile = await User.findById(user._id, {
      healthConditions: 1,
      diet: 1,
      allergies: 1,
      favoriteDishes: 1,
      dislikedDishes: 1,
    });
    res.json(userProfile);
  } catch (err: any) {
    console.error(err.message);
    next(err);
  }
});

export default profileRouter;