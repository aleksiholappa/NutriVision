import { NextFunction, Request, Response, Router } from 'express';
import axios from 'axios';
import logger from '../utils/logger';
import dotenv from 'dotenv';

dotenv.config();

const llmRouter = Router();

const baseUrl = process.env.LLM_API_URL;

interface CustomRequest extends Request {
  token?: string | null;
  user?: any;
}

// Post a message to the LLM
llmRouter.post('/chat', async (req: CustomRequest, res: Response, next: NextFunction) => {
  const { message, result } = req.body;
  const user = req.user;

  logger.info('User:', user);

  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const llmMessage = {
    "Message": message,
    "ImageRecognitionResult": result,
    "diet": user.diet,
    "Allergies": user.allergies,
    "favouriteDishes": user.favoriteDishes,
    "dislikedDishes": user.dislikedDishes,
  }

  logger.info('LLM Message:', llmMessage);

  try {
    const llmResponse = await axios.post(baseUrl + '/chat', llmMessage, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    logger.info('LLM Response:', llmResponse.data);

    res.status(200).json(llmResponse.data);
  } catch (err: any) {
    logger.err('Error calling LLM API:', err.message);
    next(err);
  }
});

// Get chat history from the LLM
llmRouter.get('/chat_history', async (req: CustomRequest, res: Response, next: NextFunction) => {
  const user = req.user;

  logger.info('User:', user);

  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const userId = user._id.toString();

  try {
    const llmResponse = await axios.get(baseUrl + `/chat_history/${userId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    logger.info('LLM Response:', llmResponse.data);

    res.status(200).json(llmResponse.data);
  } catch (err: any) {
    logger.err('Error calling LLM API:', err.message);
    next(err);
  }
});


export default llmRouter;