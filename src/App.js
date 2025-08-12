import React, { useState } from 'react';
import './App.css';
import SignUpScreen from './SignUpScreen.js';
import SignUpPreferences from './SignUpPreferences.js';
import WelcomeScreen from './WelcomeScreen.js';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('login');
  const [userBasicData, setUserBasicData] = useState(null);
  
  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleGoToSignUp = () => {
    console.log('עובר למסך הרשמה');
    setCurrentScreen('signup');
  };

  const handleBackToLogin = () => {
    console.log('חוזר למסך התחברות');
    setCurrentScreen('login');
    setUserBasicData(null);
  };

  // כשמסיימים נתונים בסיסיים - עוברים למסך העדפות
  const handleSignUpContinue = (basicData) => {
    console.log('הושלמו נתונים בסיסיים:', basicData);
    setUserBasicData(basicData); 
    setCurrentScreen('signupPreferences');
  };

  // כשמסיימים הרשמה מלאה - חוזרים למסך התחברות
  const handleCompleteSignUp = (completeUserData) => {
    console.log('ההרשמה הושלמה בהצלחה!');
    console.log('נתוני משתמש מלאים:', completeUserData);
    
    // כאן נשמור במסד נתונים בעתיד
    // לעכשיו רק נחזור למסך התחברות
    alert('ההרשמה הושלמה בהצלחה! אתה יכול להתחבר עכשיו');
    
    // חזרה למסך התחברות
    setCurrentScreen('login');
    setUserBasicData(null);
  };

  const handleBackToSignUp = () => {
    console.log('חוזר למסך הרשמה');
    setCurrentScreen('signup');
  };

  if (isLoggedIn) {
    return <WelcomeScreen/>;
  }

  if (currentScreen === 'signup') {
    return (
      <SignUpScreen 
        onBackToLogin={handleBackToLogin}
        onSignUpComplete={handleSignUpContinue}
      />
    );
  }

  if (currentScreen === 'signupPreferences') {
    return (
      <SignUpPreferences 
        onBackClick={handleBackToSignUp}
        onCompleteSignUp={handleCompleteSignUp}
        userBasicData={userBasicData}
      />
    );
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
        <p>אין לך חשבון?
        <span 
            onClick={handleGoToSignUp}
            style={{
              color: '#b38ed8',
              cursor: 'pointer',
              marginRight: '5px',
              textDecoration: 'underline'
            }}
          >
            הירשם כאן
          </span>
        </p>
      </div>
    </div>
  );
}

export default App;