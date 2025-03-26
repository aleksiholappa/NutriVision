import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './ChatPage.css';

const baseImageUrl = 'imgApi/recognize';
const baseLLMUrl = 'llmApi/chat';

const ChatPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [result, setResult] = useState<string>('');
  const [chatInput, setChatInput] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<{ user: string; bot: string }[]>([]);
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSize = () => {
    if (textareaRef.current) {
      const element = textareaRef.current;
      const parentElement = element.parentElement?.parentElement;
      element.style.height = 'auto';
      element.style.height = `calc(${element.scrollHeight}px)`;
  
      if (parentElement) {
        parentElement.style.height = 'auto';
        if (imagePreview) {
          parentElement.style.height = `calc(${element.scrollHeight}px + 5rem)`;
        } else {
          parentElement.style.height = `calc(${element.scrollHeight}px)`;
        }
      }
    }
  };

  useEffect(() => {
    handleSize();
  }, [chatInput]);

  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
    if (userId){
      loadChatHistory();
    }
  }, [chatHistory, userId]);

  const loadChatHistory = async () => {
    try {
      const response = await fetch(baseLLMUrl + `/chat_history/${userId}`);
      const data = await response.json();
      const formattedHistory = data.map((item: any) => ({
        user: item.user_message,
        bot: item.bot_message,
      }));
      setChatHistory(formattedHistory.reverse());
    } catch (error) {
      console.error('Error loading chat history', error)
    }
  }

  const handleImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void = (event) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setImage(file);
      setImagePreview(URL.createObjectURL(file));

      event.target.value = '';
    }
  };

  const handleImageRecognition = async (): Promise<string> => {
    if (!image) return '';

    const formData = new FormData();
    formData.append('image', image);

    try {
      const response = await fetch(baseImageUrl, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data);
      console.log('Image recognition result:', data);
      return data;
    } catch (error) {
      console.error('Error recognizing image:', error);
      return '';
    }
  };
  
  const handleLLMChat = async (userMessage: string, result: string) => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        console.error('User ID not found!');
        return;
      }

      console.log('➡ Sending message to backend:', userMessage, 'Result:', result);
      const response = await fetch(baseLLMUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          { 
            message: userMessage,
            userId: userId,  
            result: result
          }
        ),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch LLM response')
      }

      const data = await response.json();
      const botMessage = `${data.nutrition_message}\n\n${data.response}`.trim();

      console.log('Bot message:', botMessage)

      setChatHistory([{ user: userMessage, bot: botMessage }, ...chatHistory]);
    } catch (error) {
      console.error('Error chatting with LLM:', error);
    }
  }

  const handleChatSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const userImage = image;
    if (!chatInput.trim() && !userImage) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setImage(null);
    setImagePreview(null);

    let recognitionResult = '';
    if (userImage) {
      recognitionResult = await handleImageRecognition();
    }
    await handleLLMChat(userMessage, recognitionResult);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        return;
      } else {
        e.preventDefault();
        document.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    }
  };

  const inputContainerClass = `ChatInputContainer ${imagePreview ? 'hasImagePreview' : ''}`; 
  const formClass = `ChatForm ${imagePreview ? 'hasImagePreview' : ''}`;
  const chatInputClass = `chat-input ${imagePreview ? 'hasImagePreview' : ''}`;

  return (
    <div className="ChatPageContainer">
      <div className="ChatContainer">
        <h2>NutriVision</h2>
        <div className="ChatHistoryContainer" ref={chatHistoryRef}>
          {chatHistory.map((chat, index) => (
            <div key={index} className="ChatBubble">
              <div className="UserMessage">{chat.user}</div>
              <div className="BotMessage" style={{ whiteSpace: 'pre-line'}}>{chat.bot}
              </div>
            </div>
          ))}
        </div>
        <div className={inputContainerClass}>
          {imagePreview && (
            <div className="ImagePreviewContainer">
              <img src={imagePreview} alt="Preview" />
            </div>
          )}
          <form onSubmit={handleChatSubmit} className={formClass}>
            <button
              type="button"
              className="upload-button"
              onClick={() => document.getElementById('image-upload')?.click()}
            >
              &#43; {/* Plus icon */}
            </button>
            <input
              type="file"
              id="image-upload"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />
            <textarea
              className={chatInputClass}
              value={chatInput}
              ref={textareaRef}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask NutriVision"
              rows={1}
              style={{ resize: 'none' }}
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
// TODO: Add expandable left sidebar with chat history

export default ChatPage;