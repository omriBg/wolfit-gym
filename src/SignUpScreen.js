import React, { useState, useEffect } from 'react';
import './SignUpScreen.css';

function SignUpScreen({ onBackToLogin, onSignUpComplete }) {
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const [birthdate, setBirthdate] = useState('');
    const [errors, setErrors] = useState({});


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
                <input 
                  type="date" 
                  placeholder="תאריך לידה - אופציונלי"
                  value={birthdate}
                  onChange={(e) => {
                    const dateValue = e.target.value;
                    if (dateValue) {
                      // המרת מ-YYYY-MM-DD ל-DD/MM/YYYY
                      const [year, month, day] = dateValue.split('-');
                      const formattedDate = `${day}/${month}/${year}`;
                      setBirthdate(formattedDate);
                      updateField('birthdate', formattedDate, setBirthdate);
                    } else {
                      setBirthdate('');
                      updateField('birthdate', '', setBirthdate);
                    }
                  }}
                  className={errors.birthdate ? 'error' : ''}
                />
                {errors.birthdate && <span className="error-message">{errors.birthdate}</span>}
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