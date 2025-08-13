import React, { useState } from 'react';
import './App.css';
import SignUpScreen from './SignUpScreen.js';
import SignUpPreferences from './SignUpPreferences.js';
import WelcomeScreen from './WelcomeScreen.js';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('login');
  const [userBasicData, setUserBasicData] = useState(null);
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [loginMessage, setLoginMessage] = useState(''); 
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false); 

  const handleLogin = async () => {
    if (!userName.trim() || !password.trim()) {
      setLoginMessage('אנא מלא את כל השדות');
      return;
    }

    setIsLoading(true); 
    setLoginMessage(''); 

    try {
      const response = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userName: userName.trim(),
          password: password
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('התחברות הצליחה:', result.user);
        setLoggedInUser(result.user); 
        setIsLoggedIn(true);
        setLoginMessage(''); 
      }else {
        setLoginMessage(result.message || 'שגיאה בהתחברות');
      }
      
    } catch (error) {
      console.error('שגיאה בחיבור לשרת:', error);
      setLoginMessage('שגיאה בחיבור לשרת. נסה שוב.');
    } finally {
      setIsLoading(false); 
    }
  };

  const handleGoToSignUp = () => {
    console.log('עובר למסך הרשמה');
    setCurrentScreen('signup');
  };

  const handleBackToLogin = () => {
    console.log('חוזר למסך התחברות');
    setCurrentScreen('login');
    setUserBasicData(null);
    setUserName('');
    setPassword('');
    setLoginMessage('');
  };

  const handleSignUpContinue = (basicData) => {
    console.log('הושלמו נתונים בסיסיים:', basicData);
    setUserBasicData(basicData); 
    setCurrentScreen('signupPreferences');
  };

  const handleCompleteSignUp = async (completeUserData) => {
    console.log('ההרשמה הושלמה בהצלחה!');
    console.log('נתוני משתמש מלאים:', completeUserData);
    
    try {
      const response = await fetch('http://localhost:3001/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(completeUserData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('ההרשמה הושלמה בהצלחה! אתה יכול להתחבר עכשיו');
        setCurrentScreen('login');
        setUserBasicData(null);
      } else {
        alert('שגיאה בהרשמה: ' + result.message);
      }
      
    } catch (error) {
      console.error('שגיאה בהרשמה:', error);
      alert('שגיאה בחיבור לשרת');
    }
  };

  const handleBackToSignUp = () => {
    console.log('חוזר למסך הרשמה');
    setCurrentScreen('signup');
  };

  if (isLoggedIn) {
    return <WelcomeScreen user={loggedInUser} />; 
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

  // 🔥 מסך ההתחברות החדש עם State
  return (
    <div className="App">
      <div className="logo-container">
        <img src="/logo1.png" alt="WOLFit Logo" className="login-logo" />
      </div>
      
      <div className="login-form">
        <input 
          type="text" 
          placeholder="שם משתמש"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          disabled={isLoading}
        />
        <input 
          type="password" 
          placeholder="סיסמה"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
        />
        
        {/* הודעה למשתמש */}
        {loginMessage && (
          <p style={{ 
            color: loginMessage.includes('שגיאה') ? '#ff6b6b' : '#b38ed8',
            textAlign: 'center',
            margin: '10px 0'
          }}>
            {loginMessage}
          </p>
        )}
        
        <button 
          onClick={handleLogin}
          disabled={isLoading}
          style={{
            opacity: isLoading ? 0.6 : 1,
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? 'מתחבר...' : 'כניסה'}
        </button>
        
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