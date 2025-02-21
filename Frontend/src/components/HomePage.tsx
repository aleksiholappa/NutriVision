import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [image, setImage] = useState<File | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setImage(event.target.files[0]);
    }
  };

  const handleImageRecognition = async () => {
    if (!image) return;

    const formData = new FormData();
    formData.append('image', image);

    try {
      const response = await fetch('YOUR_IMAGE_RECOGNITION_API_ENDPOINT', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data.result); // Adjust based on your API response structure
    } catch (error) {
      console.error('Error recognizing image:', error);
    }
  };

  return (
    <div>
      <h2>Welcome to NutriVision</h2>
      <button onClick={() => navigate('/login')}>Login</button>
      <button onClick={() => navigate('/register')}>Register</button>

      <div>
        <h3>Upload an image for recognition</h3>
        <input type="file" accept="image/*" onChange={handleImageUpload} />
        <button onClick={handleImageRecognition}>Recognize Image</button>
      </div>

      {result && (
        <div>
          <h3>Recognition Result</h3>
          <p>{result}</p>
        </div>
      )}
    </div>
  );
};

export default HomePage;