import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { login } from './authSlice';
import './LoginPage.css';

const baseUrl = '/api/login';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const response = await axios.post(
        baseUrl, 
        { emailOrUsername,password }, 
        { withCredentials: true }
      );
      setSuccess('Login successful!');
      setError('');
      localStorage.setItem('token', response.data.token);
      dispatch(login(response.data.token));
      navigate('/chat');
    } catch (error: any) {
      console.error(error.response.data.error);
      setError(error.response.data.error);
      setSuccess('');
      setTimeout(() => {
        setError('');
      }, 5000);
    }
  };

  return (
    <div className="LoginPageContainer">
      <h2>Login</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email or username</label>
          <input
            type="text"
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default LoginPage;