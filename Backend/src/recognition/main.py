import json
import os
from fastapi import FastAPI, File, UploadFile, Form
from typing import Optional
import logging
import sys
import foodrecognition as fr
import dotenv

dotenv.load_dotenv()

# Configure the logger
logger = logging.getLogger(__name__)
logging_level = (
    logging.DEBUG if os.getenv("NODE_ENV") == "development" else logging.INFO
)
logger.setLevel(logging_level)  # Set the desired logging level

# Create a console handler
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(logging_level)  # Set the handler's logging level

# Create a formatter
formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
console_handler.setFormatter(formatter)

# Add the handler to the logger
logger.addHandler(console_handler)

app = FastAPI()

UPLOAD_DIR = "./uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.post("/recognize")
async def recognize_image(
    image: UploadFile = File(..., description="The image to process"),
    description: Optional[str] = Form(
        None, description="Optional description of the image"
    ),
):
    """
    Endpoint to receive an image and use the food recognition
    model to identify the food in the image.
    """
    try:
        contents = await image.read()

        # Save the image to the uploads directory
        file_path = os.path.join(UPLOAD_DIR, image.filename)
        with open(file_path, "wb") as f:
            f.write(contents)
        logger.info(f"Saved image to {file_path}")

        # Call the food recognition model
        result = fr.recognize_image(file_path)
        logger.info(f"Food recognition result:\n{json.dumps(result)}")

        # Remove the image file
        os.remove(file_path)

        # Return the result
        return str(result)

    except Exception as e:
        return {"error": str(e)}
