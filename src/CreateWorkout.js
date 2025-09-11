
import React, { useState, useEffect } from 'react';

import './CreateWorkout.css';

// מיפוי ספורטים (תואם לשרת שלך)
const SPORT_MAPPING = {
  1: 'כדורגל',
  2: 'כדורסל',  
  3: 'טיפוס',
  4: 'חדר כושר',
  5: 'קורדינציה',
  6: 'טניס',
  7: 'פינגפונג',
  8: 'ריקוד',
  9: 'אופניים'
};

// האלגוריתם ההונגרי הועבר לשרת - הקוד בצד הלקוח רק שולח בקשות

// הרכיב הראשי עם השלמות מלאות
function CreateWorkout({ user, selectedDate, startTime, endTime, onBackClick }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [userPreferences, setUserPreferences] = useState([]);
  // fieldsByTime כבר לא נחוץ - השרת מטפל בזה
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    console.log('🎬 CreateWorkout נטען עם פרמטרים:', {
      user: user?.userName,
      selectedDate,
      startTime,
      endTime
    });
    
    initializeWorkoutData();
  }, []);

  const initializeWorkoutData = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('📊 טוען נתוני משתמש...');
      await loadUserPreferences();
      
      console.log('⏰ יוצר רבעי שעה...');
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
      
      const url = `https://wolfit-gym-backend-ijvq.onrender.com/api/user-preferences/${user.id}`;
      console.log('📡 קורא העדפות מ:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        const preferences = data.data.selectedSports || [];
        setUserPreferences(preferences);
        console.log('❤️ העדפות נטענו:', preferences.map(id => SPORT_MAPPING[id]).join(', '));
      } else {
        console.log('⚠️ אין העדפות שמורות');
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
    
    console.log(`⏰ יוצר רבעי שעה מ-${startTime} עד ${endTime}`);
    
    for (let minutes = startTotalMinutes; minutes < endTotalMinutes; minutes += 15) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      slots.push(timeStr);
    }
    
    console.log(`📅 נוצרו ${slots.length} רבעי שעה:`, slots.join(', '));
    return slots;
  };

  // loadAvailableFields הוסרה - השרת מטפל בזה כעת

  const generateOptimalWorkout = async () => {
    console.log('🎯 מתחיל יצירת תוכנית אימון אופטימלית...');
    
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
      
      const response = await fetch('https://wolfit-gym-backend-ijvq.onrender.com/api/generate-optimal-workout', {
        method: 'POST',
        headers: {
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
      setError(`שגיאה ביצירת האימון: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveWorkoutToDatabase = async () => {
    if (!workoutPlan || !user || !user.id) {
      setError('אין תוכנית אימון או משתמש לא מוגדר');
      return;
    }

    setIsSaving(true);
    setError('');
    setSaveSuccess(false);

    try {
      // הכנת רשימת הזמנות למגרשים
      const bookings = workoutPlan.slots
        .filter(slot => slot.field !== null)
        .map(slot => ({
          idField: slot.field.id,
          bookingDate: selectedDate,
          startTime: slot.time,
          idUser: user.id
        }));

      if (bookings.length === 0) {
        setError('אין מגרשים לשמירה');
        setIsSaving(false);
        return;
      }

      const requestBody = {
        bookings: bookings,
        userId: user.id,
        date: selectedDate
      };

      console.log('💾 שומר אימון:', requestBody);

      const response = await fetch('https://wolfit-gym-backend-ijvq.onrender.com/api/save-workout', {
        method: 'POST',
        headers: {
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
        
        setTimeout(() => {
          if (onBackClick) {
            onBackClick();
          }
        }, 2000);
      } else {
        setError(`שגיאה בשמירת האימון: ${data.message}`);
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

  if (loading) {
    return (
      <div className="create-workout-container">
        <button className="back-button" onClick={onBackClick}>חזרה</button>
        <div className="content">
          <h1>🔄 טוען נתונים...</h1>
          <p>אנא המתן בזמן שאנו טוענים את המידע הדרוש ליצירת האימון האופטימלי</p>
          <div style={{ 
            margin: '20px 0', 
            padding: '15px', 
            background: 'rgba(81, 207, 102, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(81, 207, 102, 0.3)'
          }}>
            המערכת טוענה את העדפותיך, בודקת זמינות מגרשים ומכינה אלגוריתם אופטימלי...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="create-workout-container">
      <button className="back-button" onClick={onBackClick}>
        חזרה
      </button>
      
      <div className="content">
        <h1>🎯 יוצר אימון אופטימלי מלא (Hungarian Algorithm)</h1>
        
        <div className="workout-info">
          <div className="info-card">
            <h3>🗓️ פרטי האימון</h3>
            <p><strong>תאריך:</strong> {selectedDate}</p>
            <p><strong>שעה:</strong> {startTime} - {endTime}</p>
            <p><strong>משתמש:</strong> {user.userName}</p>
            <p><strong>רבעי שעה:</strong> {timeSlots.length}</p>
          </div>
          
          <div className="info-card">
            <h3>❤️ העדפות המשתמש</h3>
            {userPreferences.length > 0 ? (
              <div>
                <p><strong>ספורטים מועדפים (לפי סדר):</strong></p>
                <ol style={{ margin: '10px 0', paddingRight: '20px' }}>
                  {userPreferences.map((sportId) => (
                    <li key={sportId} style={{ margin: '5px 0' }}>
                      {SPORT_MAPPING[sportId] || `ספורט ${sportId}`}
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <p style={{ color: '#ff6b6b' }}>⚠️ אין העדפות שמורות - האלגוריתם ישתמש בהעדפות ברירת מחדל</p>
            )}
          </div>
          
          <div className="info-card">
            <h3>🏟️ זמינות מגרשים</h3>
            <p><strong>רבעי שעה:</strong> {timeSlots.length}</p>
            <p><strong>סטטוס:</strong> השרת יבדוק זמינות בזמן אמת</p>
            <div style={{ 
              marginTop: '10px', 
              padding: '10px', 
              background: 'rgba(81, 207, 102, 0.1)',
              borderRadius: '6px',
              fontSize: '0.9rem'
            }}>
              ✅ האלגוריתם ההונגרי רץ בשרת - ביצועים מהירים יותר!
            </div>
          </div>
        </div>

        {error && (
          <div style={{ 
            color: '#ff6b6b', 
            textAlign: 'center', 
            margin: '20px 0',
            padding: '15px',
            background: 'rgba(255, 107, 107, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 107, 107, 0.3)'
          }}>
            ❌ {error}
          </div>
        )}

        <div className="action-buttons">
          <button
            className="generate-button"
            onClick={generateWorkout}
            disabled={isGenerating || !canCreateWorkout()}
            style={{
              background: isGenerating ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: '15px 30px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            {isGenerating ? '🔄 יוצר אימון אופטימלי...' : '🎯 צור תוכנית אימון אופטימלית'}
          </button>
        </div>

        {workoutPlan && (
          <div className="workout-result" style={{ marginTop: '30px' }}>
            <h2>🏆 התוכנית האופטימלית שלך</h2>
            
                         <div className="optimization-info" style={{
               background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
               color: 'white',
               padding: '20px',
               borderRadius: '12px',
               margin: '20px 0',
               textAlign: 'center'
             }}>
              <h3 style={{ margin: '0 0 15px 0' }}>📊 סטטיסטיקות אופטימליות</h3>
              <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{workoutPlan.successfulSlots}/{timeSlots.length}</div>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>רבעי שעה מוצלחים</div>
                </div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{workoutPlan.totalScore}</div>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>ניקוד כולל</div>
                </div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>✅</div>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>אלגוריתם הונגרי</div>
                </div>
              </div>
            </div>

            {workoutPlan.sportsUsage && Object.keys(workoutPlan.sportsUsage).length > 0 && (
                             <div className="sports-summary" style={{
                 background: 'rgba(139, 92, 246, 0.1)',
                 padding: '15px',
                 borderRadius: '8px',
                 border: '1px solid rgba(139, 92, 246, 0.3)',
                 margin: '20px 0'
               }}>
                <h3 style={{ margin: '0 0 15px 0' }}>📈 פילוג ספורטים אופטימלי:</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                  {Object.entries(workoutPlan.sportsUsage).map(([sportId, count]) => (
                                         <div key={sportId} style={{
                       background: 'white',
                       padding: '10px 15px',
                       borderRadius: '20px',
                       border: '1px solid rgba(139, 92, 246, 0.5)',
                       fontSize: '14px'
                     }}>
                      <strong>{SPORT_MAPPING[sportId] || `ספורט ${sportId}`}:</strong> {count} פעמים
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="workout-timeline">
              <h3>⏰ לוח זמנים מפורט:</h3>
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
                           ✅ {slot.field.name}
                         </div>
                         <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                           🏃 ספורט: {slot.sportType} | 
                           🔄 שימוש: {slot.usage}/2 | 
                           {slot.score && (
                             <span> 🎯 ניקוד: {slot.score}</span>
                           )}
                           {slot.isOptimal && <span style={{ color: '#8b5cf6' }}> | ⭐ אופטימלי</span>}
                         </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#ff6b6b' }}>
                          ❌ לא זמין
                        </div>
                        <div style={{ fontSize: '14px', color: '#999', marginTop: '5px' }}>
                          {slot.reason || 'לא נמצא מגרש מתאים'}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {saveSuccess ? (
                               <div style={{ 
                   color: '#8b5cf6', 
                   textAlign: 'center', 
                   margin: '30px 0',
                   padding: '20px',
                   background: 'rgba(139, 92, 246, 0.1)',
                   borderRadius: '12px',
                   border: '2px solid rgba(139, 92, 246, 0.3)'
                 }}>
                <h3>🎉 האימון האופטימלי נשמר בהצלחה!</h3>
                <p>מעביר אותך לתפריט הראשי בעוד רגעים...</p>
              </div>
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
                  {isSaving ? '💾 שומר אימון...' : '✅ אישור ושמירת האימון האופטימלי'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CreateWorkout;