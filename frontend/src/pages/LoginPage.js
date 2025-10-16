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
    console.log('🚀 מתחיל שליחת SMS...');
    console.log('📱 מספר טלפון מקורי:', phoneNumber);
    
    if (!phoneNumber.trim()) {
      setLoginMessage('אנא הזן מספר טלפון');
      return;
    }

    // הוספת +972 אוטומטית למספרים ישראליים
    let formattedPhone = phoneNumber;
    if (phoneNumber.startsWith('0')) {
      // אם מתחיל ב-0, החלף ב-+972
      formattedPhone = '+972' + phoneNumber.substring(1);
    } else if (!phoneNumber.startsWith('+')) {
      // אם לא מתחיל ב-+, הוסף +972
      formattedPhone = '+972' + phoneNumber;
    }

    console.log('📱 מספר טלפון מעוצב:', formattedPhone);

    setIsLoading(true);
    setLoginMessage('שולח קוד SMS...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/send-sms-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: formattedPhone
        })
      });
      
      const result = await response.json();
      console.log('📨 תגובה מהשרת:', result);
      
      if (result.success) {
        setSmsSent(true);
        setLoginMessage('קוד SMS נשלח בהצלחה! בדוק את הטלפון שלך.');
        console.log('✅ SMS נשלח, עובר למצב הזנת קוד');
        console.log('🔄 smsSent:', true);
      } else {
        setLoginMessage(result.message || 'שגיאה בשליחת SMS');
        console.error('❌ שגיאה בשליחת SMS:', result);
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

    // הוספת +972 אוטומטית למספרים ישראליים (אותו לוגיקה)
    let formattedPhone = phoneNumber;
    if (phoneNumber.startsWith('0')) {
      formattedPhone = '+972' + phoneNumber.substring(1);
    } else if (!phoneNumber.startsWith('+')) {
      formattedPhone = '+972' + phoneNumber;
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
          phoneNumber: formattedPhone,
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
          <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#333', fontSize: '24px', fontWeight: 'bold' }}>
            התחברות למערכת
          </h2>
          
          {/* Google Login Button */}
          <div className="google-login-container" style={{ marginBottom: '20px' }}>
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
                maxWidth: '280px',
                height: '50px',
                borderRadius: '12px',
                border: '2px solid #4285f4',
                background: '#ffffff',
                fontFamily: "'Roboto', sans-serif",
                fontWeight: '600',
                fontSize: '16px',
                color: '#4285f4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(66, 133, 244, 0.2)',
                transition: 'all 0.3s ease'
              }}
            />
          </div>

          {/* Divider */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            margin: '20px 0',
            color: '#666'
          }}>
            <div style={{ flex: 1, height: '1px', background: '#ddd' }}></div>
            <span style={{ margin: '0 15px', fontSize: '14px' }}>או</span>
            <div style={{ flex: 1, height: '1px', background: '#ddd' }}></div>
          </div>

          {/* SMS Login Button */}
          <div className="sms-login-container">
            {console.log('🔍 smsSent:', smsSent, 'loginMethod:', loginMethod)}
            {!smsSent ? (
              <div>
                <button
                  onClick={() => setLoginMethod('sms')}
                  style={{
                    width: '100%',
                    maxWidth: '280px',
                    height: '50px',
                    padding: '12px 20px',
                    background: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  📱 התחבר עם SMS
                </button>
                
                {/* SMS Form - מוסתר עד ללחיצה */}
                {loginMethod === 'sms' && (
                  <div style={{ marginTop: '20px', padding: '20px', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #e9ecef' }}>
                    <p style={{ 
                      marginBottom: '15px', 
                      fontSize: '14px', 
                      color: '#666',
                      textAlign: 'center'
                    }}>
                      🇮🇱 הזן מספר טלפון ישראלי (הקוד +972 יתווסף אוטומטית)
                    </p>
                    <input
                      type="tel"
                      placeholder="מספר טלפון (למשל: 0501234567)"
                      value={phoneNumber}
                      onChange={(e) => {
                        // ניקוי הקלט - רק ספרות
                        let cleaned = e.target.value.replace(/[^\d]/g, '');
                        setPhoneNumber(cleaned);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        marginBottom: '15px',
                        border: '2px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '16px',
                        outline: 'none',
                        transition: 'border-color 0.3s ease'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                      onBlur={(e) => e.target.style.borderColor = '#ddd'}
                    />
                    <button
                      onClick={handleSendSMS}
                      disabled={isLoading || !phoneNumber.trim()}
                      style={{
                        width: '100%',
                        padding: '12px 20px',
                        background: phoneNumber.trim() ? 'linear-gradient(135deg, #8b5cf6, #a855f7)' : '#ccc',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: phoneNumber.trim() ? 'pointer' : 'not-allowed',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {isLoading ? 'שולח...' : 'שלח קוד SMS'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #e9ecef' }}>
                <h3 style={{ marginBottom: '15px', color: '#333', fontSize: '18px' }}>
                  הזן את הקוד שקיבלת
                </h3>
                <input
                  type="text"
                  placeholder="הזן את הקוד שקיבלת"
                  value={smsCode}
                  onChange={(e) => setSmsCode(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    marginBottom: '15px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none',
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                  onBlur={(e) => e.target.style.borderColor = '#ddd'}
                />
                <button
                  onClick={handleVerifySMS}
                  disabled={isLoading || !smsCode.trim()}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    background: smsCode.trim() ? 'linear-gradient(135deg, #8b5cf6, #a855f7)' : '#ccc',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: smsCode.trim() ? 'pointer' : 'not-allowed',
                    marginBottom: '10px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {isLoading ? 'מאמת...' : 'אמת קוד'}
                </button>
                <button
                  onClick={() => {
                    setSmsSent(false);
                    setSmsCode('');
                    setPhoneNumber('');
                    setLoginMethod('google');
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    background: 'transparent',
                    color: '#8b5cf6',
                    border: '2px solid #8b5cf6',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  שנה מספר טלפון
                </button>
              </div>
            )}
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
            </div>
          )}
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}

export default LoginPage;
