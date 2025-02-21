import { NextFunction, Request, Response, Router } from 'express';
import User from '../models/User';

const userRouter = Router();

// Create a new user
userRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const { username, email, password } = req.body;

  const user = new User({
    username,
    email,
    password,
  });
  try {
    const savedUser = await user.save();
    res.status(201).json(savedUser); 
  } catch (err: any) {
    next(err);
  }
});

// Get all users
userRouter.get('/', async (req: Request, res: Response) => {
  const users = await User.find({});
  res.json(users);
});

// Get a specific user by ID
userRouter.get('/:id', async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id);
  if (user) {
    res.json(user);
  } else {
    res.status(404).end();
  }
});

// Update a user by ID
userRouter.put('/:id', async (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  const updatedUser = {
    username,
    email,
    password
  };

  const user = await User.findByIdAndUpdate(req.params.id, updatedUser, { new: true });
  res.json(user);
});

// Delete a user by ID
userRouter.delete('/:id', async (req: Request, res: Response) => {
  await User.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

// Delete all users
userRouter.delete('/', async (req: Request, res: Response) => {
  await User.deleteMany({});
  res.status(204).end();
});

export default userRouter;