import { NextFunction, Request, Response, Router } from "express";
import { IMAGE_RECOGNITION_API_URL } from "../utils/config";
import axios from "axios";
import FormData from "form-data";
import logger from "../utils/logger";
import multer from "multer";

const recognitionRouter = Router();
const upload = multer();

interface CustomRequest extends Request {
  user?: any;
}

// Forward the formData to the recognition API
recognitionRouter.post(
  "/",
  upload.single("image"),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    logger.info("Forwarding request to recognition API.");
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const form = new FormData();
    if (req.file) {
      form.append("image", req.file.buffer, req.file.originalname);
    }
    try {
      logger.info("Url:", IMAGE_RECOGNITION_API_URL + "/recognize");
      const recognitionResponse = await axios.post(
        IMAGE_RECOGNITION_API_URL + "/recognize",
        form
      );

      logger.info("Recognition API Response:", recognitionResponse.data);

      res.status(200).json(recognitionResponse.data);
    } catch (err: any) {
      logger.err("Error calling recognition API:", err.message);
      next(err);
    }
  }
);

export default recognitionRouter;
