import React, { useState, useEffect, useRef } from 'react';
import './ChatPage.css';
 
const baseImageUrl = 'imgApi/recognize';
const baseLLMUrl = 'api/llm';
const maxFileSize = 2 // 2 MB

const ChatPage: React.FC = () => {
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<{ user: { message: string; image: File | null}; bot: string }[]>([]);
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [inputState, setInputState] = useState<{ 
    message: string; 
    imagePreview: string | null; 
  }>({
    message: '',
    imagePreview: null,
  });
  const [allChats, setAllChats] = useState<{ id: string; name: string }[]>([
    { id: '1', name: 'Chat 1' },
    { id: '2', name: 'Chat 2' },
    { id: '3', name: 'Chat 3' },
    { id: '4', name: 'Chat 4' },
    { id: '5', name: 'Chat 5' },
    { id: '6', name: 'Chat 6' },
    { id: '7', name: 'Chat 7' },
    { id: '8', name: 'Chat 8' },
    { id: '9', name: 'Chat 9' },
    { id: '10', name: 'Chat 10' },
    { id: '11', name: 'Chat 11' },
  ]);

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
      setInputState({
        message: chatInput.trim(),
        imagePreview: imagePreview,
      });
    }
  }, [chatInput, imagePreview]);

  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
    if (localStorage.getItem('token')){
      loadChatHistory();
    }
  }, []);

  /**
   * Load chat history from the backend
   */
  const loadChatHistory = async () => {
    try {
      const response = await fetch(baseLLMUrl + '/chat_history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      console.log("Chat history response:", data);
      const formattedHistory = data.map((item: any) => ({
        user: {
          message: item.user_message,
          image: item.image,
        },
        bot: item.nutrition_message + item.bot_message,
      })).reverse();
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

      const maxSize = maxFileSize * 1024 * 1024;
      if (file.size > maxSize) {
        setAlertMessage(`File too large. Please select a file smaller than ${maxFileSize} MB.`);
        event.target.value = '';
        return;
      }

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
  const handleImageRecognition = async (image: File): Promise<string> => {
    if (!image) return '';

    const formData = new FormData();
    formData.append('image', image);

    try {
      const response = await fetch(baseImageUrl, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
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
  const handleLLMChat = async (userMessage: string, result: string | null, image: File | null) => {
    try {
      const formData = new FormData();
      formData.append('message', userMessage);
      if (result) formData.append('result', result);
      if (image) formData.append('image', image);

      console.log('➡ Sending message to backend:', userMessage, 'Result:', result);
      const response = await fetch(baseLLMUrl + '/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch LLM response')
      }

      const data = await response.json();
      let resultInfo = '';
      if (result) {
        try {
          const foodItems = JSON.parse(result.replace(/'/g, '"'));
          resultInfo = foodItems.map((item: any) => 
          `\n${item.name} (confidence: ${item.confidence})\n` +
          `    Macronutrients for ${item.name} per 100 grams:\n` +
          `    Energy: ${item.macronutrients.Kilocalories} kcal\n` +
          `    Protein: ${item.macronutrients.Protein} g\n` +
          `    Carbohydrates: ${item.macronutrients.Carbohydrates} g\n` +
          `    Fat: ${item.macronutrients.Fat} g\n`
          ).join('\n');
        } catch (error) {
          console.error('Error parsing image recognition result:', error);
        }
      }
      const botMessage = `${resultInfo ? `Recognized food items from the image: ${resultInfo}\n\n` : ''}${data.nutrition_message}\n\n${data.response}`.trim();

      setChatHistory(
        [
          {
            user: {
              message: userMessage,
              image: image,
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
              image: image
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
        recognitionResult = await handleImageRecognition(userImage);
      }
      await handleLLMChat(userMessage, recognitionResult, userImage);
    } catch (error) {
      console.error('Error submitting chat:', error);
    } finally {
      setLoading(false);
      setInputState({ message: '', imagePreview: null});
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
      {alertMessage && (
        <div className="CustomAlert">
          <p>{alertMessage}</p>
          <button onClick={() => setAlertMessage(null)} className="CloseAlertButton">Close</button>
        </div>
      )}
      <div className="Sidebar">
        <button className="NewChatButton" onClick={() => navigate('/chat')}>
          <span className="PlusIcon">&#43;</span>
          <span className="NewChatText">New Chat</span>
        </button>
        <div className="LatestChats">
          <h2>Latest</h2>
          {allChats.map((chat, index) => (
            <div key={index} className="ChatItem">
              <button onClick={() => navigate(`/chat/${chat.id}`)}>
                {chat.name}
              </button>
            </div>
          ))}
        </div>
      </div>
      {alertMessage && (
        <div className="CustomAlert">
          <p>{alertMessage}</p>
          <button onClick={() => setAlertMessage(null)} className="CloseAlertButton">Close</button>
        </div>
      )}
      <div className="ChatContainer">
        <h2>NutriVision</h2>
        <div className="ChatHistoryContainer" ref={chatHistoryRef}>
          {loading && 
            <div className="ChatBubble">
              <div className="UserMessage">
                {inputState.imagePreview && (
                  <img src={inputState.imagePreview} alt="User Preview" className="UserImagePreview" />
                )}
                {inputState.message}
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
                    src={URL.createObjectURL(chat.user.image)} 
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