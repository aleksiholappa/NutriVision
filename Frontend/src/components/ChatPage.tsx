import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './ChatPage.css';

const ChatPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<{ user: string; bot: string }[]>([]);
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [chatHistory]);

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
  
  const handleLLMChat = async (userMessage: string, result: string | null) => {
    try {
      // const response = await fetch('YOUR_LLM_API_ENDPOINT', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(
      //     { 
      //       message: userMessage,  
      //       result: result
      //     }
      //   ),
      // });

      // const data = await response.json();
      // const botMessage = data.response; 

      const botMessage = 'This is a placeholder bot message'; // TODO: Replace with actual bot response

      setChatHistory([{ user: userMessage, bot: botMessage }, ...chatHistory]);
    } catch (error) {
      console.error('Error chatting with LLM:', error);
    }
  }

  const handleChatSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    const userImage = image;
    setImage(null);
    setImagePreview(null);

    if (userImage) {
      await handleImageRecognition();
    }
    handleLLMChat(userMessage, result);
  };


  return (
    <div className="ChatPageContainer">
      <div className="ChatContainer">
        <h2>NutriVision</h2>
        <div className="ChatHistoryContainer" ref={chatHistoryRef}>
          {chatHistory.map((chat, index) => (
            <div key={index} className="ChatBubble">
              <div className="UserMessage">{chat.user}</div>
              <div className="BotMessage">{chat.bot}</div>
            </div>
          ))}
        </div>
        {imagePreview && (
          <div className="ImagePreviewContainer">
            <img src={imagePreview} alt="Preview" />
          </div>
        )}
        <div className="ChatInputContainer">
          <label htmlFor="image-upload" className="upload-button">
            &#43; {/* Plus icon */}
          </label>
          <input
            type="file"
            id="image-upload"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImageUpload}
          />
          <form onSubmit={handleChatSubmit}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask NutriVision"
            />
            <button type="submit" className="send-button">
              &#10140; {/* Unicode right arrow */}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// TODO: Improve the image preview
// TODO: Add logout button
// TODO: Add chat animations for user and bot messages
// TODO: Implement Waiting for bot response animation
// TODO: Add earlier chats window
// TODO: Improve support for Firefox
// TODO: Add error handling for image upload

export default ChatPage;