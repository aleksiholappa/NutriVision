import { NextFunction, Request, Response, Router } from 'express';
import axios from 'axios';
import FormData from 'form-data';
import { LLM_API_URL } from '../utils/config';
import multer from 'multer';
import logger from '../utils/logger';

const llmRouter = Router();
const baseUrl = LLM_API_URL;
const upload = multer({ storage: multer.memoryStorage() });

interface CustomRequest extends Request {
  token?: string | null;
  user?: any;
}

// Post a message to the LLM
llmRouter.post('/chat', upload.single('image'), async (req: CustomRequest, res: Response, next: NextFunction) => {
  const { message, result, chatId } = req.body;
  const user = req.user;
  const image = req.file;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  logger.info("Sending message to LLM:", message, chatId);

  const formData = new FormData();
  formData.append('message', message);
  formData.append('chatId', chatId);
  if (result) formData.append('imageRecognitionResult', JSON.stringify(result));
  if (image) formData.append('image', image.buffer, image.originalname);
  formData.append('diet', JSON.stringify(user.diet));
  formData.append('allergies', JSON.stringify(user.allergies));
  formData.append('favouriteDishes', JSON.stringify(user.favoriteDishes));
  formData.append('dislikedDishes', JSON.stringify(user.dislikedDishes));
  formData.append('userId', user._id.toString());

  logger.info('LLM Message:', formData);

  try {
    const llmResponse = await axios.post(baseUrl + '/chat', formData, {
      headers: formData.getHeaders(),
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

  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  logger.info("Getting all chats from LLM");

  const userId = user._id.toString();

  try {
    const llmResponse = await axios.get(baseUrl + `/chat_history/${userId}`, {});

    logger.info('LLM Response:', llmResponse.data);

    res.status(200).json(llmResponse.data);
  } catch (err: any) {
    logger.err('Error calling LLM API:', err.message);
    next(err);
  }
});

llmRouter.post('/chat_history', async (req: CustomRequest, res: Response, next: NextFunction) => {
  const user = req.user;
  const { chatId, chatName } = req.body;

  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  logger.info("Sending new chat to LLM:", chatId, chatName);

  const userId = user._id.toString();

  try {
    const response = await axios.post(baseUrl + `/chat_history/${userId}`, {
      chatId,
      chatName,
    });

    logger.info('LLM Response:', response.data);

    res.status(200).json(response.data);
  } catch (err: any) {
    logger.err('Error calling LLM API:', err.message);
    next(err);
  }
});

// Get chat history for a specific chat ID
llmRouter.get('/chat_one/:chatId', async (req: CustomRequest, res: Response, next: NextFunction) => {
  const user = req.user;
  const { chatId } = req.params;

  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  logger.info("Getting chat history for chatId:", chatId);

  const userId = user._id.toString();

  try {
    const llmResponse = await axios.get(baseUrl + `/chat_one`, {
      params: {
        userId,
        chatId,
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