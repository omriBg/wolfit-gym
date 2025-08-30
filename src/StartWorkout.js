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
          
          // חלוקה לפי תאריך - כל הזמנה היא שיבוץ נפרד
          const workoutsByDate = {};
          sortedWorkouts.forEach(workout => {
            const dateKey = workout.date;
            if (!workoutsByDate[dateKey]) {
              workoutsByDate[dateKey] = [];
            }
            
            // כל הזמנה היא שיבוץ נפרד
            workoutsByDate[dateKey].push(workout);
          });
          
          // מיון השיבוצים בכל תאריך לפי שעה
          Object.keys(workoutsByDate).forEach(dateKey => {
            workoutsByDate[dateKey].sort((a, b) => {
              return a.startTime.localeCompare(b.startTime);
            });
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
            {Object.entries(workoutsByField).map(([dateKey, dateWorkouts]) => (
              <div key={dateKey} className="workout-session">
                <div className="workout-session-header">
                  <h2 className="workout-date-title">
                    שיבוץ מגרשים בתאריך {formatDate(dateKey)}
                  </h2>
                  <div className="workout-time-range">
                    {dateWorkouts.length} שיבוצים
                  </div>
                  <div className="workout-date-debug" style={{fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginTop: '5px'}}>
                    תאריך מקורי: {dateKey}
                  </div>
                </div>
                
                <div className="workout-schedule">
                  <h3>רשימת השיבוצים:</h3>
                  <div className="time-slots">
                    {dateWorkouts.map((slot, index) => {
                      // בדיקה שהשעות הגיוניות
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
                  className="start-workout-btn"
                  onClick={() => handleStartWorkout(dateKey)}
                >
                  התחל אימון בתאריך זה
                </button>
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