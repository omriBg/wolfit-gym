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
  const [loginMethod, setLoginMethod] = useState('google'); // 'google' או 'sms'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [smsSent, setSmsSent] = useState(false);
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

  // פונקציה לשליחת קוד SMS
  const handleSendSMS = async () => {
    if (!phoneNumber.trim()) {
      setLoginMessage('אנא הזן מספר טלפון');
      return;
    }

    setIsLoading(true);
    setLoginMessage('שולח קוד SMS...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/send-sms-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSmsSent(true);
        setLoginMessage('קוד SMS נשלח בהצלחה! בדוק את הטלפון שלך.');
      } else {
        setLoginMessage(result.message || 'שגיאה בשליחת SMS');
      }
    } catch (error) {
      console.error('שגיאה בשליחת SMS:', error);
      setLoginMessage('שגיאה בשליחת SMS. נסה שוב.');
    } finally {
      setIsLoading(false);
    }
  };

  // פונקציה לאימות קוד SMS
  const handleVerifySMS = async () => {
    if (!smsCode.trim()) {
      setLoginMessage('אנא הזן את הקוד שקיבלת');
      return;
    }

    setIsLoading(true);
    setLoginMessage('מאמת קוד SMS...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/verify-sms-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          smsCode: smsCode
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('התחברות SMS הצליחה:', result.user);
        login(result.token, result.user);
        
        // בדיקה אם זה האדמין
        if (result.user.email === 'omri952682@gmail.com') {
          navigate('/admin-choice');
        } else {
          navigate('/dashboard');
        }
      } else {
        if (result.isNewUser) {
          // משתמש חדש - מעבר למסך הרשמה
          console.log('🆕 משתמש חדש - נתוני טלפון:', result.phoneData);
          setLoginMessage('משתמש חדש - אנא הירשם תחילה');
          setTimeout(() => {
            navigate('/signup', { state: { phoneData: result.phoneData } });
          }, 1000);
        } else {
          setLoginMessage(result.message || 'שגיאה באימות SMS');
        }
      }
    } catch (error) {
      console.error('שגיאה באימות SMS:', error);
      setLoginMessage('שגיאה באימות SMS. נסה שוב.');
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
            התחברות למערכת
          </h2>
          
          {/* בחירת שיטת התחברות */}
          <div className="login-method-selector" style={{ marginBottom: '20px' }}>
            <button 
              className={`method-btn ${loginMethod === 'google' ? 'active' : ''}`}
              onClick={() => setLoginMethod('google')}
              style={{
                padding: '10px 20px',
                margin: '0 5px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                background: loginMethod === 'google' ? '#4285f4' : '#fff',
                color: loginMethod === 'google' ? '#fff' : '#333',
                cursor: 'pointer'
              }}
            >
              Google
            </button>
            <button 
              className={`method-btn ${loginMethod === 'sms' ? 'active' : ''}`}
              onClick={() => setLoginMethod('sms')}
              style={{
                padding: '10px 20px',
                margin: '0 5px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                background: loginMethod === 'sms' ? '#8b5cf6' : '#fff',
                color: loginMethod === 'sms' ? '#fff' : '#333',
                cursor: 'pointer'
              }}
            >
              SMS
            </button>
          </div>

          {/* Google Login */}
          {loginMethod === 'google' && (
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
                  maxWidth: '240px',
                  height: '40px',
                  borderRadius: '8px',
                  border: '1px solid #dadce0',
                  background: '#ffffff',
                  fontFamily: "'Roboto', sans-serif",
                  fontWeight: '500',
                  fontSize: '14px',
                  color: '#3c4043',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              />
            </div>
          )}

          {/* SMS Login */}
          {loginMethod === 'sms' && (
            <div className="sms-login-container">
              {!smsSent ? (
                <div>
                  <input
                    type="tel"
                    placeholder="מספר טלפון (למשל: +972501234567)"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      marginBottom: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                  <button
                    onClick={handleSendSMS}
                    disabled={isLoading || !phoneNumber.trim()}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: phoneNumber.trim() ? '#8b5cf6' : '#ccc',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      cursor: phoneNumber.trim() ? 'pointer' : 'not-allowed'
                    }}
                  >
                    שלח קוד SMS
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    placeholder="הזן את הקוד שקיבלת"
                    value={smsCode}
                    onChange={(e) => setSmsCode(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      marginBottom: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                  <button
                    onClick={handleVerifySMS}
                    disabled={isLoading || !smsCode.trim()}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: smsCode.trim() ? '#8b5cf6' : '#ccc',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      cursor: smsCode.trim() ? 'pointer' : 'not-allowed'
                    }}
                  >
                    אמת קוד
                  </button>
                  <button
                    onClick={() => {
                      setSmsSent(false);
                      setSmsCode('');
                      setPhoneNumber('');
                    }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      marginTop: '10px',
                      background: 'transparent',
                      color: '#8b5cf6',
                      border: '1px solid #8b5cf6',
                      borderRadius: '8px',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    שנה מספר טלפון
                  </button>
                </div>
              )}
            </div>
          )}
          
        
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
            </div>
          )}
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}

export default LoginPage;
