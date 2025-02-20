import React from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import RegistrationForm from './components/RegistrationForm';

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div>
      <h2>Welcome to NutriVision</h2>
      <p>Please navigate to login or register</p>
      <button onClick={() => navigate('/login')}>Go to Login</button>
      <button onClick={() => navigate('/register')}>Go to Register</button>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegistrationForm />} />
          <Route path="/" element={<Home />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;