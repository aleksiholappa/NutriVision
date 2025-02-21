import React from 'react';
import { useNavigate } from 'react-router-dom';

const RegistrationSuccessForm: React.FC = () => {
    const navigate = useNavigate();

    const handleGoToHomepage = () => {
        navigate('/');
    };

    const handleLogin = () => {
        navigate('/login');
    };

    return (
        <div>
            <h2>Registration successful!</h2>
            <p>Thank you for registering with NutriVision.</p>
            <button onClick={handleGoToHomepage}>Go to homepage</button>
            <button onClick={handleLogin}>Login</button>
        </div>
    );
};

export default RegistrationSuccessForm;