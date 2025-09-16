import React, { useState } from 'react';
import './App.css';
import SignUpScreen from './SignUpScreen.js';
import SignUpPreferences from './SignUpPreferences.js';
import WelcomeScreen from './WelcomeScreen.js';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import './mobile-fix.css';
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('login');
  const [userBasicData, setUserBasicData] = useState(null);
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [loginMessage, setLoginMessage] = useState(''); 
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [googleUserData, setGoogleUserData] = useState(null);


  // Google OAuth Client ID
  const GOOGLE_CLIENT_ID = "386514389479-impprp7mgpalddmuflkvev582v8idjug.apps.googleusercontent.com"; 

  const handleGoogleLogin = async (credentialResponse) => {
    setIsLoading(true);
    setLoginMessage('מתחבר עם Google...');
    
    try {
      const response = await fetch('https://wolfit-gym-backend-ijvq.onrender.com/api/google-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential: credentialResponse.credential
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('התחברות הצליחה:', result.user);
        setLoggedInUser(result.user);
        setIsLoggedIn(true);
        setLoginMessage('');
      } else {
        if (result.isNewUser) {
          // משתמש חדש - שמירת נתוני Google ומעבר למסך הרשמה
          setGoogleUserData(result.googleData);
          setLoginMessage('משתמש חדש - אנא הירשם תחילה');
          setTimeout(() => {
            handleGoToSignUp();
          }, 1000);
        } else {
          setLoginMessage(result.message || 'שגיאה בהתחברות עם Google');
        }
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
      // הוספת נתוני Google לנתוני ההרשמה
      const registrationData = {
        ...completeUserData,
        googleData: googleUserData
      };
      
      const response = await fetch('https://wolfit-gym-backend-ijvq.onrender.com/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('הרשמה הושלמה בהצלחה:', result);
        setLoggedInUser(result.user);
        setIsLoggedIn(true);
        setCurrentScreen('login');
        setGoogleUserData(null); // ניקוי נתוני Google
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
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="App">
        <div className="logo-container">
          <img src="/logo1.png" alt="WOLFit Logo" className="login-logo" />
        </div>
        
        <div className="login-form">
          {/* כפתור Google OAuth */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            marginBottom: '20px',
            opacity: isLoading ? 0.6 : 1
          }}>
            <GoogleLogin
              onSuccess={handleGoogleLogin}
              onError={() => setLoginMessage('שגיאה בהתחברות עם Google')}
              theme="outline"
              size="large"
              text="signin_with"
              shape="rectangular"
              logo_alignment="left"
              disabled={isLoading}
            />
          </div>
        
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
        
        {/* אינדיקטור טעינה */}
        {isLoading && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            marginTop: '10px'
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              border: '2px solid #b38ed8',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginLeft: '8px'
            }}></div>
            מתחבר עם Google...
          </div>
        )}
        
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
    </GoogleOAuthProvider>
  );
}

export default App;