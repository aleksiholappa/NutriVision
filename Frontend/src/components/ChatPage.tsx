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
  const [chatHistory, setChatHistory] = useState<{ user: { message: string; image: string | null}; bot: string }[]>([]);
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [userMessagePreview, setUserMessagePreview] = useState<{ message: string; image: string | null }>({
    message: '',
    image: null,
  });

  /**
   * Handle resizing of the chat input and chat history container
  */
  const handleSize = () => {

    if (textareaRef.current) {
      // element = chat-input element
      const element = textareaRef.current;
      // parentElement = ChatInputContainer element
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

      if (chatHistoryRef.current) {
        chatHistoryRef.current.style.height = `calc(100% - ${parentElement?.clientHeight}px - 33px)`;
      }
    }
  };

  useEffect(() => {
    handleSize();
    if ((chatInput.trim().length > 0 || imagePreview) && !loading) {
      setUserMessagePreview({
        message: chatInput.trim(),
        image: imagePreview,
      });
    }
  }, [chatInput, imagePreview]);

  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
    if (userId){
      loadChatHistory();
    }
  }, [chatHistory, userId]);

  /**
   * Load chat history from the backend
   */
  const loadChatHistory = async () => {
    try {
      const response = await fetch(baseLLMUrl + `/chat_history/${userId}`);
      const data = await response.json();
      const formattedHistory = data.map((item: any) => ({
        user: item.user_message,
        bot: item.bot_message,
      }));
      setChatHistory(formattedHistory);
    } catch (error) {
      console.error('Error loading chat history', error)
    }
  }

  /**
   * Handle image upload event
   * 
   * @param event - Change event for the image upload input
   */
  const handleImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void = (event) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setImage(file);
      setImagePreview(URL.createObjectURL(file));

      event.target.value = '';
    }
  };

  /**
   * Handle image recognition
   * 
   * @returns - Image recognition result
   */
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
  
  /**
   * Handle LLM chat with the backend
   * 
   * @param userMessage - User message
   * @param result - Image recognition result
   */
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
      const foodItems = JSON.parse(result.replace(/'/g, '"'));
      const resultInfo = foodItems.map((item: any) => 
      `\n${item.name} (confidence: ${item.confidence})\n` +
      `    Macronutrients for ${item.name} per 100 grams:\n` +
      `    Energy: ${item.macronutrients.Kilocalories} kcal\n` +
      `    Protein: ${item.macronutrients.Protein} g\n` +
      `    Carbohydrates: ${item.macronutrients.Carbohydrates} g\n` +
      `    Fat: ${item.macronutrients.Fat} g\n`
        ).join('\n');
      const botMessage = `${resultInfo ? `Recognized food items from the image: ${resultInfo}\n\n` : ''}${data.nutrition_message}\n\n${data.response}`.trim();

      setChatHistory(
        [
          {
            user: {
              message: userMessage,
              image: userMessagePreview.image,
            },
            bot: botMessage
          }, ...chatHistory
        ]
      );
      setTimeout(() => {}, 100000);
    } catch (error) {
      setChatHistory(
        [
          { 
            user: { 
              message: userMessage, 
              image: userMessagePreview.image
            }, 
            bot: 'Sorry, I am unable to process your request at the moment.' 
          }, ...chatHistory
        ]
      );
    }
  }

  /**
   * Handle chat submission event
   * 
   * @param event - Form event for the chat submission
   */
  const handleChatSubmit = async (event: React.FormEvent) => {
    try {
      event.preventDefault();

      const userImage = image;
      if (!chatInput.trim() && !userImage) return;

      if (chatHistoryRef.current) {
        chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
      }
      
      const userMessage = chatInput.trim();
      
      setLoading(true);
      setChatInput('');
      setImage(null);
      setImagePreview(null);

      let recognitionResult = '';
      if (userImage) {
        recognitionResult = await handleImageRecognition();
      }
      await handleLLMChat(userMessage, recognitionResult);
    } catch (error) {
      console.error('Error submitting chat:', error);
    } finally {
      setLoading(false);
      setUserMessagePreview({ message: '', image: null });
    }
  };

  /**
   * Handle key down event for the chat input
   * Enables sending the chat message on pressing Enter
   * Adds a new line on pressing Shift + Enter
   * 
   * @param e - Keyboard event for the chat input
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        return;
      } else {
        e.preventDefault();
        document
          .querySelector('form')
          ?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    }
  };

  /**
   * Dynamic class names for the chat input container, form, and chat input
   * Helps in resizing the chat input and chat history container
   */
  const inputContainerClass = `ChatInputContainer ${imagePreview ? 'hasImagePreview' : ''}`; 
  const formClass = `ChatForm ${imagePreview ? 'hasImagePreview' : ''}`;
  const chatInputClass = `chat-input ${imagePreview ? 'hasImagePreview' : ''}`;

  /**
   * Render the ChatPage component 
   */
  return (
    <div className="ChatPageContainer">
      <div className="ChatContainer">
        <h2>NutriVision</h2>
        <div className="ChatHistoryContainer" ref={chatHistoryRef}>
          {loading && 
            <div className="ChatBubble">
              <div className="UserMessage">
                {userMessagePreview.image && (
                  <img src={userMessagePreview.image} alt="User Preview" className="UserImagePreview" />
                )}
                {userMessagePreview.message}
              </div>
              <div className="BotMessage">
                <span className="loading-dots">
                  <span>•</span><span>•</span><span>•</span>
                </span>
              </div>  
            </div>
          }
          {chatHistory.map((chat, index) => (
            <div key={index} className="ChatBubble">
              <div className="UserMessage">
                {chat.user.image && (
                  <img 
                    src={chat.user.image} 
                    alt="User Preview"
                    className="UserImagePreview" 
                  />
                )}
                {chat.user.message}
              </div>
              <div className="BotMessage">{chat.bot}</div>
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

// TODO: Add logout button
// TODO: Add earlier chats window
// TODO: Add expandable left sidebar with chat history

export default ChatPage;