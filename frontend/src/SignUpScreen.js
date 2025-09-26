import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './SignUpScreen.css';

function SignUpScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const googleData = location.state?.googleData;
    const [userName, setUserName] = useState(googleData?.name || '');
    const [email, setEmail] = useState(googleData?.email || '');
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const [birthdate, setBirthdate] = useState('');
    const [day, setDay] = useState('');
    const [month, setMonth] = useState('');
    const [year, setYear] = useState('');
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    // יצירת תאריך מהחלקים
    const createDateFromParts = (dayVal, monthVal, yearVal) => {
        if (dayVal && monthVal && yearVal) {
            return `${dayVal.padStart(2, '0')}/${monthVal.padStart(2, '0')}/${yearVal}`;
        }
        return '';
    };

    // עדכון תאריך כאשר משתנה חלק
    const updateBirthdate = (dayVal, monthVal, yearVal) => {
        const newDate = createDateFromParts(dayVal, monthVal, yearVal);
        setBirthdate(newDate);
        if (newDate) {
            updateField('birthdate', newDate, setBirthdate);
        } else {
            updateField('birthdate', '', setBirthdate);
        }
    };

    // יצירת אפשרויות לימים
    const getDaysOptions = () => {
        const days = [];
        const maxDays = month ? new Date(year || 2024, month, 0).getDate() : 31;
        for (let i = 1; i <= maxDays; i++) {
            days.push(i);
        }
        return days;
    };

    // יצירת אפשרויות לחודשים
    const getMonthsOptions = () => {
        const months = [
            { value: 1, name: 'ינואר' },
            { value: 2, name: 'פברואר' },
            { value: 3, name: 'מרץ' },
            { value: 4, name: 'אפריל' },
            { value: 5, name: 'מאי' },
            { value: 6, name: 'יוני' },
            { value: 7, name: 'יולי' },
            { value: 8, name: 'אוגוסט' },
            { value: 9, name: 'ספטמבר' },
            { value: 10, name: 'אוקטובר' },
            { value: 11, name: 'נובמבר' },
            { value: 12, name: 'דצמבר' }
        ];
        return months;
    };

    // יצירת אפשרויות לשנים
    const getYearsOptions = () => {
        const years = [];
        const currentYear = new Date().getFullYear();
        for (let i = currentYear - 100; i <= currentYear - 13; i++) {
            years.push(i);
        }
        return years.reverse();
    };

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
          document.body.style.overflow = 'unset';
        };
    }, []);

    // לוגים לבדיקה
    useEffect(() => {
        console.log('🔍 SignUpScreen - נתוני Google:', googleData);
        console.log('🔍 SignUpScreen - שם משתמש:', userName);
        console.log('🔍 SignUpScreen - אימייל:', email);
    }, [googleData, userName, email]);

    const validateField = (fieldName, value) => {
        let error = '';
        
        switch (fieldName) {
            case 'userName':
                if (value && value.trim().length < 3) {
                    error = 'שם משתמש חייב להכיל לפחות 3 תווים';
                }
                break;
                
            case 'email':
                if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    error = 'אימייל לא תקין';
                }
                break;
                
            case 'height':
                if (value && (isNaN(value) || value < 100 || value > 250)) {
                    error = 'גובה חייב להיות בין 100 ל-250 ס"מ';
                }
                break;
                
            case 'weight':
                if (value && (isNaN(value) || value < 30 || value > 300)) {
                    error = 'משקל חייב להיות בין 30 ל-300 ק"ג';
                }
                break;
                
            case 'birthdate':
                if (value && !/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
                    error = 'אנא הזן תאריך בפורמט DD/MM/YYYY';
                }
                break;
                
            default:
                break;
        }
        
        return error;
    };

    const updateField = (fieldName, value, setter) => {
        setter(value);
        
        // ניקוי שגיאה אם השדה ריק
        if (!value.trim()) {
            setErrors(prev => ({
                ...prev,
                [fieldName]: ''
            }));
        }
    };

    const validateFieldOnBlur = (fieldName, value) => {
        // סמן שהשדה נגעו בו
        setTouched(prev => ({
            ...prev,
            [fieldName]: true
        }));
        
        if (!value.trim()) {
            setErrors(prev => ({
                ...prev,
                [fieldName]: ''
            }));
            return;
        }
        
        const error = validateField(fieldName, value);
        setErrors(prev => ({
            ...prev,
            [fieldName]: error
        }));
    };

    // בדיקה אם יש שגיאות בטופס
    const hasErrors = () => {
        // בדיקת שדות חובה
        if (!userName.trim() || !email.trim()) {
            return true;
        }
        
        // בדיקת שגיאות וולידציה
        return Object.values(errors).some(error => error !== '');
    };


    const handleContinue = () => {
        // בדיקת שדות חובה
        if (!userName.trim()) {
            setErrors({ userName: 'שם משתמש נדרש' });
            return;
        }
        if (!email.trim()) {
            setErrors({ email: 'אימייל נדרש' });
            return;
        }
        
        // בדיקת שדות אופציונליים אם הם מלאים
        const newErrors = {};
        
        if (height.trim()) {
            const heightError = validateField('height', height);
            if (heightError) newErrors.height = heightError;
        }
        
        if (weight.trim()) {
            const weightError = validateField('weight', weight);
            if (weightError) newErrors.weight = weightError;
        }
        
        if (birthdate.trim()) {
            const birthdateError = validateField('birthdate', birthdate);
            if (birthdateError) newErrors.birthdate = birthdateError;
        }
        
        // אם יש שגיאות, הצג אותן ועצור
        if (Object.keys(newErrors).length > 0) {
            setErrors(prev => ({ ...prev, ...newErrors }));
            return;
        }
        
        console.log('נתונים:', {
            userName,
            email,
            height,
            weight,
            birthdate
        });
        
        const userData = {
          userName,
          email,
          height,
          weight,
          birthdate
        };
        navigate('/signup-preferences', { state: { userData, googleData } });
    };

    return (
        <div className="signup-container">
          <button className="back-button" onClick={() => navigate('/login')}>
            חזרה
          </button>
          
          <div className="content">
            <h1>השלמת הרשמה</h1>
            {googleData ? (
              <div>
                <p style={{ color: '#8b5cf6', fontWeight: 'bold', marginBottom: '10px' }}>
                  🎉 ברוך הבא! התחברת עם Google
                </p>
                <p>נתוני Google שלך נטענו אוטומטית. אנא השלם את הפרטים הבאים:</p>
              </div>
            ) : (
              <p>כמעט סיימנו! רק כמה פרטים נוספים (אופציונליים)</p>
            )}
            
            <div className="signup-form">
              <div className="form-group">
                <input 
                  type="text" 
                  placeholder="שם משתמש"
                  value={userName}
                  onChange={(e) => updateField('userName', e.target.value, setUserName)}
                  onBlur={(e) => validateFieldOnBlur('userName', e.target.value)}
                  className={errors.userName ? 'error' : ''}
                  required
                />
                {errors.userName && <span className="error-message">{errors.userName}</span>}
              </div>
              
              <div className="form-group">
                <input 
                  type="email" 
                  placeholder="אימייל"
                  value={email}
                  onChange={(e) => updateField('email', e.target.value, setEmail)}
                  onBlur={(e) => validateFieldOnBlur('email', e.target.value)}
                  className={errors.email ? 'error' : ''}
                  required
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>
              
              <div className="form-group">
                <input 
                  type="number" 
                  placeholder="גובה (ס״מ) - אופציונלי"
                  value={height}
                  onChange={(e) => updateField('height', e.target.value, setHeight)}
                  onBlur={(e) => validateFieldOnBlur('height', e.target.value)}
                  className={errors.height ? 'error' : ''}
                />
                {errors.height && <span className="error-message">{errors.height}</span>}
              </div>
              
              <div className="form-group">
                <input 
                  type="number" 
                  placeholder="משקל (ק״ג) - אופציונלי"
                  value={weight}
                  onChange={(e) => updateField('weight', e.target.value, setWeight)}
                  onBlur={(e) => validateFieldOnBlur('weight', e.target.value)}
                  className={errors.weight ? 'error' : ''}
                />
                {errors.weight && <span className="error-message">{errors.weight}</span>}
              </div>
              
              <div className="form-group">
                <label className="date-label">תאריך לידה - אופציונלי</label>
                <div className="date-picker-container">
                  <select 
                    value={day}
                    onChange={(e) => {
                      const newDay = e.target.value;
                      setDay(newDay);
                      updateBirthdate(newDay, month, year);
                    }}
                    onBlur={() => validateFieldOnBlur('birthdate', birthdate)}
                    className={`date-select ${errors.birthdate ? 'error' : ''}`}
                  >
                    <option value="">יום</option>
                    {getDaysOptions().map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  
                  <select 
                    value={month}
                    onChange={(e) => {
                      const newMonth = e.target.value;
                      setMonth(newMonth);
                      // איפוס יום אם הוא לא קיים בחודש החדש
                      const maxDays = newMonth ? new Date(year || 2024, newMonth, 0).getDate() : 31;
                      const newDay = day && day <= maxDays ? day : '';
                      setDay(newDay);
                      updateBirthdate(newDay, newMonth, year);
                    }}
                    onBlur={() => validateFieldOnBlur('birthdate', birthdate)}
                    className={`date-select ${errors.birthdate ? 'error' : ''}`}
                  >
                    <option value="">חודש</option>
                    {getMonthsOptions().map(m => (
                      <option key={m.value} value={m.value}>{m.name}</option>
                    ))}
                  </select>
                  
                  <select 
                    value={year}
                    onChange={(e) => {
                      const newYear = e.target.value;
                      setYear(newYear);
                      // איפוס יום אם הוא לא קיים בשנה החדשה
                      const maxDays = month ? new Date(newYear || 2024, month, 0).getDate() : 31;
                      const newDay = day && day <= maxDays ? day : '';
                      setDay(newDay);
                      updateBirthdate(newDay, month, newYear);
                    }}
                    onBlur={() => validateFieldOnBlur('birthdate', birthdate)}
                    className={`date-select ${errors.birthdate ? 'error' : ''}`}
                  >
                    <option value="">שנה</option>
                    {getYearsOptions().map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                {errors.birthdate && <span className="error-message">{errors.birthdate}</span>}
              </div>
              
              <button 
                className="continue-button"
                onClick={handleContinue}
                disabled={hasErrors()}
              >
                המשך
              </button>
            </div>
          </div>
        </div>
    );
}

export default SignUpScreen;