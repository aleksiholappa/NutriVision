import React, { use, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import RegistrationPage from './components/RegistrationPage';
import HomePage from './components/HomePage';
import RegistrationSuccessPage from './components/RegistrationSuccessPage';
import ProfilePage from './components/ProfilePage';
import ChatPage from './components/ChatPage';
import ProtectedRoute from './components/ProtectedRoute';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from './components/Store';
import { logout, login } from './components/authSlice';
import './App.css';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const App: React.FC = () => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);

  const refreshToken = async (): Promise<string | null> => {
    try {
      const response = await axios.get('/api/token/refresh', { withCredentials: true });
      console.log('Token refreshed successfully');
      const newToken = response.data.token;
      dispatch(login());
      localStorage.setItem('token', newToken);
      return newToken;
    } catch (error: any) {
      console.log("Couldn't refresh access token", error.response.data.error);
      dispatch(logout());
      return null;
    } finally {
      setLoading(false);
    }
  };

  const isTokenExpiringSoon = (token: string | null): boolean => {
    try {
      if (!token) {
        return false;
      }
      const decoded: { exp: number } = jwtDecode(token);
      const currentTime = Math.floor(Date.now() / 1000);
      const timeLeft = decoded.exp - currentTime;
      return timeLeft < 5 * 60; // Refresh if less than 5 minutes left
    } catch (error) {
      console.error('Error decoding token:', error);
      return false;
    }
  };

  useEffect(() => {
    let token: string | null;
    (async () => {
      token = await refreshToken();
    })();

    const interval = setInterval(async () => {
      if (isTokenExpiringSoon(token)) {
        console.log('Token is expiring soon, refreshing...');
        token = await refreshToken();
      }
    }, 1 * 60 * 1000); // Check every 1 minute

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }  

  return (
    <Router>
      <div>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/" element={<HomePage />} />
          <Route path="registration-success" element={<RegistrationSuccessPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route
            path="/chat/:chat-id?"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <ChatPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
