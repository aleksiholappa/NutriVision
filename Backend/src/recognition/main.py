from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from typing import Optional

app = FastAPI()

@app.post("/imgApi/recognize/")
async def upload_image(image: UploadFile = File(..., description="The image to process"),
                       description: Optional[str] = Form(None, description="Optional description of the image")):
    """
    Endpoint to receive an image and optional description.
    """
    try:
        
        contents = await image.read()
        print(f"Contents of {image.filename}: {contents}")

        
        file_path = f"uploads/{image.filename}"
        with open(image.filename, "wb") as f:
            f.write(contents)
        print(f"Image saved to {file_path}")
        return {"filename": image.filename, "description": description, "message": "Image uploaded successfully"}

    except Exception as e:
        return {"error": str(e)}
    