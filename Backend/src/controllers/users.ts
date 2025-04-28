import { NextFunction, Request, Response, Router } from "express";
import User from "../models/User";

const userRouter = Router();

interface CustomRequest extends Request {
  token?: string | null;
  user?: any;
}

// Create a new user
userRouter.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
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
  }
);

// Get user data with token
userRouter.get("/", async (req: CustomRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.status(200).json(user);
});

// Update a user by ID
userRouter.put("/:id", async (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  const updatedUser = {
    username,
    email,
    password,
  };

  const user = await User.findByIdAndUpdate(req.params.id, updatedUser, {
    new: true,
  });
  res.json(user);
});

// Delete a user by ID
userRouter.delete("/:id", async (req: Request, res: Response) => {
  await User.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

// Delete all users
userRouter.delete("/", async (_req: Request, res: Response) => {
  await User.deleteMany({});
  res.status(204).end();
});

export default userRouter;
