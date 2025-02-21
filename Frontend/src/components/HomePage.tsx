import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<{ user: string; bot: string }[]>([]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
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

  const handleChatSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatInput('');

    try {
      const response = await fetch('YOUR_LLM_API_ENDPOINT', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await response.json();
      const botMessage = data.response; // Adjust based on your API response structure

      setChatHistory([...chatHistory, { user: userMessage, bot: botMessage }]);
    } catch (error) {
      console.error('Error chatting with LLM:', error);
    }
  };

  return (
    <div className="HomePageContainer">
      <h2>Welcome to NutriVision</h2>
      <div className="RegistrationButtons">
        <button onClick={() => navigate('/login')}>Login</button>
        <button onClick={() => navigate('/register')}>Register</button>
      </div>

      <div className="ImageRecognitionContainer">
        <h3>Upload an image for recognition</h3>
        <input type="file" accept="image/*" onChange={handleImageUpload} />
        {imagePreview && (
          <img
            src={imagePreview}
            alt="Uploaded"
            style={{ maxWidth: '300px', maxHeight: '300px', width: 'auto', height: 'auto' }}
          />
        )}
        <button onClick={handleImageRecognition}>Recognize Image</button>
        {result && (
          <div>
            <h3>Recognition Result</h3>
            <p>{result}</p>
          </div>
        )}
      </div>

      <div className="ChatContainer">
        <h3>Chat with our LLM</h3>
        <form onSubmit={handleChatSubmit}>
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type your message..."
          />
          <button type="submit">Send</button>
        </form>
        <div className="ChatHistory">
          {chatHistory.map((chat, index) => (
            <div key={index} className="ChatMessage">
              <p><strong>You:</strong> {chat.user}</p>
              <p><strong>Bot:</strong> {chat.bot}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;