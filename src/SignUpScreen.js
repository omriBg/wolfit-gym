import React, { useState, useEffect } from 'react';
import './SignUpScreen.css';

function SignUpScreen({ onBackToLogin, onSignUpComplete }) {
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const [birthdate, setBirthdate] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedDay, setSelectedDay] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [errors, setErrors] = useState({});

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

    const handleDateSelect = (day, month, year) => {
        setSelectedDay(day);
        setSelectedMonth(month);
        setSelectedYear(year);
        
        const monthIndex = months.indexOf(month) + 1;
        const formattedDate = `${day.toString().padStart(2, '0')}/${monthIndex.toString().padStart(2, '0')}/${year}`;
        setBirthdate(formattedDate);
        setShowDatePicker(false);
        
        const error = validateField('birthdate', formattedDate);
        setErrors(prev => ({
            ...prev,
            birthdate: error
        }));
    };

    const handleContinue = () => {
        console.log('נתונים:', {
            height,
            weight,
            birthdate
        });
        
        if (onSignUpComplete) {
          const userData = {
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
            <h1>השלמת הרשמה</h1>
            <p>כמעט סיימנו! רק כמה פרטים נוספים (אופציונליים)</p>
            
            <div className="signup-form">
              <div className="form-group">
                <input 
                  type="number" 
                  placeholder="גובה (ס״מ) - אופציונלי"
                  value={height}
                  onChange={(e) => updateField('height', e.target.value, setHeight)}
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
                  className={errors.weight ? 'error' : ''}
                />
                {errors.weight && <span className="error-message">{errors.weight}</span>}
              </div>
              
              <div className="form-group">
                <div className="date-input-container">
                  <input 
                    type="text" 
                    placeholder="תאריך לידה (DD/MM/YYYY) - אופציונלי"
                    value={birthdate}
                    onChange={(e) => updateField('birthdate', e.target.value, setBirthdate)}
                    className={errors.birthdate ? 'error' : ''}
                    readOnly
                  />
                  <button 
                    type="button" 
                    className="date-picker-button"
                    onClick={() => setShowDatePicker(!showDatePicker)}
                  >
                    📅
                  </button>
                </div>
                {errors.birthdate && <span className="error-message">{errors.birthdate}</span>}
                
                {showDatePicker && (
                  <div className="date-picker">
                    <div className="date-picker-header">
                      <h3>בחר תאריך לידה</h3>
                      <button 
                        className="close-button"
                        onClick={() => setShowDatePicker(false)}
                      >
                        ✕
                      </button>
                    </div>
                    
                    <div className="date-picker-content">
                      <div className="date-section">
                        <h4>יום</h4>
                        <div className="date-options">
                          {days.map(day => (
                            <button
                              key={day}
                              className={`date-option ${selectedDay === day ? 'selected' : ''}`}
                              onClick={() => handleDateSelect(day, selectedMonth, selectedYear)}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="date-section">
                        <h4>חודש</h4>
                        <div className="date-options">
                          {months.map(month => (
                            <button
                              key={month}
                              className={`date-option ${selectedMonth === month ? 'selected' : ''}`}
                              onClick={() => handleDateSelect(selectedDay, month, selectedYear)}
                            >
                              {month}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="date-section">
                        <h4>שנה</h4>
                        <div className="date-options year-options">
                          {years.map(year => (
                            <button
                              key={year}
                              className={`date-option ${selectedYear === year ? 'selected' : ''}`}
                              onClick={() => handleDateSelect(selectedDay, selectedMonth, year)}
                            >
                              {year}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <button 
                className="continue-button"
                onClick={handleContinue}
              >
                המשך
              </button>
            </div>
          </div>
        </div>
    );
}

export default SignUpScreen;