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
import { setToken, logout } from './components/authSlice';
import './App.css';

const App: React.FC = () => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);

  const refreshToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        dispatch(logout()); // Logout if no refresh token is available
        return;
      }

      const response = await fetch('/api/login/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        dispatch(setToken(data.token));
      } else {
        dispatch(logout());
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      dispatch(logout());
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      dispatch(setToken(token));
    }

    // Periodically refresh the token
    const interval = setInterval(() => {
      refreshToken();
    }, 50 * 60 * 1000); // Refresh every 50 minutes

    setLoading(false);

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
          <Route path="profile" element={<ProfilePage />} />
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

// TODO: Improve token check. Add token refresh logic.

export default App;