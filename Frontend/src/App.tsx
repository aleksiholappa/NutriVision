import React from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import RegistrationPage from './components/RegistrationPage';
import RegistrationSuccessPage from './components/RegistrationSuccessPage';
import HomePage from './components/HomePage';
import UserHomePage from './components/UserHomePage';
import './App.css';

const App: React.FC = () => {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/" element={<HomePage />} />
          <Route path="registration-success" element={<RegistrationSuccessPage />} />
          <Route path="/:userId" element={<UserHomePage />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;