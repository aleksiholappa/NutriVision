import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { MONGODB_URI } from "./utils/config";
import usersRouter from "./controllers/users";
import loginRouter from "./controllers/login";
import llmRouter from "./controllers/llm";
import profileRouter from "./controllers/profile";
import tokenRouter from "./controllers/token";
import recognitionRouter from "./controllers/recognition";
import cookieParser from "cookie-parser";
import {
  requestLogger,
  unknownEndpoint,
  errorHandler,
  userExtractor,
  isTokenBlacklisted,
} from "./utils/middleware";
import logger from "./utils/logger";
import path from "path";

const app = express();

mongoose.set("strictQuery", false);

logger.info("connecting to MongoDB");

mongoose
  .connect(MONGODB_URI as string)
  .then(() => {
    logger.info("connected to MongoDB");
  })
  .catch((error: Error) => {
    logger.err("error connection to MongoDB:", error.message);
  });

app.use(cors());
app.use(express.static("dist"));
const frontendRoutes = [
  "/chat",
  "/chat/*",
  "/login",
  "/registration",
  "/registration-success",
  "/profile",
];
frontendRoutes.forEach((route) => {
  app.get(route, (_req, res) => {
    res.sendFile(path.resolve("dist", "index.html"));
  });
});
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());
app.use(requestLogger);
app.use(userExtractor);
app.use(isTokenBlacklisted);

app.use("/api/users", usersRouter);
app.use("/api/login", loginRouter);
app.use("/api/register", usersRouter);
app.use("/api/profile", profileRouter);
app.use("/api/token", tokenRouter);
app.use("/api/recognition", recognitionRouter);
app.use("/api/llm", llmRouter);

app.use(unknownEndpoint);
app.use(errorHandler);

export default app;
