import { config } from 'dotenv';

config();

const PORT = process.env.PORT;
const MONGODB_URI = process.env.NODE_ENV === 'test'
  ? process.env.MONGODB_URI_TEST
  : process.env.MONGODB_URI;
const LLM_API_URL = process.env.LLM_API_URL;

export {
  MONGODB_URI,
  PORT,
  LLM_API_URL,
};