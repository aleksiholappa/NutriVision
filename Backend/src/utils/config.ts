import { config } from "dotenv";

config();

const PORT = process.env.PORT;
const MONGODB_URI =
  process.env.NODE_ENV === "test"
    ? process.env.MONGODB_URI_TEST
    : process.env.MONGODB_URI;
const LLM_API_URL = process.env.LLM_API_URL;
const IMAGE_RECOGNITION_API_URL =
  process.env.IMAGE_RECOGNITION_API_URL || "http://localhost:3001";
const TOKENBLACKLIST: Map<string, number> = new Map();
const TOKEN_EXP = 60 * 60 * 1000; // 1 hour
const REFRESH_TOKEN_EXP = 7 * 24 * 60 * 60 * 1000; // 7 days

export {
  MONGODB_URI,
  PORT,
  LLM_API_URL,
  IMAGE_RECOGNITION_API_URL,
  TOKENBLACKLIST,
  TOKEN_EXP,
  REFRESH_TOKEN_EXP,
};
