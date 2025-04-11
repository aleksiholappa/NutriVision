import { Router, Request, Response } from 'express';
import User from '../models/User';

interface CustomRequest extends Request {
    token?: string | null;
    user?: any;
  }

const profileRouter = Router();

// Update profile
profileRouter.post('/', async (req: CustomRequest, res: Response) => {
  console.log('req_user:', req.user);
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { healthConditions, diet, allergies, favoriteDishes, dislikedDishes } = req.body;
  try {
    user.healthConditions = healthConditions;
    user.diet = diet;
    user.allergies =  allergies;
    user.favoriteDishes = favoriteDishes;
    user.dislikedDishes = dislikedDishes;

    const updatedUser = await user.save();
    console.log('User profile updated:', updatedUser);
    res.json(updatedUser);
    return;
  } catch (err: any) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to update profile' });
    return;
  }
});

export default profileRouter;