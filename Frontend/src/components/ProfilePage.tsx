import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'
import axios from 'axios';
import './ProfilePage.css';

const baseUrl = '/api/profile'

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [healthConditions, setHealthConditions] = useState<string>('');
  const [diet, setDiet] = useState<string>('');
  const [allergies, setAllergies] = useState<string>('');
  const [favoriteDishes, setFavoriteDishes] = useState<string>('');
  const [dislikedDishes, setDislikedDishes] = useState<string>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');  
    
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();    
    try {
      const response = await axios.post(baseUrl,
        {
          healthConditions,
          diet,
          allergies,
          favoriteDishes,
          dislikedDishes,
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      setSuccess('Profile updated');
      setError('');
      navigate('/chat')
    } catch (error: any) {
      console.error(error.response.data.error);
      setError(error.response.data.error);
      setSuccess('');
    }
  };
    
  return (
    <div className="ProfilePageContainer">
      <h2>Profile</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>Health conditions</label>
          <input
            type="text"
            value={healthConditions}
            onChange={(e) => setHealthConditions(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Diet</label>
          <input
            type="text"
            value={diet}
            onChange={(e) => setDiet(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Allergies</label>
          <input
            type="text"
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Favorite dishes</label>
          <input
            type="text"
            value={favoriteDishes}
            onChange={(e) => setFavoriteDishes(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Disliked dishes</label>
          <input
            type="text"
            value={dislikedDishes}
            onChange={(e) => setDislikedDishes(e.target.value)}
            required
          />
        </div>
        <button type="submit">Save</button>
      </form>
      <button onClick={() => navigate('/chat')}>Exit</button>
    </div>
  );
};
    
export default ProfilePage;