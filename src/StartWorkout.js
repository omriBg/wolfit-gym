import React, { useState, useEffect } from 'react';
import './StartWorkout.css';

function StartWorkout({ onBackClick, user }) {
  const [workouts, setWorkouts] = useState([]);
  const [workoutsByField, setWorkoutsByField] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // מניעת גלילה של הגוף כשהמסך פתוח
    document.body.style.overflow = 'hidden';
    
    // פונקציה לטעינת האימונים העתידיים מהשרת
    const fetchWorkouts = async () => {
      try {
        setLoading(true);
        setError('');
        
        if (!user || !user.id) {
          setError('משתמש לא מחובר');
          setLoading(false);
          return;
        }
        
        console.log('טוען אימונים עבור משתמש:', user.id);
        
        const response = await fetch(`https://wolfit-gym-backend-ijvq.onrender.com/api/future-workouts/${user.id}`);
        const data = await response.json();
        
        if (data.success) {
          console.log('נמצאו אימונים:', data.workouts);
          console.log('פירוט האימונים:', data.workouts.map(w => ({
            date: w.date,
            startTime: w.startTime,
            endTime: w.endTime,
            fieldName: w.fieldName
          })));
          setWorkouts(data.workouts);
          
          // מיון האימונים לפי תאריך ושעה
          const sortedWorkouts = data.workouts.sort((a, b) => {
            const dateA = new Date(a.date + ' ' + a.startTime);
            const dateB = new Date(b.date + ' ' + b.startTime);
            return dateA - dateB;
          });
          
          // חלוקה לפי תאריך ויצירת אימונים רציפים
          const workoutsByDate = {};
          sortedWorkouts.forEach(workout => {
            const dateKey = workout.date;
            if (!workoutsByDate[dateKey]) {
              workoutsByDate[dateKey] = [];
            }
            
            // בדיקה אם זה המשך של אימון קיים או אימון חדש
            const lastWorkoutGroup = workoutsByDate[dateKey][workoutsByDate[dateKey].length - 1];
            if (lastWorkoutGroup && lastWorkoutGroup.length > 0) {
              const lastSlot = lastWorkoutGroup[lastWorkoutGroup.length - 1];
              const lastStartTime = new Date(dateKey + ' ' + lastSlot.startTime);
              const currentStartTime = new Date(dateKey + ' ' + workout.startTime);
              const timeDiff = (currentStartTime - lastStartTime) / (1000 * 60); // הפרש בדקות
              
              console.log(`בדיקת רציפות: ${lastSlot.startTime} -> ${workout.startTime}, הפרש: ${timeDiff} דקות`);
              
              // אם ההפרש הוא 15 דקות (רבע שעה), זה אותו אימון
              if (timeDiff === 15) {
                // המשך של האימון הקיים - רציף
                console.log(`ממשיך אימון קיים (רציף - 15 דקות)`);
                lastWorkoutGroup.push(workout);
              } else {
                // אימון חדש - יש פער אחר
                console.log(`יוצר אימון חדש (הפרש ${timeDiff} דקות)`);
                workoutsByDate[dateKey].push([workout]);
              }
            } else {
              // אימון ראשון ביום
              console.log(`יוצר אימון ראשון ביום`);
              workoutsByDate[dateKey].push([workout]);
            }
          });
          
          setWorkoutsByField(workoutsByDate);
        } else {
          console.log('לא נמצאו אימונים או שגיאה:', data.message);
          setError(data.message);
          setWorkouts([]);
          setWorkoutsByField({});
        }
        
      } catch (error) {
        console.error('שגיאה בטעינת האימונים:', error);
        setError('שגיאה בחיבור לשרת. נסה שוב.');
        setWorkouts([]);
        setWorkoutsByField({});
      } finally {
        setLoading(false);
      }
    };

    fetchWorkouts();

    // החזרת הגלילה כשיוצאים מהמסך
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [user?.id]);

  // עדכון הספירה אחורה כל דקה
  useEffect(() => {
    const interval = setInterval(() => {
      // עדכון כפוי של הקומפוננטה כדי לעדכן את הספירה אחורה
      setWorkouts(prevWorkouts => [...prevWorkouts]);
    }, 60000); // כל דקה

    return () => clearInterval(interval);
  }, []);

  // פונקציה לעיצוב התאריך
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        // אם התאריך לא תקין, ננסה פורמט אחר
        const [year, month, day] = dateString.split('-');
        const newDate = new Date(year, month - 1, day);
        if (isNaN(newDate.getTime())) {
          return dateString; // נחזיר את המחרוזת המקורית אם לא הצלחנו
        }
        return newDate.toLocaleDateString('he-IL', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      return date.toLocaleDateString('he-IL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('שגיאה בעיצוב התאריך:', error);
      return dateString;
    }
  };

  // פונקציה לעיצוב השעה
  const formatTime = (timeString) => {
    return timeString.substring(0, 5); // HH:MM
  };

  // פונקציה לחישוב זמן עד האימון
  const getTimeUntilWorkout = (dateKey) => {
    const today = new Date();
    const workoutDate = new Date(dateKey);
    
    // איפוס השעות כדי להשוות רק תאריכים
    today.setHours(0, 0, 0, 0);
    workoutDate.setHours(0, 0, 0, 0);
    
    const diffTime = workoutDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'היום';
    } else if (diffDays === 1) {
      return 'מחר';
    } else if (diffDays === 2) {
      return 'בעוד יומיים';
    } else {
      return `בעוד ${diffDays} ימים`;
    }
  };

  // פונקציה לספירה אחורה אם זה היום
  const getCountdownText = (dateKey, workouts) => {
    const today = new Date();
    const workoutDate = new Date(dateKey);
    
    // איפוס השעות כדי להשוות רק תאריכים
    today.setHours(0, 0, 0, 0);
    workoutDate.setHours(0, 0, 0, 0);
    
    if (today.getTime() === workoutDate.getTime()) {
      // זה היום - נחשב ספירה אחורה
      const firstWorkout = workouts[0];
      const workoutTime = new Date(dateKey + ' ' + firstWorkout.startTime);
      const now = new Date();
      const diffMs = workoutTime.getTime() - now.getTime();
      
      if (diffMs <= 0) {
        return 'האימון התחיל!';
      }
      
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (diffHours > 0) {
        return `האימון מתחיל בעוד ${diffHours} שעות ו-${diffMinutes} דקות`;
      } else {
        return `האימון מתחיל בעוד ${diffMinutes} דקות`;
      }
    } else {
      // לא היום - נחזיר כמה ימים נשארו
      return getTimeUntilWorkout(dateKey);
    }
  };

  const handleStartWorkout = (workoutId) => {
    console.log('מתחיל אימון:', workoutId);
    // כאן תוסיף את הלוגיקה להתחלת אימון
  };

  const handleBookNewWorkout = () => {
    console.log('מעבר להזמנת אימון חדש');
    // כאן תוסיף את הלוגיקה למעבר למסך הזמנת אימון
    if (onBackClick) {
      // חזרה למסך הראשי ומשם יוכלו ללחוץ על הזמנת אימון
      onBackClick();
    }
  };

  return (
    <div className="start-workout-container">
      <button className="back-button" onClick={onBackClick}>
        חזרה
      </button>
      
      <div className="start-workout-content">
        <h1>האימונים העתידיים שלך</h1>
        
        {loading ? (
          <div className="loading">
            <p>טוען את האימונים שלך מהמערכת...</p>
          </div>
        ) : error ? (
          <div className="no-workouts">
            <p>שגיאה: {error}</p>
            <button className="no-workouts-button" onClick={() => window.location.reload()}>
              נסה שוב
            </button>
          </div>
        ) : workouts.length === 0 ? (
          <div className="no-workouts">
            <p>אין לך אימונים עתידיים מתוכננים</p>
            <button className="no-workouts-button" onClick={handleBookNewWorkout}>
              הזמן אימון חדש
            </button>
          </div>
        ) : (
          <div className="workouts-list">
            {Object.entries(workoutsByField).map(([dateKey, workoutGroups]) => (
              <div key={dateKey} className="date-section">
                <h2 className="date-title">תאריך: {formatDate(dateKey)}</h2>
                
                {workoutGroups.map((workoutGroup, groupIndex) => {
                  const firstWorkout = workoutGroup[0];
                  const lastWorkout = workoutGroup[workoutGroup.length - 1];
                  const totalDuration = workoutGroup.length * 15; // כל שיבוץ הוא 15 דקות
                  
                  return (
                    <div key={groupIndex} className="workout-session">
                      <div className="workout-session-header">
                        <h3 className="workout-title">אימון #{groupIndex + 1}</h3>
                        <div className="workout-time-range">
                          {formatTime(firstWorkout.startTime)} - {formatTime(lastWorkout.endTime)} ({totalDuration} דקות)
                        </div>
                        <div className="workout-slots-count">
                          {workoutGroup.length} שיבוצים
                        </div>
                      </div>
                      
                      <div className="workout-schedule">
                        <h4>לוח זמנים:</h4>
                        <div className="time-slots">
                          {workoutGroup.map((slot, index) => {
                            const startTime = slot.startTime;
                            const endTime = slot.endTime;
                            const isValidTime = startTime && endTime && startTime !== endTime;
                            
                            return (
                              <div key={index} className="time-slot">
                                <span className="time">
                                  {isValidTime ? `${formatTime(startTime)} - ${formatTime(endTime)}` : `${formatTime(startTime)} (15 דקות)`}
                                </span>
                                <span className="field">{slot.fieldName}</span>
                                <span className="sport">{slot.sportType}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      <button 
                        className={`start-workout-btn ${getCountdownText(dateKey, workoutGroup).includes('דקות') ? 'countdown' : ''}`}
                        onClick={() => handleStartWorkout(`${dateKey}_${groupIndex}`)}
                      >
                        {getCountdownText(dateKey, workoutGroup)}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
            
            <div className="workouts-summary" style={{
              marginTop: '40px',
              padding: '20px',
              background: 'rgba(179, 142, 216, 0.1)',
              borderRadius: '12px',
              border: '1px solid rgba(179, 142, 216, 0.3)',
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, fontSize: '1.1rem' }}>
                סה"כ יש לך <strong>{workouts.length} אימונים</strong> מתוכננים
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StartWorkout;