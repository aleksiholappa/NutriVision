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
  const { message, result } = req.body;
  const user = req.user;
  const image = req.file;

  logger.info('User:', user);

  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const formData = new FormData();
  formData.append('message', message);
  if (result) formData.append('imageRecognitionResult', JSON.stringify(result));
  if (image) formData.append('image', image.buffer, image.originalname);
  formData.append('diet', JSON.stringify(user.diet));
  formData.append('Allergies', JSON.stringify(user.allergies));
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