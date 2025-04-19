import { Request, Response, Router, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import logger from "../utils/logger";
import User from "../models/User";
import { TOKENBLACKLIST, TOKEN_EXP, REFRESH_TOKEN_EXP } from "../utils/config";

const loginRouter = Router();

interface CustomRequest extends Request {
  user?: any;
}

const login: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { emailOrUsername, password } = req.body;

  logger.info("Logging in with email/username:", emailOrUsername);
  const user = await User.findOne({
    $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
  });

  if (!user) {
    res.status(401).json({ error: "Invalid email/username or password" });
    return;
  }

  const passwordCorrect = await bcrypt.compare(password, user.password);
  if (!passwordCorrect) {
    res.status(401).json({ error: "Invalid email/username or password" });
    return;
  }

  const userForToken = {
    id: user._id,
    email: user.email,
  };

  const token = jwt.sign(userForToken, process.env.SECRET as string, {
    expiresIn: "1h",
  });
  const refreshToken = jwt.sign(
    userForToken,
    process.env.REFRESH_TOKEN_SECRET as string,
    { expiresIn: "7d" }
  );

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: REFRESH_TOKEN_EXP,
  });

  res.status(200).json({ token });
};

const logout: RequestHandler = (req: CustomRequest, res: Response): void => {
  logger.info("Logging out user");
  const authorization = req.get("Authorization");
  if (!authorization) {
    res.status(400).json({ error: "Token is missing" });
    return;
  }
  const token = authorization.replace("Bearer ", "");
  const refreshToken = req.cookies.refreshToken;
  const tokenExpTime = Date.now() + TOKEN_EXP;
  const refreshTokenExpTime = Date.now() + REFRESH_TOKEN_EXP;
  TOKENBLACKLIST.set(token, tokenExpTime);
  TOKENBLACKLIST.set(refreshToken, refreshTokenExpTime);
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  });
  res.status(200).json({ message: "Logged out successfully" });
};

loginRouter.post("/", login);
loginRouter.post("/logout", logout);

export default loginRouter;
