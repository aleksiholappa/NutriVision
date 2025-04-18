import { Request, Response, Router } from "express";
import jwt from "jsonwebtoken";
import logger from "../utils/logger";

const tokenRouter = Router();
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const SECRET = process.env.SECRET;

tokenRouter.get("/refresh", (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken || null;

  if (!refreshToken) {
    res.status(400).json({ error: "Refresh token missing" });
    return;
  }

  try {
    if (!REFRESH_TOKEN_SECRET || !SECRET) {
      res
        .status(500)
        .json({
          message: "Server configuration error: secrets not defined correctly.",
        });
      return;
    }
    const decoded = jwt.verify(
      refreshToken,
      REFRESH_TOKEN_SECRET,
    ) as jwt.JwtPayload;

    const newAccessToken = jwt.sign(
      { id: decoded.id, email: decoded.email },
      SECRET,
      { expiresIn: "1h" },
    );

    res.status(200).json({ token: newAccessToken });
    return;
  } catch (error) {
    logger.err("Error refreshing token:", error);
    res.status(401).json({ error: "Invalid or expired refresh token" });
    return;
  }
});

export default tokenRouter;
