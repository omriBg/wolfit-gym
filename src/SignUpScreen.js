import React, { useState, useEffect } from 'react';
import './SignUpScreen.css';

function SignUpScreen({ onBackToLogin, onSignUpComplete }) {
    const [userName, setUserName] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const [birthdate, setBirthdate] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedDay, setSelectedDay] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [errors, setErrors] = useState({});
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [usernameAvailable, setUsernameAvailable] = useState(null);

    const days = Array.from({length: 31}, (_, i) => i + 1);
    
    const months = [
        'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
        'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ];
    
    const currentYear = new Date().getFullYear();
    const years = Array.from({length: 91}, (_, i) => currentYear - 10 - i);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
          document.body.style.overflow = 'unset';
        };
    }, []);

    const validateField = (fieldName, value) => {
        let error = '';
        
        switch (fieldName) {
            case 'userName':
                if (!value.trim()) {
                    error = 'שם משתמש הוא שדה חובה';
                } else if (value.length < 3) {
                    error = 'שם משתמש חייב להכיל לפחות 3 תווים';
                } else if (!/^[a-zA-Z0-9\s]+$/.test(value)) {
                    error = 'שם משתמש יכול להכיל רק אותיות באנגלית, מספרים ורווחים';
                }
                break;
                
            case 'password':
                if (!value) {
                    error = 'סיסמה היא שדה חובה';
                } else if (value.length < 6) {
                    error = 'סיסמה חייבת להכיל לפחות 6 תווים';
                }
                 else if (!/^[a-zA-Z0-9\s]+$/.test(value)) {
                error = 'שם משתמש יכול להכיל רק אותיות באנגלית, מספרים ורווחים';
                }
                break;
                
            case 'email':
                if (!value) {
                    error = 'אימייל הוא שדה חובה';
                } else if (!value.includes('@') || !value.includes('.')) {
                    error = 'אנא הזן כתובת אימייל תקינה';
                }
               
                break;
                
            case 'height':
                if (!value) {
                    error = 'גובה הוא שדה חובה';
                } else if (isNaN(value) || value < 100 || value > 250) {
                    error = 'גובה חייב להיות בין 100 ל-250 ס"מ';
                }
                break;
                
            case 'weight':
                if (!value) {
                    error = 'משקל הוא שדה חובה';
                } else if (isNaN(value) || value < 30 || value > 300) {
                    error = 'משקל חייב להיות בין 30 ל-300 ק"ג';
                }
                break;
                
            case 'birthdate':
                if (!value) {
                    error = 'תאריך לידה הוא שדה חובה';
                } else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
                    error = 'אנא הזן תאריך בפורמט DD/MM/YYYY';
                }
                break;
                
            default:
                break;
        }
        
        return error;
    };

    const checkUsernameAvailability = async (username) => {
        if (!username || username.length < 3) {
            setUsernameAvailable(null);
            return;
        }

        setIsCheckingUsername(true);
        try {
            const response = await fetch('https://wolfit-gym-backend-ijvq.onrender.com/api/check-username', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userName: username })
            });

            const result = await response.json();
            setUsernameAvailable(result.available);
            
            if (!result.available) {
                setErrors(prev => ({
                    ...prev,
                    userName: 'שם משתמש זה כבר תפוס'
                }));
            } else {
                setErrors(prev => ({
                    ...prev,
                    userName: ''
                }));
            }
        } catch (error) {
            console.error('שגיאה בבדיקת שם משתמש:', error);
            setUsernameAvailable(null);
        } finally {
            setIsCheckingUsername(false);
        }
    };

    const updateField = (fieldName, value, setter) => {
        setter(value);
        
        if (!value.trim()) {
            setErrors(prev => ({
                ...prev,
                [fieldName]: ''
            }));
            return;
        }
        
        const error = validateField(fieldName, value);
        console.log(`עדכון שדה ${fieldName}:`, { value, error });
        setErrors(prev => ({
            ...prev,
            [fieldName]: error
        }));

        // בדיקת שם משתמש בזמן אמת
        if (fieldName === 'userName') {
            // בדיקה עם delay כדי לא לבדוק על כל תו
            setTimeout(() => {
                checkUsernameAvailability(value);
            }, 500);
        }
    };

    const isFormValid = () => {
        const allFieldsFilled = userName.trim() && password && email && height && weight && birthdate;
        const noErrors = Object.values(errors).every(error => !error);
        
        console.log('כל השדות מלאים:', allFieldsFilled);
        console.log('אין שגיאות:', noErrors);
        console.log('ערכי השדות:', {
            userName: userName.trim(),
            password: password,
            email: email,
            height: height,
            weight: weight,
            birthdate: birthdate
        });
        console.log('שגיאות:', errors);
        
        return allFieldsFilled && noErrors;
    };

    const handleContinue = () => {
        if (!isFormValid()) {
            return;
        }
        
        console.log('נתונים:', {
            userName,
            password, 
            email,
            height,
            weight,
            birthdate
        });
        
        if (onSignUpComplete) {
          const userData = {
            userName,
            password, 
            email,
            height,
            weight,
            birthdate
            };
            onSignUpComplete(userData);
        }
    };

    return (
        <div className="signup-container">
          <button className="back-button" onClick={onBackToLogin}>
            חזרה
          </button>
          
          <div className="content">
            <h1>הרשמה</h1>
            <p>הזן את פרטי המשתמש שלך</p>
            
            <div className="signup-form">
              <div className="form-group">
                <div className="input-container">
                  <input 
                    type="text" 
                    placeholder="שם משתמש"
                    value={userName}
                    onChange={(e) => updateField('userName', e.target.value, setUserName)}
                    onBlur={(e) => {
                      const error = validateField('userName', e.target.value);
                      setErrors(prev => ({
                        ...prev,
                        userName: error
                      }));
                    }}
                    className={errors.userName ? 'error' : ''}
                  />
                  {isCheckingUsername && (
                    <div className="username-checking">
                      <div className="spinner"></div>
                      בודק...
                    </div>
                  )}
                  {!isCheckingUsername && usernameAvailable === true && userName.length >= 3 && (
                    <div className="username-available">✓ זמין</div>
                  )}
                  {!isCheckingUsername && usernameAvailable === false && (
                    <div className="username-taken">✗ תפוס</div>
                  )}
                </div>
                {errors.userName && <div className="error-message">{errors.userName}</div>}
              </div>
              
              <div className="form-group">
                <input 
                  type="password" 
                  placeholder="סיסמה"
                  value={password}
                  onChange={(e) => updateField('password', e.target.value, setPassword)}
                  onBlur={(e) => {
                    const error = validateField('password', e.target.value);
                    setErrors(prev => ({
                      ...prev,
                      password: error
                    }));
                  }}
                  className={errors.password ? 'error' : ''}
                />
                {errors.password && <div className="error-message">{errors.password}</div>}
              </div>
              
              <div className="form-group">
                <input 
                  type="email" 
                  placeholder="אימייל"
                  value={email}
                  onChange={(e) => updateField('email', e.target.value, setEmail)}
                  onBlur={(e) => {
                    const error = validateField('email', e.target.value);
                    setErrors(prev => ({
                      ...prev,
                      email: error
                    }));
                  }}
                  className={errors.email ? 'error' : ''}
                />
                {errors.email && <div className="error-message">{errors.email}</div>}
              </div>
              
              <div className="form-group">
                <input 
                  type="number" 
                  placeholder="גובה (ס״מ)"
                  value={height}
                  onChange={(e) => updateField('height', e.target.value, setHeight)}
                  onBlur={(e) => {
                    const error = validateField('height', e.target.value);
                    setErrors(prev => ({
                      ...prev,
                      height: error
                    }));
                  }}
                  className={errors.height ? 'error' : ''}
                />
                {errors.height && <div className="error-message">{errors.height}</div>}
              </div>
              
              <div className="form-group">
                <input 
                  type="number" 
                  placeholder="משקל (ק״ג)"
                  value={weight}
                  onChange={(e) => updateField('weight', e.target.value, setWeight)}
                  onBlur={(e) => {
                    const error = validateField('weight', e.target.value);
                    setErrors(prev => ({
                      ...prev,
                      weight: error
                    }));
                  }}
                  className={errors.weight ? 'error' : ''}
                />
                {errors.weight && <div className="error-message">{errors.weight}</div>}
              </div>
              
              <div className="form-group">
                <div className="date-input-container">
                  <input 
                    type="text" 
                    placeholder="תאריך לידה (DD/MM/YYYY)"
                    value={birthdate}
                    onChange={(e) => {
                      let value = e.target.value;
                      value = value.replace(/[^\d/]/g, '');
                      
                      if (value.length === 2 && !value.includes('/')) {
                        value = value + '/';
                      } else if (value.length === 5 && value.split('/').length === 2) {
                        value = value + '/';
                      }
                      
                      // הגבל ל-10 תווים (DD/MM/YYYY)
                      if (value.length <= 10) {
                        updateField('birthdate', value, setBirthdate);
                      }
                    }}
                    onBlur={(e) => {
                      const error = validateField('birthdate', e.target.value);
                      setErrors(prev => ({
                        ...prev,
                        birthdate: error
                      }));
                    }}
                    maxLength="10"
                    className={errors.birthdate ? 'error' : ''}
                  />
                  <button 
                    type="button" 
                    className="date-picker-toggle"
                    onClick={() => setShowDatePicker(!showDatePicker)}
                  >
                    📅
                  </button>
                </div>
                {errors.birthdate && <div className="error-message">{errors.birthdate}</div>}
                
                {showDatePicker && (
                  <div className="date-picker-dropdown">
                    <div className="date-selectors">
                      <select 
                        value={selectedDay} 
                        onChange={(e) => {
                          setSelectedDay(e.target.value);
                          if (selectedMonth && selectedYear) {
                            const monthIndex = months.indexOf(selectedMonth) + 1;
                            const newDate = `${e.target.value}/${monthIndex.toString().padStart(2, '0')}/${selectedYear}`;
                            updateField('birthdate', newDate, setBirthdate);
                          }
                        }}
                      >
                        <option value="">יום</option>
                        {days.map(day => (
                          <option key={day} value={day.toString().padStart(2, '0')}>{day}</option>
                        ))}
                      </select>
                      
                      <select 
                        value={selectedMonth} 
                        onChange={(e) => {
                          setSelectedMonth(e.target.value);
                          if (selectedDay && selectedYear) {
                            const monthIndex = months.indexOf(e.target.value) + 1;
                            const newDate = `${selectedDay}/${monthIndex.toString().padStart(2, '0')}/${selectedYear}`;
                            updateField('birthdate', newDate, setBirthdate);
                          }
                        }}
                      >
                        <option value="">חודש</option>
                        {months.map((month, index) => (
                          <option key={month} value={month}>{month}</option>
                        ))}
                      </select>
                      
                      <select 
                        value={selectedYear} 
                        onChange={(e) => {
                          setSelectedYear(e.target.value);
                          if (selectedDay && selectedMonth) {
                            const monthIndex = months.indexOf(selectedMonth) + 1;
                            const newDate = `${selectedDay}/${monthIndex.toString().padStart(2, '0')}/${e.target.value}`;
                            updateField('birthdate', newDate, setBirthdate);
                          }
                        }}
                      >
                        <option value="">שנה</option>
                        {years.map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
              
              {(() => {
                const isValid = isFormValid();
                console.log('מצב הכפתור:', isValid);
                return isValid ? (
                  <button 
                    className="signup-button"
                    onClick={handleContinue}
                  >
                    המשך
                  </button>
                ) : (
                  <div className="form-statu">
                    
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
  );
}

export default SignUpScreen;