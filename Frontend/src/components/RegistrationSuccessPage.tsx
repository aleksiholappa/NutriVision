import React from "react";
import { useNavigate } from "react-router-dom";
import "./RegistrationSuccessPage.css";

const RegistrationSuccessPage: React.FC = () => {
  const navigate = useNavigate();

  const handleGoToHomepage = () => {
    navigate("/");
  };

  const handleLogin = () => {
    navigate("/login");
  };

  return (
    <div className="RegistrationSuccessPageContainer">
      <h2>Registration successful!</h2>
      <p>Thank you for registering with NutriVision.</p>
      <div>
        <button onClick={handleGoToHomepage}>Go to homepage</button>
        <button onClick={handleLogin}>Login</button>
      </div>
    </div>
  );
};

export default RegistrationSuccessPage;
