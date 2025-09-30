import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
import './LoginPage.css';

function LoginPage() {
  const [loginMessage, setLoginMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleUserData, setGoogleUserData] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const googleButtonRef = useRef(null);

  // Google OAuth Client ID
  const GOOGLE_CLIENT_ID = "386514389479-impprp7mgpalddmuflkvev582v8idjug.apps.googleusercontent.com";

  const handleGoogleLogin = async (credentialResponse) => {
    setIsLoading(true);
    setLoginMessage('מתחבר עם Google...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/google-login`, {
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
        login(result.token, result.user);
        
        // בדיקה אם זה האדמין
        if (result.user.email === 'omri952682@gmail.com') { // אימייל האדמין
          navigate('/admin-choice');
        } else {
          navigate('/dashboard');
        }
      } else {
        if (result.isNewUser) {
          // משתמש חדש - שמירת נתוני Google ומעבר למסך הרשמה
          console.log('🆕 משתמש חדש - נתוני Google:', result.googleData);
          setGoogleUserData(result.googleData);
          setLoginMessage('משתמש חדש - אנא הירשם תחילה');
          setTimeout(() => {
            console.log('🚀 מעבר למסך הרשמה עם נתונים:', result.googleData);
            navigate('/signup', { state: { googleData: result.googleData } });
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


  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="login-page">
        <div className="logo-container">
          <img src="/logo1.png" alt="WOLFit Logo" className="login-logo" />
        </div>
        
        <div className="login-form">
          <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#333' }}>
          </h2>
          {/* כפתור Google OAuth עם עיצוב מותאם */}
          <div className="google-login-container">
            <GoogleLogin
              onSuccess={handleGoogleLogin}
              onError={() => setLoginMessage('שגיאה בהתחברות עם Google')}
              theme="outline"
              size="large"
              text="signin_with"
              shape="rectangular"
              logo_alignment="left"
              disabled={isLoading}
              style={{
                width: '100%',
                maxWidth: '320px',
                height: '56px',
                borderRadius: '12px',
                border: '2px solid #e0e0e0',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                fontFamily: "'Roboto', 'Segoe UI', sans-serif",
                fontWeight: '500',
                fontSize: '16px',
                color: '#3c4043',
                letterSpacing: '0.25px'
              }}
            />
          </div>
          
        
          {/* הודעה למשתמש */}
          {loginMessage && (
            <p style={{ 
              color: loginMessage.includes('שגיאה') ? '#000' : '#8b5cf6',
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
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}

export default LoginPage;
