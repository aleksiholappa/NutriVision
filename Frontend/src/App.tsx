import React, { useEffect, useState } from 'react';
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
import { validateToken, logout } from './components/authSlice';
import './App.css';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const App: React.FC = () => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const token = useSelector((state: RootState) => state.auth.token);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);

  const refreshToken = async () => {
    try {
      const response = await axios.get('/api/token/refresh', { withCredentials: true });
      if (response.status === 200) {
        const { token } = response.data;
        dispatch(validateToken(token));
        console.log('Token refreshed successfully');
      } else {
        dispatch(logout());
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      dispatch(logout());
    } finally {
      setLoading(false);
    }
  };

  const isTokenExpiringSoon = (token: string | null): boolean => {
    try {
      if (!token) return true;
      const decoded: { exp: number } = jwtDecode(token);
      const currentTime = Math.floor(Date.now() / 1000);
      const timeLeft = decoded.exp - currentTime;
      return timeLeft < 5 * 60; // Refresh if less than 5 minutes left
    } catch (error) {
      console.error('Error decoding token:', error);
      return true;
    }
  };

  useEffect(() => {
    refreshToken();

    const interval = setInterval(() => {
      if (isTokenExpiringSoon(token)) {
        console.log('Token is expiring soon, refreshing...');
        refreshToken();
      }
    }, 1 * 60 * 1000); // Check every 1 minute

    return () => clearInterval(interval);
  }, [dispatch]);

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
