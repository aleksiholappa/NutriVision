import React, { useState, useEffect, useRef } from "react";
import "./ChatPage.css";
import { useNavigate, useParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { APP_VERSION } from "../utils/config";
import axios from "axios";
import { useDispatch } from "react-redux";
import { logout } from "./authSlice";

const baseImageUrl = "/api/recognition";
const baseLLMUrl = "/api/llm";
const logoutUrl = "/api/login/logout";
const userUrl = "/api/users";
const maxFileSize = 2; // 2 MB

const ChatPage: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const params = useParams();
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [newChat, setNewChat] = useState<boolean>(false);
  const [allChats, setAllChats] = useState<{ id: string; name: string }[]>([]);
  const [openUserMenu, setOpenUserMenu] = useState<boolean>(false);
  const [userIcon, setUserIcon] = useState<string>("U");
  const [chatHistory, setChatHistory] = useState<
    { user: { message: string; image: File | null }; bot: string }[]
  >([]);
  const [inputState, setInputState] = useState<{
    message: string;
    imagePreview: string | null;
  }>({
    message: "",
    imagePreview: null,
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
      element.style.height = "auto";
      element.style.height = `calc(${element.scrollHeight}px)`;

      if (parentElement) {
        parentElement.style.height = "auto";
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
    if (localStorage.getItem("token") && !newChat) {
      const latestChatId: string | null = params["chat-id"] || null;
      console.log("Latest chat ID:", latestChatId);
      loadAllChats();
      if (latestChatId) {
        console.log("Loading chat history for chat ID:", latestChatId);
        loadChatHistory(latestChatId);
      }
    }
    setNewChat(false);
    return () => {
      if (params["chat-id"] !== undefined) {
        window.location.reload();
      }
    };
  }, [params]);

  useEffect(() => {
    handleUserIcon();
  }, []);

  /**
   * Handle user icon generation
   *
   * Fetches user data from the backend and generates a user icon based on the username
   */
  const handleUserIcon = async () => {
    const response = await axios.get(userUrl, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    if (response.status !== 200) {
      throw new Error("Failed to fetch user data");
    }
    const data = response.data;
    const userIcon = data.username.charAt(0).toUpperCase();
    setUserIcon(userIcon);
  };

  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, []);

  /**
   * Load chat history from the backend
   */
  const loadChatHistory = async (latestChatId: string) => {
    try {
      if (latestChatId) {
        const response = await axios.get(
          `${baseLLMUrl}/chat_one/${latestChatId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        if (response.status !== 200) {
          throw new Error("Failed to fetch chat history");
        }
        const data = response.data;

        console.log("Chat history: ", data);
        const history = data
          .map((item: any) => {
            let file: File | null = null;

            if (item.image) {
              const byteString = atob(item.image.split(",")[1]); // Decode Base64
              const mimeString = item.image
                .split(",")[0]
                .split(":")[1]
                .split(";")[0];

              const byteArray = new Uint8Array(byteString.length);
              for (let i = 0; i < byteString.length; i++) {
                byteArray[i] = byteString.charCodeAt(i);
              }

              const blob = new Blob([byteArray], { type: mimeString });
              file = new File([blob], "image.png", { type: mimeString });
            }

            let bot_message = "";
            const image_result = item.image_result;
            const nutrition_message = item.nutrition_message;
            const bot_reply = item.bot_message;

            bot_message = formBotMessage(
              bot_reply,
              image_result,
              nutrition_message
            );
            return {
              user: {
                message: item.user_message,
                image: file,
              },
              bot: bot_message.trim(),
            };
          })
          .reverse();
        setChatHistory(history);
      }
    } catch (error) {
      console.error("Error loading chat history", error);
    }
  };

  /**
   * Load all chats from the backend
   */
  const loadAllChats = async () => {
    try {
      const response = await axios.get(baseLLMUrl + "/chat_history", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = response.data;
      console.log("All chats: ", data);
      const allChats = data
        .map((item: any) => ({
          id: item.id,
          name: item.name,
        }))
        .reverse();
      setAllChats(allChats);
    } catch (error) {
      console.error("Error loading chat history", error);
    }
  };

  /**
   * Handle image upload event
   *
   * @param event - Change event for the image upload input
   */
  const handleImageUpload: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void = (event) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];

      const maxSize = maxFileSize * 1024 * 1024;
      if (file.size > maxSize) {
        setAlertMessage(
          `File too large. Please select a file smaller than ${maxFileSize} MB.`
        );
        event.target.value = "";
        return;
      }

      setImage(file);
      setImagePreview(URL.createObjectURL(file));

      event.target.value = "";
    }
  };

  const formBotMessage = (
    botReply: string,
    imageResult: string | null,
    nutritionMessage: string | null
  ) => {
    if (imageResult) {
      return `Recognized food items from the image:\n\n${imageResult}\n\n${botReply}`;
    } else if (nutritionMessage) {
      return `${nutritionMessage}\n\n${botReply}`;
    } else {
      return botReply;
    }
  };

  /**
   * Handle image recognition
   *
   * @returns - Image recognition result
   */
  const handleImageRecognition = async (image: File): Promise<string> => {
    if (!image) return "";

    const formData = new FormData();
    formData.append("image", image);

    try {
      const response = await axios.post(baseImageUrl, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "multipart/form-data",
        },
      });
      const data = response.data;
      if (response.status !== 200) {
        throw new Error("Failed to recognize image");
      }
      return data;
    } catch (error) {
      console.error("Error recognizing image:", error);
      return "";
    }
  };

  /**
   * Handle LLM chat with the backend
   *
   * @param userMessage - User message
   * @param result - Image recognition result
   */
  const handleLLMChat = async (
    userMessage: string,
    result: string | null,
    image: File | null,
    chatId: string | null = null
  ) => {
    if (!chatId) {
      setAlertMessage("Chat ID is not available");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("message", userMessage);
      formData.append("chatId", chatId);
      if (result) formData.append("result", result);
      if (image) formData.append("image", image);

      console.log(
        "➡ Sending message to backend:",
        userMessage,
        "Result:",
        result,
        "Chat ID:",
        chatId
      );
      const response = await axios.post(baseLLMUrl + "/chat", formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.status !== 200) {
        throw new Error("Failed to fetch LLM response");
      }

      const data = await response.data;
      const botReply = data.response;
      const imageResult = data.image_result;
      const nutritionMessage = data.nutrition_message;
      let botMessage = "";
      botMessage = formBotMessage(botReply, imageResult, nutritionMessage);
      console.log("Bot Message:", botReply);
      setChatHistory([
        {
          user: {
            message: userMessage,
            image: image,
          },
          bot: botMessage.trim(),
        },
        ...chatHistory,
      ]);
    } catch (error: any) {
      if (axios.isCancel(error)) {
        console.log("Request canceled:", error.message);
      } else {
        setChatHistory([
          {
            user: {
              message: userMessage,
              image: image,
            },
            bot: "Sorry, I am unable to process your request at the moment.",
          },
          ...chatHistory,
        ]);
        console.error("Error fetching LLM response:", error);
      }
    }
  };

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

      let chatId: string | null = params["chat-id"] || null;
      if (!chatId) {
        chatId = await handleCreateNewChat(userMessage);
      }

      setLoading(true);
      setChatInput("");
      setImage(null);
      setImagePreview(null);

      let recognitionResult = "";
      if (userImage) {
        recognitionResult = await handleImageRecognition(userImage);
      }
      await handleLLMChat(userMessage, recognitionResult, userImage, chatId);
    } catch (error) {
      console.error("Error submitting chat:", error);
    } finally {
      console.log("Chat submission completed");
      setLoading(false);
      setInputState({ message: "", imagePreview: null });
    }
  };

  /**
   * Handle creating a new chat
   *
   * @param userMessage - User message for the new chat name
   * @returns - New chat ID
   */
  const handleCreateNewChat = async (userMessage: string) => {
    if (!userMessage) userMessage = "New Chat";
    const newChatId = uuidv4();
    setNewChat(true);
    setAllChats((prev) => [{ id: newChatId, name: userMessage }, ...prev]);
    const response = await axios.post(
      baseLLMUrl + "/chat_history",
      JSON.stringify({
        chatId: newChatId,
        chatName: userMessage,
      }),
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "content-type": "application/json",
        },
      }
    );
    if (response.status !== 200) {
      throw new Error("Failed to create new chat");
    }
    const data = response.data;
    console.log("New chat created:", data);
    navigate(`/chat/${newChatId}`, { replace: true });
    return newChatId;
  };

  /**
   * Handle key down event for the chat input
   * Enables sending the chat message on pressing Enter
   * Adds a new line on pressing Shift + Enter
   *
   * @param e - Keyboard event for the chat input
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        return;
      } else {
        e.preventDefault();
        if (!loading) {
          document
            .querySelector("form")
            ?.dispatchEvent(
              new Event("submit", { cancelable: true, bubbles: true })
            );
        }
      }
    }
  };

  /**
   * Handle new chat button click event
   */
  const handleNewChat = () => {
    setChatInput("");
    setImage(null);
    setImagePreview(null);
    setInputState({ message: "", imagePreview: null });
    setChatHistory([]);
    navigate("/chat", { replace: true });
  };

  /**
   * Handle delete chat button click event
   *
   * @param chatId - ID of the chat to be deleted
   */
  const handleDeleteChat = async (chatId: string) => {
    const response = await axios.delete(baseLLMUrl + "/chat_history", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "content-type": "application/json",
      },
      data: JSON.stringify({
        chatId: chatId,
      }),
    });
    if (response.status !== 200) {
      throw new Error("Failed to delete chat");
    }
    const data = response.data;
    console.log("Chat deleted:", data);
    setAllChats((prev) => prev.filter((chat) => chat.id !== chatId));
    if (params["chat-id"] === chatId) {
      handleNewChat();
    }
  };

  /**
   * Handle logout button click event
   */
  const handleLogout = async () => {
    const response = await axios.post(
      logoutUrl,
      {},
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        withCredentials: true,
      }
    );
    if (response.status !== 200) {
      throw new Error("Failed to logout");
    }
    const data = response.data;
    localStorage.removeItem("token");
    dispatch(logout());
    console.log("Logout successful:", data);
    navigate("/login", { replace: true });
  };

  /**
   * Format text for rendering
   * Replaces **text** with <b>text</b> and adds bullet points for list items
   *
   * @param text - Text to format
   * @returns - Formatted text as JSX
   */
  const formatText = (text: string) => {
    return (
      <span
        dangerouslySetInnerHTML={{
          __html: text
            .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
            .replace(/^\* /gm, "• "),
        }}
      ></span>
    );
  };

  /**
   * Dynamic class names for the chat input container, form, and chat input
   * Helps in resizing the chat input and chat history container
   */
  const inputContainerClass = `ChatInputContainer ${
    imagePreview ? "hasImagePreview" : ""
  }`;
  const formClass = `ChatForm ${imagePreview ? "hasImagePreview" : ""}`;
  const chatInputClass = `chat-input ${imagePreview ? "hasImagePreview" : ""}`;

  /**
   * Render the ChatPage component
   */
  return (
    <div className="ChatPageContainer">
      {alertMessage && (
        <div className="CustomAlert">
          <p>{alertMessage}</p>
          <button
            onClick={() => setAlertMessage(null)}
            className="CloseAlertButton"
          >
            Close
          </button>
        </div>
      )}
      <div className="Sidebar">
        <button className="NewChatButton" onClick={handleNewChat}>
          <span className="PlusIcon">&#43;</span>
          <span className="NewChatText">New Chat</span>
        </button>
        <div className="LatestChats">
          <h2>Latest</h2>
          {allChats.map((chat, index) => (
            <div key={index} className="ChatItem">
              <button
                onClick={() => navigate(`/chat/${chat.id}`, { replace: true })}
                className="ChatButton"
              >
                <div className="ChatName">{chat.name}</div>
              </button>
              <button
                onClick={() => {
                  handleDeleteChat(chat.id);
                }}
                className="DeleteChatButton"
              >
                &#10006; {/* Unicode cross mark */}
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="TopBar">
        <div className="LogoContainer">
          <h2>NutriVision</h2>
          <span className="AppVersion">{APP_VERSION}</span>
        </div>
        <button
          className="UserButton"
          onClick={() => {
            setOpenUserMenu(!openUserMenu);
          }}
        >
          <span className="UserIcon">{userIcon}</span>
        </button>
      </div>
      <div className={`UserMenu ${openUserMenu ? "expanded" : ""}`}>
        <button
          className="UserProfileButton"
          onClick={() => {
            navigate("/profile");
          }}
        >
          Profile
        </button>
        <button
          className="LogoutButton"
          onClick={() => {
            handleLogout();
          }}
        >
          <img src="/logout-24.png" alt="Logout Icon" className="LogoutIcon" />
          Log Out
        </button>
      </div>
      {alertMessage && (
        <div className="CustomAlert">
          <p>{alertMessage}</p>
          <button
            onClick={() => setAlertMessage(null)}
            className="CloseAlertButton"
          >
            Close
          </button>
        </div>
      )}
      <div className="ChatContainer">
        <div className="ChatHistoryContainer" ref={chatHistoryRef}>
          {loading && (
            <div className="ChatBubble">
              <div className="UserMessage">
                {inputState.imagePreview && (
                  <img
                    src={inputState.imagePreview}
                    alt="User Preview"
                    className="UserImagePreview"
                  />
                )}
                {formatText(inputState.message)}
              </div>
              <div className="BotMessage">
                <span className="loading-dots">
                  <span>•</span>
                  <span>•</span>
                  <span>•</span>
                </span>
              </div>
            </div>
          )}
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
                {formatText(chat.user.message)}
              </div>
              <div className="BotMessage">{formatText(chat.bot)}</div>
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
              onClick={() => document.getElementById("image-upload")?.click()}
            >
              &#43; {/* Plus icon */}
            </button>
            <input
              type="file"
              id="image-upload"
              accept="image/*"
              style={{ display: "none" }}
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

export default ChatPage;
