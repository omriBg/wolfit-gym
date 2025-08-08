import React, { useState } from 'react';
import './App.css';
import WelcomeScreen from './WelcomeScreen.js';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  if (isLoggedIn) {
    return <WelcomeScreen/>;
  }
  
  return (
    <div className="App">
      <div className="logo-container">
        <img src="/logo1.png" alt="WOLFit Logo" className="login-logo" />
      </div>
      
      <div className="login-form">
        <input type="user name" placeholder="שם משתמש" />
        <input type="password" placeholder="סיסמה" />
        <button onClick={handleLogin}>כניסה</button>
        <p>אין לך חשבון? <span>הירשם  כאן</span></p>
      </div>
    </div>
  );
}

export default App;