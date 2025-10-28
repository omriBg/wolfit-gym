
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { API_BASE_URL, WORKOUT_CONFIG } from './config';
import './CreateWorkout.css';
import WolfAssistant from './components/WolfAssistant';

// מיפוי ספורטים (תואם לשרת שלך)
const SPORT_MAPPING = {
  1: 'כדורגל',
  2: 'כדורסל',  
  3: 'טיפוס',
  4: 'חדר כושר',
  5: 'קורדינציה',
  6: 'טניס',
  7: 'פינגפונג',
  8: 'אגרוף',
  9: 'אופניים'
};


// הרכיב הראשי עם השלמות מלאות
function CreateWorkout({ selectedDate, startTime, endTime }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [userPreferences, setUserPreferences] = useState([]);
  // fieldsByTime כבר לא נחוץ - השרת מטפל בזה
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasAttemptedGeneration, setHasAttemptedGeneration] = useState(false);
  const [showWolfAssistant, setShowWolfAssistant] = useState(false);
  const [selectedIntensity, setSelectedIntensity] = useState(2); // ברירת מחדל: בינוני

  useEffect(() => {
    console.log(' CreateWorkout נטען עם פרמטרים:', {
      user: user?.userName,
      selectedDate,
      startTime,
      endTime
    });
    
    initializeWorkoutData();
  }, []);

  // יצירת אימון אוטומטית אחרי שהנתונים נטענו
  useEffect(() => {
    if (!loading && timeSlots.length > 0 && !workoutPlan && !isGenerating && !hasAttemptedGeneration) {
      console.log('🚀 יוצר אימון אוטומטית...');
      setHasAttemptedGeneration(true);
      generateWorkout();
    }
  }, [loading, timeSlots.length]); // הסרת workoutPlan ו-isGenerating מהתלויות

  const initializeWorkoutData = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('📊 טוען נתוני משתמש...');
      await loadUserPreferences();
      
      console.log('⏰ יוצר לבנות אימון...');
      const slots = createTimeSlots();
      setTimeSlots(slots);
      
      console.log('✅ כל הנתונים נטענו בהצלחה');
      
    } catch (err) {
      console.error('❌ שגיאה בטעינת נתונים:', err);
      setError('שגיאה בטעינת נתונים. אנא נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  const loadUserPreferences = async () => {
    try {
      if (!user || !user.id) {
        throw new Error('משתמש לא מוגדר');
      }
      
      const url = `${API_BASE_URL}/api/user-preferences/${user.id}`;
      console.log('📡 קורא העדפות מ:', url);
      
      const token = localStorage.getItem('authToken');
      console.log('🔑 טוקן לאימות:', token ? 'קיים' : 'חסר');
      console.log('🔑 טוקן מלא:', token);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📡 תגובת השרת להעדפות:', response.status, response.statusText);
      const data = await response.json();
      
      if (data.success && data.data && data.data.sports) {
        // מיצוי רק הספורטים שנבחרו ומיוןר לפי הדירוג שלהםכ
        const selectedSports = data.data.sports
          .filter(sport => sport.selected)
          .sort((a, b) => a.rank - b.rank)
          .map(sport => sport.id);
        
        setUserPreferences(selectedSports);
        console.log('❤️ העדפות נטענו:', selectedSports.map(id => SPORT_MAPPING[id]).join(', '));
      } else {
        console.log('⚠️ איין העדפות שמורות');
        setUserPreferences([]);
      }
    } catch (error) {
      console.error('❌ שגיאה בטעינת העדפות:', error);
      setUserPreferences([]);
      throw error;
    }
  };

  const createTimeSlots = () => {
    const slots = [];
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    
    console.log(`⏰ יוצר לבנות אימון מ-${startTime} עד ${endTime}`);
    
    for (let minutes = startTotalMinutes; minutes < endTotalMinutes; minutes += WORKOUT_CONFIG.SLOT_DURATION) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      slots.push(timeStr);
    }
    
    console.log(`📅 נוצרו ${slots.length} לבנות אימון:`, slots.join(', '));
    return slots;
  };

  // loadAvailableFields הוסרה - השרת מטפל בזה כעת

  const generateOptimalWorkout = async () => {
    console.log('מתחיל יצירת תוכנית אימון אופטימלית...');
    
    // בדיקה אם כבר בתהליך יצירה - מונע לחיצות מרובות
    if (isGenerating) {
      console.log('⚠️ יצירת אימון כבר בתהליך - מונע לחיצה נוספת');
      return null;
    }
    
    if (timeSlots.length === 0) {
      console.log('❌ אין זמנים זמינים ליצירת אימון');
      return null;
    }

    try {
      console.log('📡 שולח בקשה לשרת ליצירת אימון אופטימלי...');
      
      const requestBody = {
        userId: user.id,
        date: selectedDate,
        timeSlots: timeSlots,
        userPreferences: userPreferences
      };
      
      console.log('📋 נתוני בקשה:', requestBody);
      
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/generate-optimal-workout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ תוכנית אימון אופטימלית נוצרה בשרת:', data.workoutPlan);
        return data.workoutPlan;
      } else {
        throw new Error(data.message || 'שגיאה ביצירת האימון');
      }
      
    } catch (error) {
      console.error('❌ שגיאה ביצירת תוכנית אופטימלית:', error);
      throw error;
    }
  };

  const generateWorkout = async () => {
    if (timeSlots.length === 0) {
      setError('לא נטענו נתונים. אנא רענן את הדף.');
      return;
    }
    
    setIsGenerating(true);
    setError('');
    
    try {
      console.log('🚀 מתחיל ליצור תוכנית אימון אופטימלית בשרת...');
      
      const optimalWorkout = await generateOptimalWorkout();
      
      if (optimalWorkout && optimalWorkout.successfulSlots > 0) {
        setWorkoutPlan(optimalWorkout);
        console.log('✅ תוכנית אימון אופטימלית נוצרה בהצלחה');
      } else {
        setError('לא הצליח ליצור תוכנית אימון מתאימה. נסה שעות או תאריך אחרים.');
      }
      
    } catch (error) {
      console.error('❌ שגיאה ביצירת אימון:', error);
      
      // בדיקה אם זו שגיאת אימות - לא ננסה שוב
      if (error.message.includes('401') || error.message.includes('403') || error.message.includes('Unauthorized')) {
        setError('שגיאת אימות. אנא התחבר מחדש.');
        setHasAttemptedGeneration(true); // מונע ניסיונות חוזרים
      } else if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
        setError('יותר מדי בקשות. אנא המתן רגע ונסה שוב.');
        setHasAttemptedGeneration(true); // מונע ניסיונות חוזרים
      } else {
        setError(`שגיאה ביצירת האימון: ${error.message}`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const saveWorkoutToDatabase = async () => {
    if (!workoutPlan || !user || !user.id) {
      setError('אין תוכנית אימון או משתמש לא מוגדר');
      return;
    }

    // בדיקה אם כבר בתהליך שמירה - מונע לחיצות מרובות
    if (isSaving) {
      console.log('⚠️ שמירה כבר בתהליך - מונע לחיצה נוספת');
      return;
    }

    setIsSaving(true);
    setError('');
    setSaveSuccess(false);
    console.log('🔒 נעילת כפתור שמירה - מונע לחיצות מרובות');

    try {
      // הכנת רשימת הזמנות למגרשים
      const bookings = workoutPlan.slots
        .filter(slot => slot.field !== null)
        .map(slot => ({
          idfield: slot.field.id,
          bookingdate: selectedDate,
          starttime: slot.time,
          iduser: user.id  // חשוב: iduser באותיות קטנות
        }));

      if (bookings.length === 0) {
        setError('אין מגרשים לשמירה');
        setIsSaving(false);
        return;
      }

      // חישוב כמות לבנות אימון
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;
      const requiredQuarters = Math.ceil((endMinutes - startMinutes) / WORKOUT_CONFIG.SLOT_DURATION);

      const requestBody = {
        bookings: bookings,
        userId: user.id,
        date: selectedDate,
        quarters: requiredQuarters // מספר לבנות אימון שצריך להוריד
      };

      console.log('💾 שומר אימון:', requestBody);

      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/save-workout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setSaveSuccess(true);
        console.log('✅ אימון נשמר בהצלחה');
        
        // הודעה של הצלחה ואז חזרה לתפריט הראשי
        setTimeout(() => {
          navigate('/main-menu');
        }, 3000); // 3 שניות כדי שהמשתמש יראה את הודעת ההצלחה
      } else {
        // בדיקה אם צריך ליצור אימון חדש
        if (data.requiresNewWorkout) {
          console.log('🔄 צריך ליצור אימון חדש, מעביר לתפריט הראשי');
          setError(`שגיאה בשמירת האימון: ${data.message}`);
          
          // מעביר לתפריט הראשי אחרי 3 שניות
          setTimeout(() => {
            navigate('/main-menu');
          }, 3000);
        } else {
          setError(`שגיאה בשמירת האימון: ${data.message}`);
        }
      }

    } catch (error) {
      console.error('❌ שגיאה בשמירת האימון:', error);
      setError(`שגיאה בשמירת האימון: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const canCreateWorkout = () => {
    return !loading && timeSlots.length > 0;
  };

  const handleWolfRecommendation = (intensity) => {
    // המרת המלצת העוזר לרמת עצימות מספרית
    let intensityLevel;
    switch(intensity) {
      case 'low':
        intensityLevel = 1;
        break;
      case 'medium':
        intensityLevel = 2;
        break;
      case 'high':
        intensityLevel = 3;
        break;
      default:
        intensityLevel = 2;
    }
    
    setSelectedIntensity(intensityLevel);
    setShowWolfAssistant(false);
    console.log('וולף המליץ על רמת עצימות:', intensityLevel);
  };

  const getIntensityLabel = (level) => {
    const labels = {
      1: 'קל',
      2: 'בינוני', 
      3: 'קשה'
    };
    return labels[level] || 'בינוני';
  };

  const getIntensityColor = (level) => {
    const colors = {
      1: '#4CAF50',
      2: '#FF9800',
      3: '#F44336'
    };
    return colors[level] || '#FF9800';
  };

  if (loading) {
    return (
      <div className="create-workout-container">
        <button className="back-button" onClick={() => navigate('/main-menu')}>חזרה</button>
        <div className="content">
          <div className="loading-screen">
            <div className="loading-spinner">
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
            </div>
            <h1>טוען נתונים...</h1>
            <p>אנא המתן בזמן שאנו טוענים את המידע הדרוש ליצירת האימון</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="create-workout-container">
      <button className="back-button" onClick={() => navigate('/main-menu')}>
        חזרה
      </button>
      
      <div className="content">
        {/* בחירת רמת עצימות */}
        <div className="intensity-selection-section">
          <h3>רמת עצימות מועדפת:</h3>
          <div className="intensity-selector-container">
            <div className="intensity-selector">
              {[1, 2, 3].map((level) => (
                <button
                  key={level}
                  className={`intensity-btn ${selectedIntensity === level ? 'active' : ''}`}
                  onClick={() => setSelectedIntensity(level)}
                  style={{
                    backgroundColor: selectedIntensity === level ? getIntensityColor(level) : 'rgba(255, 255, 255, 0.1)',
                    borderColor: getIntensityColor(level)
                  }}
                >
                  <span className="intensity-number">{level}</span>
                  <span className="intensity-label">{getIntensityLabel(level)}</span>
                </button>
              ))}
            </div>
                <button 
                  className="wolf-assistant-button"
                  onClick={() => setShowWolfAssistant(true)}
                  title="עוזר אישי - וולף"
                >
                  עזרה בבחירה
                </button>
          </div>
        </div>
        
        {error && (
          <div style={{ 
            color: '#000', 
            textAlign: 'center', 
            margin: '20px 0',
            padding: '15px',
            background: '#f5f5f5',
            borderRadius: '8px',
            border: '1px solid #ccc'
          }}>
            {error}
            {!error.includes('אימות') && !error.includes('יותר מדי בקשות') && (
              <div style={{ marginTop: '10px' }}>
                <button
                  onClick={() => {
                    setHasAttemptedGeneration(false);
                    setError('');
                    generateWorkout();
                  }}
                  disabled={isGenerating}
                  style={{
                    background: isGenerating ? '#ccc' : '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '5px',
                    cursor: isGenerating ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isGenerating ? 'מנסה שוב...' : 'נסה שוב'}
                </button>
              </div>
            )}
          </div>
        )}

        {isGenerating && (
          <div className="generating-workout">
            <div className="generating-spinner">
              <div className="spinner-dot"></div>
              <div className="spinner-dot"></div>
              <div className="spinner-dot"></div>
            </div>
            <h2>יוצר אימון</h2>
            <p>אנא המתן בזמן שאנו יוצרים את האימון המושלם עבורך</p>
          </div>
        )}

        {workoutPlan && (
          <div className="workout-result" style={{ marginTop: '30px' }}>
            <h2>האימון שלך</h2>
            
            <div className="workout-timeline">
              <h3>לוח זמנים:</h3>
              {workoutPlan.slots.map((slot, index) => (
                                 <div key={index} className="time-slot" style={{
                   display: 'flex',
                   alignItems: 'center',
                   padding: '15px',
                   margin: '10px 0',
                   border: slot.field ? '2px solid #8b5cf6' : '2px solid #ff6b6b',
                   borderRadius: '8px',
                   background: slot.field ? 'rgba(139, 92, 246, 0.05)' : 'rgba(255, 107, 107, 0.05)'
                 }}>
                  <div className="time" style={{
                    minWidth: '80px',
                    fontWeight: 'bold',
                    fontSize: '16px'
                  }}>
                    {slot.time}
                  </div>
                  <div className="field-info" style={{ flex: 1, marginRight: '15px' }}>
                    {slot.field ? (
                      <>
                                                 <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#8b5cf6' }}>
                           {slot.field.name}
                         </div>
                         <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                           ספורט: {slot.sportType}
                         </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#000' }}>
                          לא זמין
                        </div>
                        <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                          לא נמצא מגרש מתאים
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {saveSuccess ? (
              <>
                {/* רקע שחור לגמרי */}
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'rgba(0, 0, 0, 0.9)',
                  zIndex: 999
                }}></div>
                
                {/* תיבת ההודעה */}
                <div style={{ 
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: '#fff',
                  color: '#000',
                  padding: '30px 40px',
                  borderRadius: '12px',
                  border: '2px solid #8b5cf6',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
                  zIndex: 1000,
                  textAlign: 'center',
                  animation: 'popup 0.3s ease-out',
                  maxWidth: '400px'
                }}>
                  <h3 style={{ margin: '0 0 15px 0', fontSize: '20px' }}>האימון נשמר בהצלחה!</h3>
                  <p style={{ margin: '8px 0', fontSize: '16px' }}>האימון שלך הוזמן בהצלחה</p>
                  <p style={{ margin: '8px 0', fontSize: '16px' }}>תאריך: {selectedDate}</p>
                  <p style={{ margin: '8px 0', fontSize: '16px' }}>זמן: {startTime} - {endTime}</p>
                  <p style={{ margin: '15px 0 0 0', fontSize: '14px', color: '#666' }}>מעביר אותך לתפריט הראשי בעוד רגעים...</p>
                </div>
              </>
            ) : (
              <div className="action-buttons" style={{ marginTop: '30px', textAlign: 'center' }}>
                <button
                  className="save-button"
                  onClick={saveWorkoutToDatabase}
                  disabled={isSaving}
                                     style={{ 
                     background: isSaving ? '#ccc' : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                     color: 'white',
                     border: 'none',
                     padding: '15px 40px',
                     borderRadius: '8px',
                     fontSize: '16px',
                     fontWeight: 'bold',
                     cursor: isSaving ? 'not-allowed' : 'pointer',
                     transition: 'all 0.3s ease'
                   }}
                >
                  {isSaving ? 'שומר אימון...' : 'אישור ושמירת האימון'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* עוזר אישי וולף */}
      <WolfAssistant
        isOpen={showWolfAssistant}
        onClose={() => setShowWolfAssistant(false)}
        onRecommendation={handleWolfRecommendation}
      />
    </div>
  );
}

export default CreateWorkout;