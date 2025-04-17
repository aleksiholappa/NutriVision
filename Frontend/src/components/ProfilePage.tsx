import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'
import axios from 'axios';
import './ProfilePage.css';
import { RootState } from './Store';
import { useSelector } from 'react-redux';

const baseUrl = '/api/profile'

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [healthConditions, setHealthConditions] = useState<string[]>([]);
  const [diet, setDiet] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [favoriteDishes, setFavoriteDishes] = useState<string[]>([]);
  const [dislikedDishes, setDislikedDishes] = useState<string[]>([]);
  const [window, setWindow] = useState(false);
  const [feature, setFeature] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');  
  const token = useSelector((state: RootState) => state.auth.token);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get(baseUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const { healthConditions, diet, allergies, favoriteDishes, dislikedDishes } = response.data;
        setHealthConditions(healthConditions || []);
        setDiet(diet || []);
        setAllergies(allergies || []);
        setFavoriteDishes(favoriteDishes || []);
        setDislikedDishes(dislikedDishes || []);
      } catch (error: any) {
        console.error(error.response.data.error);
        setError(error.response.data.error);
      }
    };

    fetchProfile();
  }, []);

  const handleAdd = () => {
    if (!input.trim() || !feature) return;
    if (feature === 'healthConditions') {
      setHealthConditions([...healthConditions, input.trim()]);
    }
    if (feature === 'diet') {
      setDiet([...diet, input.trim()]);
    }
    if (feature === 'allergies') {
      setAllergies([...allergies, input.trim()]);
    }
    if (feature === 'favoriteDishes') {
      setFavoriteDishes([...favoriteDishes, input.trim()]);
    }
    if (feature === 'dislikedDishes') {
      setDislikedDishes([...dislikedDishes, input.trim()]);
    }
    setInput('');
    setWindow(false);
  };

  const handleRemove = (feature: string, value: string) => {
    if (feature === 'healthConditions') {
      setHealthConditions(healthConditions.filter((item) => item !== value));
    }
    if (feature === 'diet') {
      setDiet(diet.filter((item) => item !== value));
    }
    if (feature === 'allergies') {
      setAllergies(allergies.filter((item) => item !== value));
    }
    if (feature === 'favoriteDishes') {
      setFavoriteDishes(favoriteDishes.filter((item) => item !== value));
    }
    if (feature === 'dislikedDishes') {
      setDislikedDishes(dislikedDishes.filter((item) => item !== value));
    }
  };
    
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();    
    try {
      const response = await axios.post(baseUrl, {
        healthConditions,
        diet,
        allergies,
        favoriteDishes,
        dislikedDishes,
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      setSuccess('Profile updated');
      setError('');
      navigate('/chat');
    } catch (error: any) {
      console.error(error.response.data.error);
      setError(error.response.data.error);
      setSuccess('');
    }
  };
    
  return (
    <div className="ProfilePageContainer">
      <div className="ProfileContainer">
        <h2>Profile</h2>
        <button type="submit" className="SaveButton" onClick={handleSubmit}>
        Save
        </button>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}
      <form>
        <div>
          <div className="FeatureContainer">
            <label>Health conditions</label>
            <button type="button" className="AddItemButton" onClick={() => { setFeature('healthConditions'); setWindow(true); }}>
            Add
            </button>
          </div>
          <div className="ItemsContainer">
            {healthConditions.map((item) => (
              <div key={item} className="Item">
                {item}
                <button onClick={() => handleRemove('healthConditions', item)}
                  className="RemoveItemButton">
                  &#10006;
                </button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="FeatureContainer">
            <label>Diet</label>
            <button type="button" className="AddItemButton" onClick={() => { setFeature('diet'); setWindow(true); }}>
            Add
            </button>
          </div>
          <div className="ItemsContainer">
            {diet.map((item) => (
              <div key={item} className="Item">
                {item}
                <button onClick={() => handleRemove('diet', item)}
                  className="RemoveItemButton">
                  &#10006;
                </button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="FeatureContainer">
            <label>Allergies</label>
            <button type="button" className="AddItemButton" onClick={() => { setFeature('allergies'); setWindow(true); }}>
            Add
            </button>
          </div>
          <div className="ItemsContainer">
            {allergies.map((item) => (
              <div key={item} className="Item">
                {item}
                <button onClick={() => handleRemove('allergies', item)}
                  className="RemoveItemButton">
                  &#10006;
                </button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="FeatureContainer">
            <label>Favorite dishes</label>
            <button type="button" className="AddItemButton" onClick={() => { setFeature('favoriteDishes'); setWindow(true); }}>
            Add
            </button>
          </div>
          <div className="ItemsContainer">
            {favoriteDishes.map((item) => (
              <div key={item} className="Item">
                {item}
                <button onClick={() => handleRemove('favoriteDishes', item)}
                  className="RemoveItemButton">
                  &#10006;
                </button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="FeatureContainer">
            <label>Disliked dishes</label>
            <button type="button" className="AddItemButton" onClick={() => { setFeature('dislikedDishes'); setWindow(true); }}>
            Add
            </button>
          </div>
          <div className="ItemsContainer">
            {dislikedDishes.map((item) => (
              <div key={item} className="Item">
                {item}
                <button onClick={() => handleRemove('dislikedDishes', item)}
                  className="RemoveItemButton">
                  &#10006;
                </button>
              </div>
            ))}
          </div>
        </div>
      </form>
      <button className="ExitButton" onClick={() => navigate('/chat')}>Exit</button>
      {window && (
        <div className="Window">
          <div className="WindowContent">
            <h3>Add an item</h3>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <div className="WindowActions">
              <button onClick={handleAdd}>Add</button>
              <button onClick={() => setWindow(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;