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
          setWorkouts(data.workouts);
          setWorkoutsByField(data.workoutsByField);
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
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
            {Object.entries(workoutsByField).map(([fieldName, fieldWorkouts]) => (
              <div key={fieldName} className="court-section">
                <h2 className="court-title">{fieldName}</h2>
                <div className="workouts-grid">
                  {fieldWorkouts.map(workout => (
                    <div key={workout.id} className="workout-card">
                      <div className="workout-header">
                        <h3>{workout.sportType}</h3>
                        <span className="workout-duration">{workout.duration} דקות</span>
                      </div>
                      <div className="workout-details">
                        <p className="workout-date">{formatDate(workout.date)}</p>
                        <p className="workout-time">
                          {formatTime(workout.startTime)} - {formatTime(workout.endTime)}
                        </p>
                        <p className="workout-field">מגרש: {workout.fieldName}</p>
                      </div>
                      <button 
                        className="start-workout-btn"
                        onClick={() => handleStartWorkout(workout.id)}
                      >
                        התחל אימון
                      </button>
                    </div>
                  ))}
                </div>
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